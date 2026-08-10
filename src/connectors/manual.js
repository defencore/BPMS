import { addManualMeasurement } from '../core/measurement-store.js';

export const manualConnector = Object.freeze({
    id: 'manual',
    labelKey: 'connector.manual.label',
    descriptionKey: 'connector.manual.description',
    capabilities: Object.freeze({ fetch: false, publish: false, manualEntry: true, deviceManagement: false }),
    isSupported: () => true,
    connect: async () => true,
    disconnect: async () => true,
    fetchMeasurements: async () => false,
    publishMeasurements: async () => false,
    addMeasurement: addManualMeasurement
});
