import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCommandPacket } from '../src/core/protocol.js';
import { buildDeviceConfiguration } from '../src/features/hingmed/device-settings.js';
import { encodeDeviceTime, HingmedClient, parseIpv4 } from '../src/infrastructure/hingmed/client.js';
import { PacketBuffer } from '../src/infrastructure/hingmed/packet-buffer.js';
import {
    decodeRecordCount,
    decodeSessionId,
    HANDSHAKE_RESPONSE
} from '../src/infrastructure/hingmed/serial-codec.js';

test('packet buffer extracts fragmented packets and ignores leading noise', () => {
    const first = buildCommandPacket(0x53);
    const second = buildCommandPacket(0x54, [0, 4]);
    const buffer = new PacketBuffer();

    assert.deepEqual(buffer.push(new Uint8Array([0, 1, ...first.slice(0, 3)])), []);
    const packets = buffer.push(new Uint8Array([...first.slice(3), ...second]));

    assert.deepEqual(packets, [first, second]);
    assert.equal(buffer.pendingByteCount, 0);
});

test('packet buffer rejects bad CRC and resynchronizes at the next valid frame', () => {
    const invalid = buildCommandPacket(0x53);
    invalid[3] ^= 1;
    const valid = buildCommandPacket(0x57);
    const buffer = new PacketBuffer();
    assert.deepEqual(buffer.push(new Uint8Array([...invalid, ...valid])), [valid]);
});

test('IPv4 parser accepts canonical addresses and rejects malformed octets', () => {
    assert.deepEqual(parseIpv4('192.168.1.32'), [192, 168, 1, 32]);
    assert.throws(() => parseIpv4('192.168.1'), /Invalid IPv4/u);
    assert.throws(() => parseIpv4('192.168.1.999'), /between 0 and 255/u);
});

test('device settings create one declarative command sequence', () => {
    const values = new Map([
        ['user-id-input', 0x4567], ['max-cuff-pressure', 280], ['keypad-setting', 1], ['display-setting', 1], ['awake-alarm', 1], ['asleep-alarm', 0],
        ['awake-begin-hour', 6], ['awake-begin-min', 30], ['awake-interval', 30],
        ['awake-end-hour', 22], ['awake-end-min', 0], ['asleep-interval', 60],
        ['highest-sys', 170], ['highest-dia', 120], ['lowest-sys', 90], ['lowest-dia', 60]
    ]);
    const read = {
        checked: id => id === 'special1-enabled' || id === 'start-in-five-minutes',
        integer: id => values.get(id) ?? ({
            'special1-begin-hour': 12, 'special1-begin-min': 0,
            'special1-end-hour': 13, 'special1-end-min': 0,
            'special1-interval': 10
        })[id],
        time: prefix => [
            values.get(`${prefix}-hour`) ?? ({ 'special1-begin': 12, 'special1-end': 13 })[prefix],
            values.get(`${prefix}-min`) ?? 0
        ]
    };

    const configuration = buildDeviceConfiguration(read);
    const commands = configuration.map(step => step.command);
    assert.deepEqual(commands.slice(0, 13), [0x42, 0x43, 0x44, 0x45, 0x46, 0x5B, 0x7A, 0x5C, 0x59, 0x5A, 0x65, 0x66, 0x47]);
    assert.deepEqual([...configuration[0].payload], [0x67, 0x45, 0x00, 0x00]);
    assert.ok(commands.includes(0x48));
    assert.ok(commands.includes(0x4C));
    assert.ok(commands.includes(0x59));
    assert.equal(commands.includes(0x4F), false);
});

test('device settings reject timings outside the verified WBP-02A schedule list', () => {
    const values = new Map([
        ['user-id-input', 1], ['keypad-setting', 1], ['display-setting', 1], ['awake-alarm', 0], ['asleep-alarm', 0],
        ['awake-interval', 25], ['asleep-interval', 60]
    ]);
    const read = {
        checked: () => false,
        integer: id => values.get(id) ?? 0,
        time: () => [7, 0]
    };
    assert.throws(() => buildDeviceConfiguration(read), /awake-interval must be one of/u);
});

