# Hingmed WBP-02A USB/UART protocol

This document describes the USB/UART path implemented by BPMS for the Hingmed WBP-02A. It is based on recovered behavior from the Hingmed PC application V3.2.7 and verified device captures. It is not an official manufacturer specification, and firmware variants may differ.

The Wi-Fi controls in BPMS came from a separate reverse-engineering utility. They are intentionally outside the verified USB programming contract described below.

## Transport and frame format

- Web Serial: `19200` baud, `8` data bits, no parity, `1` stop bit.
- RTS and DTR are enabled while the port is open.
- A normal serial frame is `HEADER LENGTH COMMAND PAYLOAD CRC_HIGH CRC_LOW`.
- `HEADER` is `0x5A`.
- `LENGTH` is the total frame length, including the two CRC bytes.
- CRC uses initial value `0xFFFF`, reflected polynomial `0xA001`, and is placed on the wire as calculated high byte followed by low byte.

Examples:

```text
Record count request: 5A 05 53 BE 12
Record 0 request:     5A 07 54 00 00 A9 3C
Clear request:        5A 05 57 7D 13
Finalize request:     5A 05 90 EF 52
```

The stream parser waits for the complete declared length, validates CRC, and resynchronizes after noise or a corrupt frame. A frame with a bad CRC is never delivered to normal command handlers.

## Handshake

The discovery request and fixed response are:

```text
Request:  5A 0F 52 52 00 69 00 58 00 6F 00 6E 00 B9 9D
Response: 5A 0F 52 52 00 69 00 58 00 6F 00 6E 00 9D B9
```

The fixed response is a protocol exception: its final bytes do not pass the normal wire-order CRC check, so BPMS accepts only this exact 15-byte value as a handshake response.

One attempt sends the request once to wake the channel, waits 100 ms, discards buffered input, sends it again, and waits for the exact response. BPMS makes up to three attempts.

## Reading data

### Record count — `0x53`

The response is exactly seven bytes:

```text
5A 07 53 COUNT_HIGH COUNT_LOW CRC_HIGH CRC_LOW
```

The count is an unsigned 16-bit big-endian value. BPMS therefore supports counts above 255.

### Session or patient ID — `0x56`

The normal response is exactly nine bytes. Its four-byte payload is a signed 32-bit little-endian integer. BPMS writes only the non-negative range `0..2147483647`.

This field is not UTF-8 text. Commands `0x41` and `0x55` are not part of the verified V3.2.7 USB workflow and are not exposed as standard WBP-02A user-name operations.

### Measurement — `0x54`

The request payload is a full unsigned 16-bit big-endian index:

```text
5A 07 54 INDEX_HIGH INDEX_LOW CRC_HIGH CRC_LOW
```

The response is exactly 18 bytes:

| Offset | Field | Encoding |
| ---: | --- | --- |
| 0 | Header | `0x5A` |
| 1 | Total length | `0x12` |
| 2 | Command | `0x54` |
| 3–4 | Systolic pressure | UInt16 big-endian |
| 5–6 | Diastolic pressure | UInt16 big-endian |
| 7–8 | Pulse | UInt16 big-endian |
| 9–13 | Timestamp | `YY MM DD HH MM` |
| 14 | Device error | raw byte |
| 15 | Status | position nibble + event nibble |
| 16–17 | CRC | high byte, low byte |

BPMS applies the same defensive value checks observed in the PC application:

- systolic or diastolic values above 260 are invalid;
- pulse values above 300 are invalid;
- a reading with diastolic greater than or equal to systolic is invalid.

Invalid vital triples are not loaded into the BPMS dataset. A non-zero device error byte is preserved as an unknown raw device error because V3.2.7 does not provide a verified error-code table.

### Status byte

The status byte is not a set of independent bit flags:

```text
position = status >> 4
event = status & 0x0F
```

Positions:

| Code | Meaning |
| ---: | --- |
| 0 | Lying |
| 1 | Sitting or standing |
| 2 | Lying with slight motion |
| 3 | Heavy motion / physical activity |
| other | Unknown |

Events:

| Code | Meaning |
| ---: | --- |
| 0 | Automatic |
| 1 | Manual |
| 2 | Retest |
| other | Unknown |

For example, `0x21` means a lying measurement with slight motion, started manually. BPMS stores the posture as `lying` and preserves motion separately in `hasMovement`.

