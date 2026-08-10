import { COMMANDS } from '../../core/constants.js';
import {
    appendCRC,
    buildCommandPacket,
    decodeMeasurementPacket,
    parseHexString
} from '../../core/protocol.js';
import { SerialSession } from './serial-session.js';

const HANDSHAKE = parseHexString('5A 0F 52 52 00 69 00 58 00 6F 00 6E 00 B9 9D');
const SAVE_AND_EXIT = parseHexString('5A 05 90 EF 52');
const ERROR_RESPONSE = 0xD3;

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
        const response = await this.#session.exchange(HANDSHAKE, {
            expectedCommand: COMMANDS.HANDSHAKE,
            timeout: 3000
        });
        if (isError(response)) throw new Error('Device rejected the handshake');
        const echo = response.length === HANDSHAKE.length
            && response.every((value, index) => value === HANDSHAKE[index]);
        return echo ? 'WBP-02A' : decodeDeviceIdentifier(response) || 'WBP-02A';
    }

    async getUserName() {
        return this.#readText(COMMANDS.GET_USERNAME, 3000);
    }

    async getUserId() {
        return this.#readText(COMMANDS.GET_USER_ID, 3000);
    }

    async setUserName(value) {
        return this.#writeText(COMMANDS.SET_USERNAME, value, 32);
    }

    async setUserId(value) {
        return this.#writeText(COMMANDS.SET_USER_ID, value, 16);
    }

    async getRecordCount() {
        const response = await this.command(COMMANDS.GET_STATUS);
        return response.length >= 6 ? response[4] : 0;
    }

    async getRecord(index) {
        if (!Number.isInteger(index) || index < 0 || index > 0xFF) throw new RangeError('Record index must be a byte');
        const response = await this.command(COMMANDS.GET_RECORD, [0, index], { timeout: 3000 });
        return decodeMeasurementPacket(response, index);
    }

    async getDeviceCode() {
        return this.#readText(COMMANDS.GET_DEVICE_CODE, 5000);
    }

    async getMacAddress() {
        const response = await this.command(COMMANDS.WIFI_GET_MAC, [], { timeout: 5000 });
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
        for (const step of steps) {
            await this.writeCommand(step.command, step.payload);
            if (delayMs) await delay(delayMs);
        }
    }

    async programDevice(steps, {
        now = new Date(),
        delayMs = 200,
        clearSettleMs = 300,
        settleMs = 1000
    } = {}) {
        if (!Array.isArray(steps) || steps.length === 0) {
            throw new TypeError('A complete device profile is required for programming');
        }
        await this.handshake();
        await this.command(COMMANDS.CLEAR_RECORDS, [], { timeout: 5000 });
        if (clearSettleMs) await delay(clearSettleMs);
        await this.writeSequence(steps, delayMs);
        return this.#completeProgramming({ now, delayMs, settleMs });
    }

    async syncClock(now = new Date()) {
        const clockSentAt = new Date(now);
        await this.writeCommand(COMMANDS.SET_DEVICE_TIME, encodeDeviceTime(clockSentAt));
        return clockSentAt;
    }

    clearDeviceMemory(steps, options = {}) {
        return this.programDevice(steps, options);
    }

    async command(command, payload = [], options = {}) {
        const response = await this.#session.exchange(buildCommandPacket(command, payload), {
            expectedCommand: options.expectedCommand ?? command,
            timeout: options.timeout ?? 2000
        });
        if (isError(response)) throw new Error(`Device rejected command 0x${command.toString(16).toUpperCase()}`);
        return response;
    }

    writeCommand(command, payload = []) {
        return this.#session.write(buildCommandPacket(command, payload));
    }

    async customCommand(hexValue) {
        const command = parseHexString(hexValue);
        const packet = command.length >= 2 ? appendCRC(command) : command;
        return this.#session.exchange(packet, { expectedCommand: packet[2], timeout: 3000 });
    }

    async #readText(command, timeout) {
        const response = await this.command(command, [], { timeout });
        return new TextDecoder().decode(response.slice(3, response[1] - 2)).replaceAll('\0', '').trim() || null;
    }

    async #writeText(command, value, maxLength) {
        const text = requiredText(value, 'Value');
        if (text.length > maxLength) throw new RangeError(`Value must not exceed ${maxLength} characters`);
        await this.command(command, encodeText(text), { timeout: 3000 });
        return text;
    }

    async #completeProgramming({ now, delayMs, settleMs }) {
        const clockSentAt = await this.syncClock(now);
        if (delayMs) await delay(delayMs);
        await this.#session.write(SAVE_AND_EXIT);
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

function decodeDeviceIdentifier(response) {
    const payload = response.slice(3, response[1] - 2);
    const utf16 = [];
    for (let index = 0; index + 1 < payload.length; index += 2) {
        if (payload[index] === 0 && payload[index + 1] !== 0) utf16.push(payload[index + 1]);
    }
    return new TextDecoder().decode(new Uint8Array(utf16)).trim();
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