test('device programming sends the clock immediately before save and verifies cleared memory', async () => {
    const writes = [];
    const session = echoingSession(writes);
    const client = new HingmedClient(session);
    const now = new Date(2026, 7, 10, 9, 45);
    const profile = verifiedProfileSteps();
    const result = await client.programDevice(
        profile,
        { now, delayMs: 0, clearSettleMs: 0, settleMs: 0 }
    );

    assert.deepEqual(encodeDeviceTime(now), [26, 8, 10, 9, 45]);
    assert.deepEqual(writes.map(packet => packet[2]), [0x52, 0x52, 0x57, ...profile.map(step => step.command), 0x4F, 0x90, 0x53]);
    assert.deepEqual(writes.at(-3).slice(3, 8), [26, 8, 10, 9, 45]);
    assert.equal(result.recordCount, 0);
    assert.equal(result.clockSentAt.getTime(), now.getTime());
});

test('standalone clock synchronization does not save, exit, or clear device memory', async () => {
    const writes = [];
    const session = echoingSession(writes);
    const client = new HingmedClient(session);
    const now = new Date(2026, 7, 10, 10, 5);

    const clockSentAt = await client.syncClock(now);

    assert.deepEqual(writes.map(packet => packet[2]), [0x4F]);
    assert.deepEqual(writes[0].slice(3, 8), [26, 8, 10, 10, 5]);
    assert.equal(clockSentAt.getTime(), now.getTime());
});

test('dedicated memory clearing commits the clear command with a complete device profile', async () => {
    const writes = [];
    const session = echoingSession(writes);
    const client = new HingmedClient(session);
    const profile = verifiedProfileSteps();

    const result = await client.clearDeviceMemory(
        profile,
        { delayMs: 0, clearSettleMs: 0, settleMs: 0 }
    );

    assert.deepEqual(writes.map(packet => packet[2]), [0x52, 0x52, 0x57, ...profile.map(step => step.command), 0x4F, 0x90, 0x53]);
    assert.equal(result.recordCount, 0);
});

test('record count, session ID, and record index use their full verified widths', async () => {
    assert.equal(decodeRecordCount(buildCommandPacket(0x53, [0x01, 0x24])), 292);
    assert.equal(decodeSessionId(buildCommandPacket(0x56, [0x67, 0x45, 0x00, 0x00])), 0x4567);
    const writes = [];
    const record = buildCommandPacket(0x54, [0x00, 0x8D, 0x00, 0x40, 0x00, 0x43, 0x19, 0x05, 0x18, 0x03, 0x38, 0x00, 0x21]);
    const client = new HingmedClient({
        isSupported: () => true,
        isOpen: () => true,
        exchange: async packet => {
            writes.push([...packet]);
            return record;
        }
    });
    const result = await client.getRecord(292);
    assert.deepEqual(writes[0].slice(3, 5), [0x01, 0x24]);
    assert.equal(result.index, 292);
});

test('SET commands require an exact echo and retry three times before failing', async () => {
    let attempts = 0;
    const client = new HingmedClient({
        isSupported: () => true,
        isOpen: () => true,
        exchange: async packet => {
            attempts += 1;
            return buildCommandPacket(packet[2], [0]);
        }
    });
    await assert.rejects(() => client.writeCommandConfirmed(0x45, [1]), /failed after 3 attempts/u);
    assert.equal(attempts, 3);
});

test('device programming rejects incomplete or reordered profiles before clearing memory', async () => {
    const client = new HingmedClient(echoingSession([]));
    await assert.rejects(() => client.programDevice([{ command: 0x45, payload: [1] }]), /complete device profile/u);
    const reordered = verifiedProfileSteps();
    [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
    await assert.rejects(() => client.programDevice(reordered), /verified WBP-02A order/u);
});

function echoingSession(writes) {
    return {
        isSupported: () => true,
        isOpen: () => true,
        discardBufferedPackets: () => {},
        write: async packet => { writes.push([...packet]); },
        exchange: async packet => {
            writes.push([...packet]);
            if (packet[2] === 0x52) return HANDSHAKE_RESPONSE;
            if (packet[2] === 0x53) return buildCommandPacket(0x53, [0, 0]);
            return packet;
        }
    };
}

function verifiedProfileSteps() {
    return [
        { command: 0x42, payload: [1, 0, 0, 0] },
        { command: 0x43, payload: [1, 0x18] },
        { command: 0x44, payload: [0] },
        { command: 0x45, payload: [1] },
        { command: 0x46, payload: [1] },
        { command: 0x5B, payload: [0] },
        { command: 0x7A, payload: [1] },
        { command: 0x5C, payload: [0] },
        { command: 0x47, payload: [0] },
        { command: 0x48, payload: [7, 30] },
        { command: 0x49, payload: [30] },
        { command: 0x4A, payload: [21, 0] },
        { command: 0x4B, payload: [60] },
        { command: 0x58, payload: [0] }
    ];
}
