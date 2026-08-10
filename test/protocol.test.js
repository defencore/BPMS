import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCRC16, formatHex, parseHexString } from '../src/core/protocol.js';
import {
    decodeMeasurementPacket,
    decodeMeasurementStatus,
    encodeMeasurementPacket
} from '../src/infrastructure/hingmed/serial-codec.js';

const measurement = {
    systolic: 123,
    diastolic: 78,
    pulse: 64,
    datetime: '2026-08-10 09:35',
    errorCode: 0,
    bodyPosition: 'lying',
    measurementMethod: 'manual',
    measurementEvent: 'manual',
    hasMovement: true
};

test('hex parser accepts spaced and compact input and rejects malformed bytes', () => {
    assert.deepEqual([...parseHexString('5A 05 53')], [0x5A, 0x05, 0x53]);
    assert.deepEqual([...parseHexString('5A0553')], [0x5A, 0x05, 0x53]);
    assert.throws(() => parseHexString('5A 0Z'));
});

test('measurement packet encoding and decoding round-trip', () => {
    const packet = encodeMeasurementPacket(measurement);
    const decoded = decodeMeasurementPacket(packet);
    assert.deepEqual(decoded, { index: 0, ...measurement, error: 'none' });
    const [low, high] = calculateCRC16(packet.slice(0, -2));
    assert.equal(packet.at(-2), high);
    assert.equal(packet.at(-1), low);
    assert.equal(packet.length, 0x12);
    assert.equal(packet[1], packet.length);
    assert.match(formatHex(packet), /^5A 12 54/);
});

test('device protocol maps separate manual postures to its combined posture flag', () => {
    const packet = encodeMeasurementPacket({ ...measurement, bodyPosition: 'standing' });
    assert.equal(decodeMeasurementPacket(packet).bodyPosition, 'sitting-standing');
});

test('hardware record vector decodes 16-bit values and separate status nibbles', () => {
    const packet = parseHexString('5A 12 54 00 8D 00 40 00 43 19 05 18 03 38 00 21 A9 83');
    const decoded = decodeMeasurementPacket(packet, 292);
    assert.deepEqual(decoded, {
        index: 292,
        systolic: 141,
        diastolic: 64,
        pulse: 67,
        datetime: '2025-05-24 03:56',
        errorCode: 0,
        error: 'none',
        bodyPosition: 'lying',
        measurementMethod: 'manual',
        measurementEvent: 'manual',
        hasMovement: true
    });
    assert.deepEqual(decodeMeasurementStatus(0x10), {
        raw: 0x10,
        positionCode: 1,
        bodyPosition: 'sitting-standing',
        eventCode: 0,
        event: 'automatic'
    });
});

test('record decoder rejects malformed frames and removes impossible vital values', () => {
    const badCrc = encodeMeasurementPacket(measurement);
    badCrc[4] ^= 1;
    assert.throws(() => decodeMeasurementPacket(badCrc), /Invalid serial frame/u);
    const impossible = encodeMeasurementPacket({ ...measurement, systolic: 70, diastolic: 90 });
    assert.equal(decodeMeasurementPacket(impossible), null);
});
