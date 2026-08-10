import { COMMANDS } from '../../core/constants.js';
import {
    appendCRC,
    buildCommandPacket,
    packetsEqual,
    parseHexString
} from '../../core/protocol.js';
import { SerialSession } from './serial-session.js';
import {
    decodeMeasurementPacket,
    decodeRecordCount,
    decodeDeviceText,
    decodeSessionId,
    encodeDeviceText,
    encodeSessionId,
    HANDSHAKE_REQUEST,
    isHandshakeResponse
} from './serial-codec.js';
import { assertCompleteUsbProfile } from './usb-profile.js';
const ERROR_RESPONSE = 0xD3;
const DEFAULT_ATTEMPTS = 3;
export class HingmedClient {
    #session;

    constructor(session) {
        this.#session = session;
    }

    isSupported() {
        return this.#session.isSupported();
    }

    isConnected() {
        return this.#session.isOpen();
    }

    connect() {
        return this.#session.open();
    }

    disconnect() {
        return this.#session.close();
    }

    async handshake() {
        let lastError;
        for (let attempt = 1; attempt <= DEFAULT_ATTEMPTS; attempt += 1) {
            try {
                await this.#session.write(HANDSHAKE_REQUEST);
                await delay(100);
                this.#session.discardBufferedPackets?.();
                const response = await this.#session.exchange(HANDSHAKE_REQUEST, {
                    expectedCommand: null,
                    predicate: isHandshakeResponse,
                    timeout: 1100
                });
                if (!isHandshakeResponse(response)) throw new Error('Invalid WBP-02A handshake response');
                return 'WBP-02A';
            } catch (error) {
                lastError = error;
            }
        }
        throw new Error(`WBP-02A handshake failed after ${DEFAULT_ATTEMPTS} attempts: ${lastError?.message ?? 'no response'}`);
    }

    async getUserName({ timeout = 1800, attempts = 2 } = {}) {
        return this.#readText(COMMANDS.GET_USER_NAME, { timeout, attempts, maximumBytes: 32 });
    }

    async setUserName(value) {
        const { text, bytes } = encodeDeviceText(value, 32, 'Patient name');
        await this.command(COMMANDS.SET_USER_NAME, bytes, { timeout: 2200, attempts: 2 });
        return text;
    }

    async getUserId({ timeout = 2000, attempts = DEFAULT_ATTEMPTS } = {}) {
        const response = await this.command(COMMANDS.GET_SESSION_ID, [], { timeout, attempts, expectedLength: 9 });
        return String(decodeSessionId(response));
    }

    async setUserId(value) {
        const sessionId = String(Number(value));
        await this.writeCommandConfirmed(COMMANDS.SET_SESSION_ID, encodeSessionId(value));
        return sessionId;
    }

    async getRecordCount({ timeout = 2000, attempts = DEFAULT_ATTEMPTS } = {}) {
        const response = await this.command(COMMANDS.GET_STATUS, [], { timeout, attempts, expectedLength: 7 });
        return decodeRecordCount(response);
    }

    async getRecord(index) {
        if (!Number.isInteger(index) || index < 0 || index > 0xFFFF) {
            throw new RangeError('Record index must be between 0 and 65535');
        }
        const response = await this.command(COMMANDS.GET_RECORD, [index >> 8, index & 0xFF], {
            timeout: 2000,
            expectedLength: 18
        });
        return decodeMeasurementPacket(response, index);
    }

    async getDeviceCode({ timeout = 5000, attempts = DEFAULT_ATTEMPTS } = {}) {
        return this.#readText(COMMANDS.GET_DEVICE_CODE, { timeout, attempts, maximumBytes: 128 });
    }

    async getMacAddress({ timeout = 5000, attempts = DEFAULT_ATTEMPTS } = {}) {
        const response = await this.command(COMMANDS.WIFI_GET_MAC, [], { timeout, attempts });
        if (response.length < 11) throw new Error('Invalid MAC-address response');
        return [...response.slice(3, 9)].map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(':');
    }

    async getIpConfiguration() {
        const response = await this.command(COMMANDS.WIFI_GET_IP, [], { timeout: 5000 });
        if (response.length < 20) throw new Error('Invalid IP-configuration response');
        return {
            dhcp: response[3] === 1,
            ip: formatIpv4(response.slice(4, 8)),
            subnet: formatIpv4(response.slice(8, 12)),
            gateway: formatIpv4(response.slice(12, 16)),
            dns: formatIpv4(response.slice(16, 20))
        };
    }

    async configureWifi(settings) {
        const ipPayload = settings.useDhcp
            ? [1, ...parseIpv4('192.168.1.1'), ...parseIpv4('255.255.255.0'), ...parseIpv4('192.168.1.1'), ...parseIpv4('1.1.1.1')]
            : [0, ...parseIpv4(settings.ip), ...parseIpv4(settings.subnet), ...parseIpv4(settings.gateway), ...parseIpv4(settings.dns)];
        const port = integerInRange(settings.serverPort, 1, 65535, 'Server port');
        const sequence = [
            { command: 0x50, payload: [1] },
            { command: COMMANDS.SET_BLIND_MEASURE, payload: [settings.blindMeasure ? 1 : 0] },
            { command: COMMANDS.WIFI_SET_INTERVAL, payload: [integerInRange(settings.connectionInterval, 1, 120, 'Connection interval')] },
            { command: COMMANDS.WIFI_SET_SLEEP, payload: [integerInRange(settings.sleepInterval, 5, 100, 'Sleep interval')] },
            { command: COMMANDS.WIFI_SET_ROUTER, payload: encodeText(`${requiredText(settings.ssid, 'SSID')},${requiredText(settings.password, 'Password')}`) },
            { command: COMMANDS.WIFI_SET_SERVER, payload: [...parseIpv4(settings.serverIp), port >> 8, port & 0xFF] },
            { command: COMMANDS.WIFI_SET_IP, payload: ipPayload }
        ];
        if (settings.apSsid) sequence.push({ command: COMMANDS.WIFI_SET_AP_SSID, payload: encodeFixedAscii(settings.apSsid, 12) });
        sequence.push({ command: COMMANDS.WIFI_SET_STA_MODE, payload: [] });
        await this.writeSequence(sequence, 350);
    }

    async resetWifi() {
        await this.command(COMMANDS.WIFI_RESET, [], { timeout: 5000 });
    }

    async writeSequence(steps, delayMs = 200) {
        // This unconfirmed path is retained only for the separately reverse-engineered
        // Wi-Fi extension. USB programming uses writeConfirmedSequence below.
        for (const step of steps) {
            await this.writeCommand(step.command, step.payload);
            if (delayMs) await delay(delayMs);
        }
    }

    async writeConfirmedSequence(steps, delayMs = 0) {
        for (const step of steps) {
            await this.writeCommandConfirmed(step.command, step.payload);
            if (delayMs) await delay(delayMs);
        }
    }

    async programDevice(steps, {
        now = new Date(),
        delayMs = 0,
        clearSettleMs = 0,
        settleMs = 1000
    } = {}) {
        assertCompleteUsbProfile(steps);
        await this.handshake();
        await this.command(COMMANDS.CLEAR_RECORDS, [], { timeout: 5000 });
        if (clearSettleMs) await delay(clearSettleMs);
        await this.writeConfirmedSequence(steps, delayMs);
        return this.#completeProgramming({ now, delayMs, settleMs });
    }

    async syncClock(now = new Date()) {
        const clockSentAt = new Date(now);
        await this.writeCommandConfirmed(COMMANDS.SET_DEVICE_TIME, encodeDeviceTime(clockSentAt));
        return clockSentAt;
    }

    clearDeviceMemory(steps, options = {}) {
        return this.programDevice(steps, options);
    }

    async command(command, payload = [], options = {}) {
        const packet = buildCommandPacket(command, payload);
        const response = await this.#exchangeWithRetry(packet, {
            predicate: response => isError(response) || (
                response?.[2] === (options.expectedCommand ?? command)
                && (!options.expectedLength || response.length === options.expectedLength)
            ),
            timeout: options.timeout ?? 2000,
            attempts: options.attempts ?? DEFAULT_ATTEMPTS
        });
        if (isError(response)) throw new Error(`Device rejected command 0x${command.toString(16).toUpperCase()}`);
        return response;
    }

    writeCommand(command, payload = []) {
        return this.#session.write(buildCommandPacket(command, payload));
    }

    async writeCommandConfirmed(command, payload = [], { timeout = 2000, attempts = DEFAULT_ATTEMPTS } = {}) {
        const packet = buildCommandPacket(command, payload);
        const response = await this.#exchangeWithRetry(packet, {
            predicate: candidate => isError(candidate) || packetsEqual(candidate, packet),
            timeout,
            attempts
        });
        if (isError(response)) throw new Error(`Device rejected command 0x${command.toString(16).toUpperCase()}`);
        return response;
    }

    async customCommand(hexValue) {
        const command = parseHexString(hexValue);
        const packet = command.length >= 2 ? appendCRC(command) : command;
        return this.#session.exchange(packet, { expectedCommand: packet[2], timeout: 3000 });
    }

    async #readText(command, { timeout, attempts, maximumBytes }) {
        const response = await this.command(command, [], { timeout, attempts });
        return decodeDeviceText(response, command, maximumBytes);
    }

    async #completeProgramming({ now, delayMs, settleMs }) {
        const clockSentAt = await this.syncClock(now);
        if (delayMs) await delay(delayMs);
        await this.writeCommandConfirmed(0x90, [], { timeout: 1600 });
        if (settleMs) await delay(settleMs);
        const recordCount = await this.#verifyRecordCount();
        return Object.freeze({ clockSentAt, recordCount });
    }

    async #verifyRecordCount() {
        try {
            return await this.getRecordCount();
        } catch {
            return null;
        }
    }

    async #exchangeWithRetry(packet, { predicate, timeout, attempts }) {
        let lastError;
        for (let attempt = 1; attempt <= attempts; attempt += 1) {
            try {
                const response = await this.#session.exchange(packet, {
                    expectedCommand: null,
                    predicate,
                    timeout
                });
                if (!predicate(response)) throw new Error('Device returned an unexpected response');
                return response;
            } catch (error) {
                lastError = error;
            }
        }
        throw new Error(`Command 0x${packet[2].toString(16).toUpperCase()} failed after ${attempts} attempts: ${lastError?.message ?? 'no response'}`);
    }
}

