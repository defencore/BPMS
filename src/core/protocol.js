import { DEVICE_BODY_POSITION_CODES, DEVICE_BODY_POSITIONS, COMMANDS, ERROR_CODES, HEADER_SERIAL } from './constants.js';

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

export function decodeMeasurementPacket(data, index = 0) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (bytes.length < 16 || bytes[0] !== HEADER_SERIAL || bytes[2] !== COMMANDS.GET_RECORD) return null;

    const systolic = bytes[4];
    const diastolic = bytes[6];
    const pulse = bytes[8];
    const year = 2000 + bytes[9];
    const month = bytes[10];
    const day = bytes[11];
    const hour = bytes[12];
    const minute = bytes[13];
    const errorCode = bytes[14];
    const flags = bytes[15];
    if (!systolic && !diastolic && !pulse) return null;
    if (!isValidDate(year, month, day, hour, minute)) return null;

    return {
        index,
        systolic,
        diastolic,
        pulse,
        datetime: `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`,
        errorCode,
        error: ERROR_CODES[errorCode] ?? 'unknown',
        bodyPosition: DEVICE_BODY_POSITIONS[flags & 0x0F] ?? 'unknown',
        measurementMethod: flags & 0x20 ? 'manual' : 'automatic',
        hasMovement: Boolean(flags & 0x10)
    };
}

export function encodeMeasurementPacket(measurement) {
    const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(measurement.datetime);
    if (!match) throw new TypeError('Measurement datetime must use YYYY-MM-DD HH:mm');
    const [, year, month, day, hour, minute] = match.map(Number);
    const devicePosition = measurement.bodyPosition === 'sitting' || measurement.bodyPosition === 'standing'
        ? 'sitting-standing'
        : measurement.bodyPosition;
    let flags = DEVICE_BODY_POSITION_CODES[devicePosition] ?? 0;
    if (measurement.measurementMethod === 'manual') flags |= 0x20;
    if (measurement.hasMovement) flags |= 0x10;
    return appendCRC(new Uint8Array([
        HEADER_SERIAL, 0x12, COMMANDS.GET_RECORD, 0x00,
        measurement.systolic, 0x00, measurement.diastolic, 0x00, measurement.pulse,
        year - 2000, month, day, hour, minute, measurement.errorCode ?? 0, flags
    ]));
}

function isValidDate(year, month, day, hour, minute) {
    const date = new Date(year, month - 1, day, hour, minute);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
        && date.getHours() === hour && date.getMinutes() === minute;
}

function pad(value) {
    return String(value).padStart(2, '0');
}
