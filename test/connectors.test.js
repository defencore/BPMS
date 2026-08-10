import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyBloodPressure } from '../src/core/blood-pressure.js';
import { createDefaultSettings } from '../src/core/settings-store.js';
import { getConnector, validateConnector } from '../src/connectors/registry.js';
import { isConnectorOperationBusy, runConnectorOperation } from '../src/connectors/operation-state.js';
import { buildRemoteUrl, createRemoteConnector } from '../src/connectors/remote.js';
import { replaceEvents, replaceMeasurements, resetApplicationState } from '../src/core/state.js';

test('ESC classification accepts a customized threshold profile', () => {
    const profile = createDefaultSettings().esc2024;
    profile.hypertensionSystolic = 150;
    assert.equal(classifyBloodPressure(145, 80, profile).level, 'elevated');
    assert.equal(classifyBloodPressure(150, 80, profile).level, 'high');
});

test('remote URLs are deterministic and block mixed content', () => {
    const remote = { protocol: 'https', host: 'api.example.com', port: '8443', basePath: '/bpms' };
    assert.equal(buildRemoteUrl(remote, '/measurements', 'https:'), 'https://api.example.com:8443/bpms/measurements');
    assert.throws(
        () => buildRemoteUrl({ ...remote, protocol: 'http' }, '/health', 'https:'),
        /HTTPS page/
    );
});

test('connector contract rejects incomplete implementations', () => {
    assert.throws(() => validateConnector({ id: 'broken' }), /translation keys/);
    assert.doesNotThrow(() => validateConnector({
        id: 'example',
        labelKey: 'example.label',
        descriptionKey: 'example.description',
        capabilities: { fetch: true, publish: false, manualEntry: false, deviceManagement: false },
        isSupported() {},
        connect() {},
        disconnect() {},
        fetchMeasurements() {},
        publishMeasurements() {}
    }));
});

test('remote connector exchanges canonical datasets in both directions', async t => {
    t.after(resetApplicationState);
    const requests = [];
    const fetchImpl = async (url, options = {}) => {
        requests.push({ url, options });
        return { ok: true, status: 200, json: async () => ({ schema: 'bpms', version: 2, device: {}, measurements: [], events: [] }) };
    };
    const connector = createRemoteConnector({
        getSettings: () => ({ remote: { protocol: 'https', host: 'api.example.com', port: '', basePath: '/api' } }),
        fetchImpl
    });

    assert.deepEqual(connector.capabilities, { fetch: true, publish: true, manualEntry: true, deviceManagement: false });
    await connector.connect();
    replaceMeasurements([{
        systolic: 121,
        diastolic: 78,
        pulse: 64,
        datetime: '2026-08-10 09:15',
        bodyPosition: 'sitting',
        measurementMethod: 'manual'
    }]);
    replaceEvents([{ id: 'coffee-1', type: 'coffee', datetime: '2026-08-10T09:00' }]);

    const counts = await connector.publishMeasurements();
    assert.deepEqual(counts, { measurements: 1, events: 1 });
    assert.equal(requests[1].url, 'https://api.example.com/api/measurements');
    assert.equal(requests[1].options.method, 'POST');
    assert.equal(requests[1].options.headers['Content-Type'], 'application/json');
    const payload = JSON.parse(requests[1].options.body);
    assert.equal(payload.schema, 'bpms');
    assert.equal(payload.version, 2);
    assert.equal(payload.measurements[0].measurementMethod, 'manual');
    assert.equal(payload.events[0].type, 'coffee');
});

test('Hingmed alone exposes the device-management interface', () => {
    assert.equal(getConnector('hingmed').capabilities.deviceManagement, true);
    assert.equal(getConnector('manual').capabilities.deviceManagement, false);
    assert.equal(getConnector('remote').capabilities.deviceManagement, false);
});

test('connector operation state rejects overlapping device work', async () => {
    let finish;
    const first = runConnectorOperation('first', () => new Promise(resolve => {
        finish = resolve;
    }));

    assert.equal(isConnectorOperationBusy(), true);
    await assert.rejects(
        runConnectorOperation('second', async () => {}),
        /already in progress/u
    );

    finish('done');
    assert.equal(await first, 'done');
    assert.equal(isConnectorOperationBusy(), false);
});
