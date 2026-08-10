import { formatDate, t } from '../../i18n/i18n.js';
import { showAlert } from '../../ui/alerts.js';
import { addToTerminal } from '../../ui/terminal.js';
import { encodeSessionId } from '../../infrastructure/hingmed/serial-codec.js';
import { blockIfDeviceBusy, runDeviceOperation } from './operation.js';

const SPECIAL_PERIODS = Object.freeze([
    { enabled: 'special1-enabled', begin: 0x4C, end: 0x4D, interval: 0x4E, prefix: 'special1' },
    { enabled: 'special2-enabled', begin: 0x5D, end: 0x5E, interval: 0x5F, prefix: 'special2' },
    { enabled: 'special3-enabled', begin: 0x60, end: 0x61, interval: 0x62, prefix: 'special3' }
]);
const SUPPORTED_INTERVALS = Object.freeze([5, 10, 15, 20, 30, 45, 60, 90, 120]);
const INTERVAL_IDS = Object.freeze([
    'awake-interval',
    'asleep-interval',
    'special1-interval',
    'special2-interval',
    'special3-interval'
]);
const TIME_PREFIXES = Object.freeze([
    'awake-begin',
    'awake-end',
    'special1-begin',
    'special1-end',
    'special2-begin',
    'special2-end',
    'special3-begin',
    'special3-end'
]);

export function initDeviceSettings(client, onDeviceInfoChanged = () => {}) {
    normalizeScheduleControls();
    document.getElementById('btn-configure-device')?.addEventListener('click', () => configure(client, onDeviceInfoChanged));
    for (const id of ['awake-alarm', 'asleep-alarm']) {
        document.getElementById(id)?.addEventListener('change', togglePressureLimits);
    }
    togglePressureLimits();
}

export function buildDeviceConfiguration(read) {
    const specials = SPECIAL_PERIODS.filter(period => read.checked(period.enabled));
    const steps = [
        step(0x42, encodeSessionId(read.integer('user-id-input', 0, 0x7FFFFFFF))),
        step(0x43, uint16(280)),
        step(0x44, [read.checked('start-in-five-minutes') ? 1 : 0]),
        step(0x45, [read.integer('keypad-setting', 0, 1)]),
        step(0x46, [read.integer('display-setting', 0, 1)]),
        step(0x5B, [read.integer('awake-alarm', 0, 1)]),
        step(0x7A, [1]),
        step(0x5C, [read.integer('asleep-alarm', 0, 1)])
    ];

    if (read.integer('awake-alarm', 0, 1) || read.integer('asleep-alarm', 0, 1)) {
        steps.push(
            step(0x59, uint16(read.integer('highest-sys', 1, 300))),
            step(0x5A, uint16(read.integer('highest-dia', 1, 200))),
            step(0x65, uint16(read.integer('lowest-sys', 1, 300))),
            step(0x66, uint16(read.integer('lowest-dia', 1, 200)))
        );
    }

    steps.push(
        step(0x47, [0]),
        step(0x48, scheduleTime(read, 'awake-begin')),
        step(0x49, [scheduleInterval(read, 'awake-interval')]),
        step(0x4A, scheduleTime(read, 'awake-end')),
        step(0x4B, [scheduleInterval(read, 'asleep-interval')]),
        step(0x58, [specials.length ? 1 : 0])
    );

    for (const period of specials) {
        steps.push(
            step(period.begin, scheduleTime(read, `${period.prefix}-begin`)),
            step(period.end, scheduleTime(read, `${period.prefix}-end`)),
            step(period.interval, [scheduleInterval(read, `${period.prefix}-interval`)])
        );
    }

    return steps;
}

export function readDeviceConfiguration() {
    return buildDeviceConfiguration(domReader());
}

