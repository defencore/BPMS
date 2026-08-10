import {
    DEVICE_BODY_POSITIONS,
    COMMANDS,
    HEADER_SERIAL
} from '../../core/constants.js';
import { appendCRC, hasValidCRC, packetsEqual } from '../../core/protocol.js';

export const HANDSHAKE_REQUEST = hex('5A 0F 52 52 00 69 00 58 00 6F 00 6E 00 B9 9D');
export const HANDSHAKE_RESPONSE = hex('5A 0F 52 52 00 69 00 58 00 6F 00 6E 00 9D B9');

const RECORD_LENGTH = 18;
const COUNT_LENGTH = 7;
const SESSION_ID_LENGTH = 9;
const MAX_SESSION_ID = 0x7FFFFFFF;
const EVENT_CODES = Object.freeze({ automatic: 0, manual: 1, retest: 2 });
const EVENTS = Object.freeze({ 0: 'automatic', 1: 'manual', 2: 'retest' });

export function isHandshakeResponse(packet) {
    return packetsEqual(packet, HANDSHAKE_RESPONSE);
}

export function isValidSerialFrame(packet) {
    const bytes = toBytes(packet);
    return bytes.length >= 5
        && bytes[0] === HEADER_SERIAL
        && bytes[1] === bytes.length
        && (hasValidCRC(bytes) || isHandshakeResponse(bytes));
}

export function decodeRecordCount(packet) {
    const bytes = assertFrame(packet, COMMANDS.GET_STATUS, COUNT_LENGTH);
    return readUint16BE(bytes, 3);
}

export function decodeSessionId(packet) {
    const bytes = assertFrame(packet, COMMANDS.GET_USER_ID, SESSION_ID_LENGTH);
    const view = new DataView(bytes.buffer, bytes.byteOffset + 3, 4);
    return view.getInt32(0, true);
}

export function encodeSessionId(value) {
    const sessionId = Number(value);
    if (!Number.isInteger(sessionId) || sessionId < 0 || sessionId > MAX_SESSION_ID) {
        throw new RangeError(`Session ID must be between 0 and ${MAX_SESSION_ID}`);
    }
    const payload = new Uint8Array(4);
    new DataView(payload.buffer).setInt32(0, sessionId, true);
    return payload;
}

export function decodeMeasurementPacket(packet, index = 0) {
    const bytes = assertFrame(packet, COMMANDS.GET_RECORD, RECORD_LENGTH);
    let systolic = readUint16BE(bytes, 3);
    let diastolic = readUint16BE(bytes, 5);
    let pulse = readUint16BE(bytes, 7);
    const year = 2000 + bytes[9];
    const month = bytes[10];
    const day = bytes[11];
    const hour = bytes[12];
    const minute = bytes[13];
    if (!isValidDate(year, month, day, hour, minute)) {
        throw new TypeError('Measurement contains an invalid timestamp');
    }

    if (systolic > 260) systolic = 0;
    if (diastolic > 260) diastolic = 0;
    if (pulse > 300) pulse = 0;
    if (diastolic >= systolic) systolic = diastolic = pulse = 0;
    if (!systolic || !diastolic || !pulse) return null;

    const errorCode = bytes[14];
    const status = decodeMeasurementStatus(bytes[15]);
    return {
        index,
        systolic,
        diastolic,
        pulse,
        datetime: `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`,
        errorCode,
        error: errorCode === 0 ? 'none' : 'unknown',
        bodyPosition: status.bodyPosition,
        measurementMethod: status.event === 'manual' ? 'manual' : 'automatic',
        measurementEvent: status.event,
        hasMovement: status.positionCode === 2 || status.positionCode === 3
    };
}

export function decodeMeasurementStatus(value) {
    const status = integerInRange(value, 0, 0xFF, 'Measurement status');
    const positionCode = status >> 4;
    const eventCode = status & 0x0F;
    return Object.freeze({
        raw: status,
        positionCode,
        bodyPosition: DEVICE_BODY_POSITIONS[positionCode] ?? 'unknown',
        eventCode,
        event: EVENTS[eventCode] ?? 'unknown'
    });
}

export function encodeMeasurementPacket(measurement) {
    const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(measurement.datetime);
    if (!match) throw new TypeError('Measurement datetime must use YYYY-MM-DD HH:mm');
    const [, year, month, day, hour, minute] = match.map(Number);
    const devicePosition = measurement.bodyPosition === 'sitting' || measurement.bodyPosition === 'standing'
        ? 'sitting-standing'
        : measurement.bodyPosition;
    const positionCode = encodePositionCode(devicePosition, measurement.hasMovement);
    const event = measurement.measurementEvent
        ?? (measurement.measurementMethod === 'manual' ? 'manual' : 'automatic');
    const eventCode = EVENT_CODES[event] ?? 0;
    const status = (positionCode << 4) | eventCode;
    return appendCRC(new Uint8Array([
        HEADER_SERIAL, RECORD_LENGTH, COMMANDS.GET_RECORD,
        measurement.systolic >> 8, measurement.systolic & 0xFF,
        measurement.diastolic >> 8, measurement.diastolic & 0xFF,
        measurement.pulse >> 8, measurement.pulse & 0xFF,
        year - 2000, month, day, hour, minute, measurement.errorCode ?? 0, status
    ]));
}

function assertFrame(packet, expectedCommand, expectedLength) {
    const bytes = toBytes(packet);
    if (!isValidSerialFrame(bytes)) throw new TypeError('Invalid serial frame');
    if (bytes[2] !== expectedCommand) throw new TypeError(`Unexpected serial command 0x${bytes[2].toString(16).toUpperCase()}`);
    if (bytes.length !== expectedLength) throw new TypeError(`Serial response must contain exactly ${expectedLength} bytes`);
    return bytes;
}

function encodePositionCode(bodyPosition, hasMovement) {
    if (bodyPosition === 'lying') return hasMovement ? 2 : 0;
    if (bodyPosition === 'sitting-standing') return 1;
    if (bodyPosition === 'physical-activity') return 3;
    return 0;
}

function readUint16BE(bytes, offset) {
    return (bytes[offset] << 8) | bytes[offset + 1];
}

function toBytes(value) {
    return value instanceof Uint8Array ? value : new Uint8Array(value);
}

function hex(value) {
    return new Uint8Array(value.split(/\s+/u).map(byte => Number.parseInt(byte, 16)));
}

function integerInRange(value, min, max, field) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) {
        throw new RangeError(`${field} must be between ${min} and ${max}`);
    }
    return number;
}

function isValidDate(year, month, day, hour, minute) {
    const date = new Date(year, month - 1, day, hour, minute);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
        && date.getHours() === hour && date.getMinutes() === minute;
}

function pad(value) {
    return String(value).padStart(2, '0');
}
