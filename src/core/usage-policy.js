export const USAGE_POLICY_VERSION = '1.2.0';
export const USAGE_POLICY_STORAGE_KEY = 'bpms.usage-policy.v1';

export function readUsagePolicyAcceptance(storage) {
    try {
        const value = JSON.parse(storage?.getItem(USAGE_POLICY_STORAGE_KEY) ?? 'null');
        return value?.accepted === true && value.version === USAGE_POLICY_VERSION ? value : null;
    } catch {
        storage?.removeItem(USAGE_POLICY_STORAGE_KEY);
        return null;
    }
}

export function acceptUsagePolicy(storage, acceptedAt = new Date()) {
    const acceptance = {
        accepted: true,
        version: USAGE_POLICY_VERSION,
        acceptedAt: acceptedAt.toISOString()
    };
    storage?.setItem(USAGE_POLICY_STORAGE_KEY, JSON.stringify(acceptance));
    return acceptance;
}
