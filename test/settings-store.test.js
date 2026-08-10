import assert from 'node:assert/strict';
import test from 'node:test';

import {
    SETTINGS_STORAGE_KEY,
    createDefaultSettings,
    createSettingsRepository
} from '../src/core/settings-store.js';

test('settings use current ESC values by default and persist valid changes', () => {
    const storage = memoryStorage();
    const repository = createSettingsRepository(storage);
    const defaults = repository.get();
    assert.equal(defaults.esc2024.crisisSystolic, 180);
    assert.equal(defaults.esc2024.riskZones.optimalSystolic, 120);
    assert.equal(defaults.patterns.morningSurge, 20);
    assert.equal(defaults.analysis.minimumPatternReadings, 7);
    assert.equal(defaults.analysis.ignoreMovementReadings, true);
    assert.equal(defaults.monitoring.profile, 'abpm24');
    assert.equal(defaults.referenceProfiles.abpm24.night.systolic, 120);
    assert.ok(defaults.eventPresets.some(preset => preset.type === 'medication'));

    repository.update({ connector: { active: 'remote' }, remote: { host: 'api.example.com', port: 443 } });
    const restored = createSettingsRepository(storage).get();
    assert.equal(restored.connector.active, 'remote');
    assert.equal(restored.remote.host, 'api.example.com');
    assert.equal(restored.remote.port, '443');
    assert.ok(storage.getItem(SETTINGS_STORAGE_KEY));
});

test('context presets are normalized and persisted locally with signed offsets', () => {
    const storage = memoryStorage();
    const repository = createSettingsRepository(storage);
    repository.update({ eventPresets: [{
        id: 'morning-medication',
        type: 'medication',
        label: 'Morning medication',
        name: 'Example',
        dose: '5 mg',
        defaultOffsetMinutes: -15,
        durationMinutes: 0,
        analysisWindowMinutes: 240
    }] });
    const [preset] = createSettingsRepository(storage).get().eventPresets;
    assert.equal(preset.defaultOffsetMinutes, -15);
    assert.equal(preset.dose, '5 mg');
    assert.throws(() => repository.update({ eventPresets: [{ ...preset, type: 'invalid' }] }), /Invalid event type/);
});

test('settings reject inconsistent clinical boundaries', () => {
    const repository = createSettingsRepository(memoryStorage());
    assert.throws(
        () => repository.update({ esc2024: { hypertensionSystolic: 110 } }),
        /strictly increasing/
    );
    assert.deepEqual(repository.get(), createDefaultSettings());
    assert.throws(
        () => repository.update({ analysis: { alertWindow: 2, highReadingsForAlert: 3 } }),
        /cannot exceed/
    );
    assert.throws(
        () => repository.update({ monitoring: { dayIntervalMinutes: 0 } }),
        /must be positive/
    );
    assert.throws(
        () => repository.update({ monitoring: { minimumValidPercent: 101 } }),
        /cannot exceed 100/
    );
});

function memoryStorage() {
    const values = new Map();
    return {
        get length() { return values.size; },
        key: index => [...values.keys()][index] ?? null,
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };
}
