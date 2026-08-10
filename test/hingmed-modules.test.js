import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCommandPacket } from '../src/core/protocol.js';
import { buildDeviceConfiguration } from '../src/features/hingmed/device-settings.js';
import { encodeDeviceTime, HingmedClient, parseIpv4 } from '../src/infrastructure/hingmed/client.js';
import { PacketBuffer } from '../src/infrastructure/hingmed/packet-buffer.js';

test('packet buffer extracts fragmented packets and ignores leading noise', () => {
    const first = buildCommandPacket(0x53);
    const second = buildCommandPacket(0x54, [0, 4]);
    const buffer = new PacketBuffer();

    assert.deepEqual(buffer.push(new Uint8Array([0, 1, ...first.slice(0, 3)])), []);
    const packets = buffer.push(new Uint8Array([...first.slice(3), ...second]));

    assert.deepEqual(packets, [first, second]);
    assert.equal(buffer.pendingByteCount, 0);
});

test('IPv4 parser accepts canonical addresses and rejects malformed octets', () => {
    assert.deepEqual(parseIpv4('192.168.1.32'), [192, 168, 1, 32]);
    assert.throws(() => parseIpv4('192.168.1'), /Invalid IPv4/u);
    assert.throws(() => parseIpv4('192.168.1.999'), /between 0 and 255/u);
});

test('device settings create one declarative command sequence', () => {
    const values = new Map([
        ['max-cuff-pressure', 280], ['keypad-setting', 1], ['display-setting', 1], ['awake-alarm', 1], ['asleep-alarm', 0],
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

    const commands = buildDeviceConfiguration(read).map(step => step.command);
    assert.deepEqual(commands.slice(0, 12), [0x43, 0x44, 0x45, 0x46, 0x5B, 0x5C, 0x7A, 0x59, 0x5A, 0x65, 0x66, 0x47]);
    assert.ok(commands.includes(0x48));
    assert.ok(commands.includes(0x4C));
    assert.ok(commands.includes(0x59));
    assert.equal(commands.includes(0x4F), false);
});

test('device programming sends the clock immediately before save and verifies cleared memory', async () => {
    const writes = [];
    const session = {
        isSupported: () => true,
        isOpen: () => true,
        write: async packet => { writes.push([...packet]); },
        exchange: async (packet, { expectedCommand }) => {
            writes.push([...packet]);
            if (expectedCommand === 0x52 || expectedCommand === 0x57) return packet;
            if (expectedCommand === 0x53) return new Uint8Array([0x5A, 0x07, 0x53, 0, 0, 0, 0]);
            throw new Error(`Unexpected command ${expectedCommand}`);
        }
    };
    const client = new HingmedClient(session);
    const now = new Date(2026, 7, 10, 9, 45);
    const result = await client.programDevice(
        [{ command: 0x45, payload: [1] }],
        { now, delayMs: 0, clearSettleMs: 0, settleMs: 0 }
    );

    assert.deepEqual(encodeDeviceTime(now), [26, 8, 10, 9, 45]);
    assert.deepEqual(writes.map(packet => packet[2]), [0x52, 0x57, 0x45, 0x4F, 0x90, 0x53]);
    assert.deepEqual(writes[3].slice(3, 8), [26, 8, 10, 9, 45]);
    assert.equal(result.recordCount, 0);
    assert.equal(result.clockSentAt.getTime(), now.getTime());
});

test('standalone clock synchronization does not save, exit, or clear device memory', async () => {
    const writes = [];
    const session = {
        isSupported: () => true,
        isOpen: () => true,
        write: async packet => { writes.push([...packet]); },
        exchange: async () => { throw new Error('Clock synchronization must not request a response'); }
    };
    const client = new HingmedClient(session);
    const now = new Date(2026, 7, 10, 10, 5);

    const clockSentAt = await client.syncClock(now);

    assert.deepEqual(writes.map(packet => packet[2]), [0x4F]);
    assert.deepEqual(writes[0].slice(3, 8), [26, 8, 10, 10, 5]);
    assert.equal(clockSentAt.getTime(), now.getTime());
});

test('dedicated memory clearing commits the clear command with a complete device profile', async () => {
    const writes = [];
    const session = {
        isSupported: () => true,
        isOpen: () => true,
        write: async packet => { writes.push([...packet]); },
        exchange: async (packet, { expectedCommand }) => {
            writes.push([...packet]);
            if (expectedCommand === 0x52 || expectedCommand === 0x57) return packet;
            if (expectedCommand === 0x53) return new Uint8Array([0x5A, 0x07, 0x53, 0, 0, 0, 0]);
            throw new Error(`Unexpected command ${expectedCommand}`);
        }
    };
    const client = new HingmedClient(session);

    const result = await client.clearDeviceMemory(
        [{ command: 0x45, payload: [1] }],
        { delayMs: 0, clearSettleMs: 0, settleMs: 0 }
    );

    assert.deepEqual(writes.map(packet => packet[2]), [0x52, 0x57, 0x45, 0x4F, 0x90, 0x53]);
    assert.equal(result.recordCount, 0);
});
