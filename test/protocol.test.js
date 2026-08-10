import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCRC16, decodeMeasurementPacket, encodeMeasurementPacket, formatHex, parseHexString } from '../src/core/protocol.js';

const measurement = {
    systolic: 123,
    diastolic: 78,
    pulse: 64,
    datetime: '2026-08-10 09:35',
    errorCode: 0,
    bodyPosition: 'lying',
    measurementMethod: 'manual',
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
