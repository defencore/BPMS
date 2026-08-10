import { formatHex } from '../../core/protocol.js';
import { PacketBuffer } from './packet-buffer.js';

const SERIAL_OPTIONS = Object.freeze({ baudRate: 19200, dataBits: 8, stopBits: 1, parity: 'none' });
const QUEUE_LIMIT = 32;

export class SerialSession {
    #navigator;
    #logger;
    #port = null;
    #reader = null;
    #writer = null;
    #readTask = null;
    #packets = [];
    #waiters = new Set();
    #buffer = new PacketBuffer();

    constructor({ navigatorRef = globalThis.navigator, logger = () => {} } = {}) {
        this.#navigator = navigatorRef;
        this.#logger = logger;
    }

    isSupported() {
        return Boolean(this.#navigator?.serial);
    }

    isOpen() {
        return Boolean(this.#port && this.#reader && this.#writer);
    }

    async open() {
        if (this.isOpen()) return;
        if (!this.isSupported()) throw new Error('Web Serial API is unavailable');
        const permittedPorts = await this.#navigator.serial.getPorts?.() ?? [];
        this.#port = permittedPorts.length === 1
            ? permittedPorts[0]
            : await this.#navigator.serial.requestPort();
        await this.#port.open(SERIAL_OPTIONS);
        await this.#port.setSignals?.({ dataTerminalReady: true, requestToSend: true });
        this.#writer = this.#port.writable.getWriter();
        this.#reader = this.#port.readable.getReader();
        this.#readTask = this.#readLoop();
    }

    async close() {
        const reader = this.#reader;
        const writer = this.#writer;
        const port = this.#port;
        this.#reader = null;
        this.#writer = null;
        this.#port = null;
        this.#rejectWaiters(new Error('Serial session closed'));
        this.#packets = [];
        this.#buffer.clear();

        if (reader) {
            await reader.cancel().catch(() => {});
            await this.#readTask?.catch(() => {});
            reader.releaseLock();
        }
        if (writer) writer.releaseLock();
        if (port) {
            await port.setSignals?.({ dataTerminalReady: false, requestToSend: false }).catch(() => {});
            await port.close();
        }
        this.#readTask = null;
    }

    async write(data) {
        if (!this.#writer) throw new Error('Serial device is not connected');
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        this.#logger(formatHex(bytes), 'sent');
        await this.#writer.write(bytes);
    }

    async exchange(data, { expectedCommand = data?.[2], predicate = null, timeout = 2000 } = {}) {
        await this.write(data);
        return this.waitForPacket({ expectedCommand, predicate, timeout });
    }

    waitForPacket({ expectedCommand = null, predicate = null, timeout = 2000 } = {}) {
        const queuedIndex = this.#packets.findIndex(packet => matches(packet, expectedCommand, predicate));
        if (queuedIndex >= 0) return Promise.resolve(this.#packets.splice(queuedIndex, 1)[0]);

        return new Promise((resolve, reject) => {
            const waiter = { expectedCommand, predicate, resolve, reject, timer: null };
            waiter.timer = setTimeout(() => {
                this.#waiters.delete(waiter);
                reject(new Error(`Serial response timed out after ${timeout} ms`));
            }, timeout);
            this.#waiters.add(waiter);
        });
    }

    discardBufferedPackets() {
        this.#packets = [];
        this.#buffer.clear();
    }

    async #readLoop() {
        try {
            while (this.#reader) {
                const { value, done } = await this.#reader.read();
                if (done) break;
                for (const packet of this.#buffer.push(value ?? [])) this.#dispatch(packet);
            }
        } catch (error) {
            if (this.#reader) this.#rejectWaiters(error);
        }
    }

    #dispatch(packet) {
        this.#logger(formatHex(packet), 'received');
        const waiter = [...this.#waiters].find(candidate => matches(packet, candidate.expectedCommand, candidate.predicate));
        if (waiter) {
            clearTimeout(waiter.timer);
            this.#waiters.delete(waiter);
            waiter.resolve(packet);
            return;
        }
        this.#packets.push(packet);
        if (this.#packets.length > QUEUE_LIMIT) this.#packets.shift();
    }

    #rejectWaiters(error) {
        for (const waiter of this.#waiters) {
            clearTimeout(waiter.timer);
            waiter.reject(error);
        }
        this.#waiters.clear();
    }
}

function matches(packet, expectedCommand, predicate) {
    const commandMatches = expectedCommand === null || expectedCommand === undefined || packet[2] === expectedCommand;
    return commandMatches && (!predicate || predicate(packet));
}
