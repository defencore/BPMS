import { getSettings } from '../core/settings-store.js';
import { hingmedConnector } from './hingmed.js';
import { manualConnector } from './manual.js';
import { createRemoteConnector } from './remote.js';

const connectors = [
    hingmedConnector,
    manualConnector,
    createRemoteConnector({ getSettings })
];

connectors.forEach(validateConnector);

export const connectorRegistry = Object.freeze(connectors);

export function getConnector(id) {
    const connector = connectorRegistry.find(candidate => candidate.id === id);
    if (!connector) throw new RangeError(`Unknown connector: ${id}`);
    return connector;
}

export function validateConnector(connector) {
    const requiredMethods = ['isSupported', 'connect', 'disconnect', 'fetchMeasurements', 'publishMeasurements'];
    if (!connector || typeof connector.id !== 'string' || !connector.id) throw new TypeError('Connector id is required');
    if (typeof connector.labelKey !== 'string' || typeof connector.descriptionKey !== 'string') {
        throw new TypeError(`Connector ${connector.id} must define translation keys`);
    }
    for (const method of requiredMethods) {
        if (typeof connector[method] !== 'function') throw new TypeError(`Connector ${connector.id} must implement ${method}()`);
    }
    if (typeof connector.capabilities?.fetch !== 'boolean'
        || typeof connector.capabilities?.publish !== 'boolean'
        || typeof connector.capabilities?.manualEntry !== 'boolean'
        || typeof connector.capabilities?.deviceManagement !== 'boolean') {
        throw new TypeError(`Connector ${connector.id} must define capabilities`);
    }
    return connector;
}
