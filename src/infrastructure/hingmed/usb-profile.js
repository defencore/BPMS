import { packetsEqual } from '../../core/protocol.js';

const USB_PROFILE_ORDER = Object.freeze([
    0x42, 0x43, 0x44, 0x45, 0x46, 0x5B, 0x7A, 0x5C,
    0x59, 0x5A, 0x65, 0x66,
    0x47, 0x48, 0x49, 0x4A, 0x4B, 0x58,
    0x4C, 0x4D, 0x4E,
    0x5D, 0x5E, 0x5F,
    0x60, 0x61, 0x62
]);

const REQUIRED_COMMANDS = Object.freeze([
    0x42, 0x43, 0x44, 0x45, 0x46, 0x5B, 0x7A, 0x5C,
    0x47, 0x48, 0x49, 0x4A, 0x4B, 0x58
]);

const OPTIONAL_GROUPS = Object.freeze([
    Object.freeze({ commands: [0x59, 0x5A, 0x65, 0x66], label: 'alarm threshold' }),
    Object.freeze({ commands: [0x4C, 0x4D, 0x4E], label: 'special period 1' }),
    Object.freeze({ commands: [0x5D, 0x5E, 0x5F], label: 'special period 2' }),
    Object.freeze({ commands: [0x60, 0x61, 0x62], label: 'special period 3' })
]);

export function assertCompleteUsbProfile(steps) {
    if (!Array.isArray(steps)) throw new TypeError('A complete device profile is required for programming');
    const commands = steps.map(step => step?.command);
    if (commands.some(command => !USB_PROFILE_ORDER.includes(command))) {
        throw new TypeError('Device profile contains an unsupported or malformed USB command');
    }
    if (new Set(commands).size !== commands.length) throw new TypeError('Device profile contains duplicate USB commands');
    if (REQUIRED_COMMANDS.some(command => !commands.includes(command))) {
        throw new TypeError('A complete device profile is required for programming');
    }
    const sorted = [...commands].sort(byVerifiedOrder);
    if (!commands.every((command, index) => command === sorted[index])) {
        throw new TypeError('Device profile commands are not in the verified WBP-02A order');
    }
    for (const group of OPTIONAL_GROUPS) assertCompleteGroup(commands, group);
    assertFixedPayloads(steps);
}

function byVerifiedOrder(left, right) {
    return USB_PROFILE_ORDER.indexOf(left) - USB_PROFILE_ORDER.indexOf(right);
}

function assertCompleteGroup(commands, { commands: group, label }) {
    const count = group.filter(command => commands.includes(command)).length;
    if (count !== 0 && count !== group.length) throw new TypeError(`Incomplete ${label} command group`);
}

function assertFixedPayloads(steps) {
    const byCommand = new Map(steps.map(step => [step.command, Array.from(step.payload ?? [])]));
    if (!packetsEqual(byCommand.get(0x43), [0x01, 0x18])) throw new TypeError('WBP-02A maximum cuff pressure must be 280 mmHg');
    if (byCommand.get(0x42)?.length !== 4) throw new TypeError('Session ID must contain four little-endian bytes');
    if (!packetsEqual(byCommand.get(0x7A), [1])) throw new TypeError('Invalid extended programming marker');
    if (!packetsEqual(byCommand.get(0x47), [0])) throw new TypeError('Invalid base profile marker');
}
