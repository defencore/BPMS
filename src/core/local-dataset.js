import { createExportPayload, parseExportPayload } from './data-schema.js';

export const LOCAL_DATASET_STORAGE_KEY = 'bpms.dataset.v2';

export function loadLocalDataset(storage = globalThis.localStorage) {
    try {
        const serialized = storage?.getItem(LOCAL_DATASET_STORAGE_KEY);
        return serialized ? parseExportPayload(JSON.parse(serialized)) : null;
    } catch (error) {
        storage?.removeItem(LOCAL_DATASET_STORAGE_KEY);
        notifyStorageError(error);
        return null;
    }
}

export function saveLocalDataset(dataset, storage = globalThis.localStorage) {
    try {
        storage?.setItem(LOCAL_DATASET_STORAGE_KEY, JSON.stringify(createExportPayload(dataset)));
        return true;
    } catch (error) {
        notifyStorageError(error);
        return false;
    }
}

export function clearLocalDataset(storage = globalThis.localStorage) {
    storage?.removeItem(LOCAL_DATASET_STORAGE_KEY);
}

function notifyStorageError(error) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('bpms:storageerror', { detail: { message: error.message } }));
}
