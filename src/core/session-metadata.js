const MAX_PATIENT_NAME_LENGTH = 128;

export function normalizePatientName(value) {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().replace(/\s+/gu, ' ');
    return normalized ? normalized.slice(0, MAX_PATIENT_NAME_LENGTH) : null;
}
