import { createExportPayload, parseExportPayload } from '../core/data-schema.js';
import { replaceEvents, replaceMeasurements, state, updateDeviceInfo } from '../core/state.js';

export function createRemoteConnector({ getSettings, fetchImpl = globalThis.fetch } = {}) {
    let connected = false;
    const connector = {
        id: 'remote',
        labelKey: 'connector.remote.label',
        descriptionKey: 'connector.remote.description',
        capabilities: Object.freeze({ fetch: true, publish: true, manualEntry: true, deviceManagement: false }),
        isSupported: () => typeof fetchImpl === 'function',
        async connect() {
            const response = await request('/health');
            connected = response.ok;
            if (!connected) throw new Error(`Remote health check failed (${response.status})`);
            return true;
        },
        async disconnect() {
            connected = false;
            return true;
        },
        async fetchMeasurements() {
            if (!connected) throw new Error('Remote connector is not connected');
            const response = await request('/measurements');
            if (!response.ok) throw new Error(`Remote measurement request failed (${response.status})`);
            const payload = parseExportPayload(await response.json());
            replaceMeasurements(payload.measurements);
            replaceEvents(payload.events);
            updateDeviceInfo({ ...payload.deviceInfo, numRecords: payload.measurements.length });
            return payload.measurements.length;
        },
        async publishMeasurements() {
            if (!connected) throw new Error('Remote connector is not connected');
            const payload = createExportPayload({
                deviceInfo: state.deviceInfo,
                measurements: state.measurements,
                events: state.events
            });
            const response = await request('/measurements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Remote measurement upload failed (${response.status})`);
            return Object.freeze({ measurements: payload.measurements.length, events: payload.events.length });
        }
    };

    async function request(endpoint, options = {}) {
        const settings = getSettings();
        const url = buildRemoteUrl(settings.remote, endpoint, globalThis.location?.protocol);
        return fetchImpl(url, {
            ...options,
            headers: { Accept: 'application/json', ...options.headers },
            signal: AbortSignal.timeout(10000)
        });
    }

    return Object.freeze(connector);
}

export function buildRemoteUrl(remote, endpoint, pageProtocol = '') {
    const host = remote.host?.trim();
    if (!host) throw new TypeError('Remote server address is required');
    if (pageProtocol === 'https:' && remote.protocol === 'http') {
        throw new TypeError('An HTTPS page cannot connect to an HTTP API');
    }
    const port = remote.port ? `:${remote.port}` : '';
    const basePath = `/${String(remote.basePath || '/api').replace(/^\/+|\/+$/gu, '')}`;
    const path = `/${String(endpoint).replace(/^\/+/, '')}`;
    return `${remote.protocol}://${host}${port}${basePath}${path}`;
}