export function createHingmedClient({ navigatorRef = globalThis.navigator, logger = () => {} } = {}) {
    return new HingmedClient(new SerialSession({ navigatorRef, logger }));
}

export function parseIpv4(value) {
    const parts = String(value ?? '').trim().split('.');
    if (parts.length !== 4) throw new TypeError(`Invalid IPv4 address: ${value}`);
    return parts.map(part => {
        if (!/^\d{1,3}$/u.test(part)) throw new TypeError(`Invalid IPv4 address: ${value}`);
        return integerInRange(Number(part), 0, 255, 'IPv4 octet');
    });
}

export function encodeDeviceTime(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError('Device time must be a valid date');
    const year = date.getFullYear() - 2000;
    if (year < 0 || year > 0xFF) throw new RangeError('Device year must be between 2000 and 2255');
    return [year, date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()];
}

function formatIpv4(bytes) {
    return [...bytes].join('.');
}

function encodeText(value) {
    return new TextEncoder().encode(value);
}

function encodeFixedAscii(value, length) {
    const text = requiredText(value, 'Value');
    if (!/^[\x20-\x7E]+$/u.test(text)) throw new TypeError('Value must contain ASCII characters only');
    return encodeText(text.slice(0, length).padEnd(length, ' '));
}

function requiredText(value, field) {
    const text = String(value ?? '').trim();
    if (!text) throw new TypeError(`${field} is required`);
    return text;
}

function integerInRange(value, min, max, field) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) {
        throw new RangeError(`${field} must be between ${min} and ${max}`);
    }
    return number;
}

function isError(response) {
    return response?.[2] === ERROR_RESPONSE;
}

function delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}