async function configure(client, onDeviceInfoChanged) {
    if (!client.isConnected()) return showAlert(t('hingmed.not-connected'), 'danger');
    if (blockIfDeviceBusy()) return;
    if (!globalThis.confirm(t('hingmed.device-program-confirm'))) return;
    const button = document.getElementById('btn-configure-device');
    if (button) button.disabled = true;
    await runDeviceOperation('program', async () => {
        try {
            addToTerminal(t('hingmed.device-config-start'), 'system');
            const result = await client.programDevice(readDeviceConfiguration());
            if (result.recordCount !== null) onDeviceInfoChanged({ numRecords: result.recordCount });
            renderProgrammingResult(result);
            const resultKey = result.recordCount === 0
                ? 'hingmed.device-program-verified'
                : result.recordCount === null ? 'hingmed.device-program-unverified' : 'hingmed.device-program-not-empty';
            const message = t(resultKey, { count: result.recordCount ?? '-' });
            addToTerminal(message, result.recordCount === 0 ? 'system' : 'warning');
            showAlert(message, result.recordCount === 0 ? 'success' : 'warning');
        } catch (error) {
            addToTerminal(t('hingmed.operation-error', { message: error.message }), 'error');
            showAlert(t('hingmed.device-config-error'), 'danger');
        } finally {
            if (button) button.disabled = !client.isConnected();
        }
    });
}

function renderProgrammingResult({ clockSentAt, recordCount }) {
    const status = document.getElementById('device-program-status');
    if (!status) return;
    status.hidden = false;
    status.className = `device-program-status ${recordCount === 0 ? 'verified' : 'limited'}`;
    status.innerHTML = `
        <strong>${t('hingmed.device-program-result')}</strong>
        <span>${t('hingmed.device-clock-sent', { time: formatDate(clockSentAt, { dateStyle: 'medium', timeStyle: 'short' }) })}</span>
        <span>${recordCount === null
            ? t('hingmed.device-clock-no-readback')
            : t('hingmed.device-records-after-programming', { count: recordCount })}</span>`;
}

function togglePressureLimits() {
    const visible = value('awake-alarm') === '1' || value('asleep-alarm') === '1';
    const limits = document.getElementById('pressure-limits');
    if (limits) limits.style.display = visible ? 'block' : 'none';
}

function domReader() {
    return {
        checked: id => Boolean(document.getElementById(id)?.checked),
        integer: (id, min, max) => integer(id, min, max),
        time: prefix => [integer(`${prefix}-hour`, 0, 23), integer(`${prefix}-min`, 0, 59)]
    };
}

function integer(id, min, max) {
    const number = Number(value(id));
    if (!Number.isInteger(number) || number < min || number > max) throw new RangeError(`${id} must be between ${min} and ${max}`);
    return number;
}

function value(id) {
    return document.getElementById(id)?.value ?? '';
}

function step(command, payload) {
    return { command, payload };
}

function uint16(value) {
    return [value >> 8, value & 0xFF];
}

function scheduleTime(read, prefix) {
    const [hour, minute] = read.time(prefix);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || ![0, 30].includes(minute)) {
        throw new RangeError(`${prefix} must use a valid hour and a 00 or 30 minute boundary`);
    }
    return [hour, minute];
}

function scheduleInterval(read, id) {
    const value = read.integer(id, 5, 120);
    if (!SUPPORTED_INTERVALS.includes(value)) {
        throw new RangeError(`${id} must be one of: ${SUPPORTED_INTERVALS.join(', ')}`);
    }
    return value;
}

function normalizeScheduleControls() {
    for (const id of INTERVAL_IDS) {
        const select = document.getElementById(id);
        if (!select) continue;
        const selected = Number(select.value);
        select.replaceChildren(...SUPPORTED_INTERVALS.map(value => new Option(String(value), String(value))));
        select.value = String(SUPPORTED_INTERVALS.includes(selected) ? selected : id === 'asleep-interval' ? 60 : 30);
    }
    for (const prefix of TIME_PREFIXES) {
        const select = document.getElementById(`${prefix}-min`);
        if (!select) continue;
        const selected = Number(select.value);
        select.replaceChildren(new Option('00', '00'), new Option('30', '30'));
        select.value = String(selected === 30 ? 30 : 0).padStart(2, '0');
    }
}
