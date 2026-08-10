import {
    connectHingmed,
    disconnectHingmed,
    fetchHingmedMeasurements,
    isHingmedSupported
} from '../features/hingmed/controller.js';

export const hingmedConnector = Object.freeze({
    id: 'hingmed',
    labelKey: 'connector.hingmed.label',
    descriptionKey: 'connector.hingmed.description',
    capabilities: Object.freeze({ fetch: true, publish: false, manualEntry: false, deviceManagement: true }),
    isSupported: isHingmedSupported,
    connect: connectHingmed,
    disconnect: disconnectHingmed,
    fetchMeasurements: fetchHingmedMeasurements,
    publishMeasurements: async () => false
});