## Confirmed programming commands

Every SET command must return an exact echo of the complete request frame. BPMS waits up to two seconds and retries a command up to three times. It never finalizes a partially acknowledged profile.

| Command | Payload | Purpose |
| --- | --- | --- |
| `0x42` | Int32 little-endian | Session or patient ID |
| `0x43` | UInt16 big-endian | Maximum cuff pressure; verified profile uses 280 mmHg |
| `0x44` | `00/01` | First measurement within five minutes |
| `0x45` | `00/01` | Keypad disabled/enabled |
| `0x46` | `00/01` | Display disabled/enabled |
| `0x47` | `00` | Base profile marker |
| `0x48` | `HH MM` | Awake period start |
| `0x49` | minutes | Awake interval |
| `0x4A` | `HH MM` | Awake period end / asleep start |
| `0x4B` | minutes | Asleep interval |
| `0x4C–0x4E` | time, time, interval | Special period 1 |
| `0x4F` | `YY MM DD HH MM` | Browser-local device time |
| `0x58` | `00/01` | Any special period enabled |
| `0x59`, `0x5A` | UInt16 big-endian | Upper systolic and diastolic alarms |
| `0x5B`, `0x5C` | `00/01` | Awake and asleep alarms |
| `0x5D–0x5F` | time, time, interval | Special period 2 |
| `0x60–0x62` | time, time, interval | Special period 3 |
| `0x65`, `0x66` | UInt16 big-endian | Lower systolic and diastolic alarms |
| `0x7A` | `01` | Extended programming marker |
| `0x90` | none | Finalize and exit programming |

The verified interval list is `5, 10, 15, 20, 30, 45, 60, 90, 120` minutes. The recovered V3.2.7 schedule UI uses `00` or `30` minute boundaries.

## Programming and memory clearing transaction

Applying a profile or clearing device memory is destructive. BPMS requires confirmation and uses this order:

1. Complete the handshake.
2. Send `0x57` to clear measurements and receive a CRC-valid response.
3. Send `0x42`, `0x43`, `0x44`, `0x45`, `0x46`, `0x5B`, `0x7A`, and `0x5C`.
4. If an alarm is enabled, send `0x59`, `0x5A`, `0x65`, and `0x66`.
5. Send `0x47`, `0x48`, `0x49`, `0x4A`, `0x4B`, and `0x58`.
6. Send the enabled special-period triplets in slot order.
7. Send the current local time with `0x4F`.
8. Send `0x90` only after every SET frame received an exact echo.
9. Read `0x53` and report whether the device count is zero.

Standalone clock synchronization sends `0x4F` and also requires its exact echo. The known protocol does not expose a clock-readback command, so BPMS can confirm device acknowledgement but cannot independently compare the stored clock value.

## Wi-Fi extension scope

The current BPMS Wi-Fi controls use commands recovered from a separate engineering utility supplied for the device. They are deliberately kept separate from the verified V3.2.7 USB programming sequence. This protocol correction does not change their command mapping, payloads, or UI.

## Implementation map

| Responsibility | Module |
| --- | --- |
| CRC and generic `0x5A` frame construction | [`src/core/protocol.js`](src/core/protocol.js) |
| WBP-02A frame validation and field codecs | [`src/infrastructure/hingmed/serial-codec.js`](src/infrastructure/hingmed/serial-codec.js) |
| Fragmented stream parsing and CRC rejection | [`src/infrastructure/hingmed/packet-buffer.js`](src/infrastructure/hingmed/packet-buffer.js) |
| Web Serial lifecycle, RTS/DTR, and response routing | [`src/infrastructure/hingmed/serial-session.js`](src/infrastructure/hingmed/serial-session.js) |
| Retries, exact echoes, reads, and programming transaction | [`src/infrastructure/hingmed/client.js`](src/infrastructure/hingmed/client.js) |
| Complete profile and command-order validation | [`src/infrastructure/hingmed/usb-profile.js`](src/infrastructure/hingmed/usb-profile.js) |
| Device profile construction and validated schedule values | [`src/features/hingmed/device-settings.js`](src/features/hingmed/device-settings.js) |
| Protocol regression tests | [`test/hingmed-modules.test.js`](test/hingmed-modules.test.js), [`test/protocol.test.js`](test/protocol.test.js) |
