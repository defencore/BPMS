import assert from 'node:assert/strict';
import test from 'node:test';

import {
    MANUAL_DEVICE_DEFAULTS,
    manualDeviceDefaultsPatch,
    normalizeManualDeviceInfo
} from '../src/core/manual-device-info.js';

test('manual connector supplies a stable identity only for an empty dataset', () => {
    assert.deepEqual(manualDeviceDefaultsPatch({}), MANUAL_DEVICE_DEFAULTS);
    assert.equal(manualDeviceDefaultsPatch({ serialNumber: 'HINGMED-1' }), null);
    assert.equal(manualDeviceDefaultsPatch({ macAddress: '00:11:22:33:44:55' }), null);
});

test('manual device information is normalized and validates its export identity', () => {
    assert.deepEqual(normalizeManualDeviceInfo({
        id: ' BPMS-MANUAL ',
        serialNumber: ' CUSTOM-1 ',
        macAddress: '02:00:00:00:00:01',
        username: ' Alex ',
        userId: ' A-1 '
    }), {
        id: 'BPMS-MANUAL',
        username: 'Alex',
        usernameSource: 'manual',
        userId: 'A-1',
        serialNumber: 'CUSTOM-1',
        macAddress: '02:00:00:00:00:01'
    });
    assert.throws(() => normalizeManualDeviceInfo({ id: 'x', serialNumber: 'x', macAddress: 'invalid' }), /MAC address/);
});
