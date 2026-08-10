import { HEADER_SERIAL } from './constants.js';

export function calculateCRC16(data) {
    let low = 0xFF;
    let high = 0xFF;
    for (const byte of data) {
        low = (low ^ byte) & 0xFF;
        for (let bit = 0; bit < 8; bit += 1) {
            const previousHigh = high;
            const previousLow = low;
            high = (high >> 1) & 0xFF;
            low = (low >> 1) & 0xFF;
            if (previousHigh & 1) low = (low | 0x80) & 0xFF;
            if (previousLow & 1) {
                high = (high ^ 0xA0) & 0xFF;
                low = (low ^ 0x01) & 0xFF;
            }
        }
    }
    return [low, high];
}

export function appendCRC(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const [low, high] = calculateCRC16(bytes);
    return new Uint8Array([...bytes, high, low]);
}

export function buildCommandPacket(command, payload = []) {
    if (!Number.isInteger(command) || command < 0 || command > 0xFF) {
        throw new TypeError('Command must be a byte');
    }
    const parameters = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
    const length = 3 + parameters.length + 2;
    if (length > 0xFF) throw new RangeError('Command payload is too large');
    return appendCRC(new Uint8Array([HEADER_SERIAL, length, command, ...parameters]));
}

export function hasValidCRC(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (bytes.length < 5) return false;
    const [low, high] = calculateCRC16(bytes.slice(0, -2));
    return bytes.at(-2) === high && bytes.at(-1) === low;
}

export function packetsEqual(left, right) {
    const leftBytes = left instanceof Uint8Array ? left : new Uint8Array(left);
    const rightBytes = right instanceof Uint8Array ? right : new Uint8Array(right);
    return leftBytes.length === rightBytes.length
        && leftBytes.every((value, index) => value === rightBytes[index]);
}

export function parseHexString(value) {
    if (typeof value !== 'string') throw new TypeError('Hex command must be a string');
    const compact = value.replace(/\s+/g, '');
    if (!compact || compact.length % 2 !== 0 || !/^[\da-f]+$/i.test(compact)) {
        throw new TypeError('Invalid hexadecimal data');
    }
    return new Uint8Array(compact.match(/.{2}/g).map(byte => Number.parseInt(byte, 16)));
}

export function formatHex(data) {
    return Array.from(data, byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}
