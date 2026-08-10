export const MANUAL_DEVICE_DEFAULTS = Object.freeze({
    id: 'BPMS-MANUAL',
    serialNumber: 'MANUAL-BPMS',
    macAddress: '02:00:00:00:00:01'
});

const EDITABLE_FIELDS = Object.freeze(['id', 'username', 'userId', 'serialNumber', 'macAddress']);

export function manualDeviceDefaultsPatch(deviceInfo = {}) {
    return hasDeviceIdentity(deviceInfo) ? null : { ...MANUAL_DEVICE_DEFAULTS };
}

export function normalizeManualDeviceInfo(candidate = {}) {
    const normalized = Object.fromEntries(EDITABLE_FIELDS.map(field => [field, cleanText(candidate[field])]));
    if (!normalized.id) throw new RangeError('Device ID is required');
    if (!normalized.serialNumber) throw new RangeError('Serial number is required');
    if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/u.test(normalized.macAddress)) {
        throw new RangeError('MAC address must contain six hexadecimal pairs separated by colons');
    }
    return normalized;
}

function hasDeviceIdentity(deviceInfo) {
    return ['id', 'serialNumber', 'macAddress'].some(field => cleanText(deviceInfo[field]));
}

function cleanText(value) {
    return typeof value === 'string' ? value.trim().slice(0, 128) : '';
}
