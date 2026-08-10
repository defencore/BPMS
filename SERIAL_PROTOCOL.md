# BPMS Serial Device Protocol

This document describes the binary serial protocol used by BPMS-compatible blood-pressure monitors. It combines behavior implemented by the application with observations from captured device sessions.

The protocol is reverse-engineered and is not an official manufacturer specification. Command meaning can vary by firmware, device mode, or model. Each section distinguishes implemented behavior from captured or inferred behavior where that distinction matters.

## Table of contents

- [Scope and evidence levels](#scope-and-evidence-levels)
- [Serial transport](#serial-transport)
- [Frame format](#frame-format)
- [CRC-16](#crc-16)
- [Stream parsing](#stream-parsing)
- [Session initialization](#session-initialization)
- [Reading stored measurements](#reading-stored-measurements)
- [Measurement record layout](#measurement-record-layout)
- [Measurement flags](#measurement-flags)
- [Measurement error codes](#measurement-error-codes)
- [Core commands](#core-commands)
- [Schedule and alarm commands](#schedule-and-alarm-commands)
- [Wi-Fi commands](#wi-fi-commands)
- [Configuration transaction](#configuration-transaction)
- [Worked examples](#worked-examples)
- [Error handling](#error-handling)
- [Implementation map](#implementation-map)
- [Historical capture notes](#historical-capture-notes)
- [Known limitations and open questions](#known-limitations-and-open-questions)

## Scope and evidence levels

The tables use the following labels:

| Label | Meaning |
| --- | --- |
| **Implemented** | The current application generates or parses the command. |
| **Captured** | A complete frame exists in recorded communication logs or as a known packet in the application. |
| **Inferred** | Meaning is derived from UI correlation or repeated behavior but has not been independently confirmed. |
| **Firmware-dependent** | The command can return `0xD3` or behave differently outside a special device mode. |

“Implemented” does not imply validation against every physical device or firmware revision.

## Serial transport

BPMS opens the selected port with these settings:

| Setting | Value |
| --- | --- |
| Baud rate | `19200` |
| Data bits | `8` |
| Parity | `none` |
| Stop bits | `1` |
| Flow control | not explicitly configured |

The Web Serial API requires HTTPS or `localhost`, and the browser requires the user to select the port.

## Frame format

Every known request and response uses this envelope:

```text
+--------+--------+---------+-----------------+----------+---------+
| 0x5A   | LENGTH | COMMAND | PARAMETERS ...  | CRC_HIGH | CRC_LOW |
+--------+--------+---------+-----------------+----------+---------+
  byte 0   byte 1   byte 2      byte 3 ...       n - 2      n - 1
```

| Field | Size | Description |
| --- | ---: | --- |
| Header | 1 byte | Always `0x5A`. |
| Length | 1 byte | Total frame length in bytes, including header, length, command, parameters, and CRC. |
| Command | 1 byte | Operation identifier. |
| Parameters | 0–250 bytes | Command-specific payload. |
| CRC | 2 bytes | Serialized as calculated high byte followed by calculated low byte. |

The minimum valid frame is five bytes:

```text
5A 05 COMMAND CRC_HIGH CRC_LOW
```

### Length examples

| Frame | Length byte | Actual bytes |
| --- | ---: | ---: |
| `5A 05 53 BE 12` | `0x05` | 5 |
| `5A 07 54 00 00 A9 3C` | `0x07` | 7 |
| `5A 12 54 ... A9 83` | `0x12` | 18 |

## CRC-16

CRC covers every byte before the final two CRC bytes, including `0x5A`, `LENGTH`, and `COMMAND`.

The implementation uses:

- initial state: `0xFFFF`;
- reflected polynomial: `0xA001`;
- no final XOR;
- serialized order used by this protocol: calculated high byte, then calculated low byte.

The project routine returns `[low, high]`; callers append `[high, low]` to the frame.

### CRC test vector

```text
Input bytes:     5A 05 53
Calculated low:  12
Calculated high: BE
Serialized frame: 5A 05 53 BE 12
```

Another known vector:

```text
Input bytes:      5A 07 54 00 00
Serialized CRC:   A9 3C
Complete request: 5A 07 54 00 00 A9 3C
```

Reference implementation: [`calculateCRC16()`](src/core/protocol.js).

## Stream parsing

A serial read can return a partial frame, exactly one frame, or multiple frames. Parsing therefore operates on an accumulated byte buffer.

Recommended parser flow:

1. Append each incoming chunk to the receive buffer.
2. Search for the header byte `0x5A`.
3. Discard bytes before the header.
4. Wait until at least two bytes are available.
5. Read the total frame length from byte `1`.
6. Reject impossible lengths smaller than `5`.
7. Wait until the buffer contains `LENGTH` bytes.
8. Extract one complete frame.
9. Verify its CRC over bytes `0..LENGTH-3`.
10. Dispatch by `COMMAND` at byte `2`.
11. Continue parsing any bytes left in the buffer.

The current transport implements buffering, header resynchronization, length-based extraction, and command matching. Response CRC validation is not yet enforced by the transport; see [Known limitations and open questions](#known-limitations-and-open-questions).

## Session initialization

The normal application flow begins with an RR handshake.

### Handshake request (`0x52`)

```text
5A 0F 52 52 00 69 00 58 00 6F 00 6E 00 B9 9D
```

Parameter bytes decode as UTF-16LE `RiXon`:

```text
52 00 | 69 00 | 58 00 | 6F 00 | 6E 00
  R       i       X       o       n
```

Some devices echo the handshake frame. BPMS treats an exact echo as a successful handshake.

### V probe (`0x56`)

After the handshake, the application sends:

```text
5A 05 56 BD D2
```

Command `0x56` is also used by the current firmware integration as **Get User ID**. This overlap is mode- or firmware-dependent and should not be generalized without a capture from the target device.

## Reading stored measurements

The application uses a handshake between major requests because this behavior was reliable in captured sessions.

```text
Handshake → Get record count → Handshake → Read record 0..N-1
```

### Get record count (`0x53`)

Request:

```text
5A 05 53 BE 12
```

Example response:

```text
5A 07 53 00 24 73 8D
```

Response layout:

| Offset | Field | Example | Meaning |
| ---: | --- | --- | --- |
| 0 | Header | `5A` | Frame start. |
| 1 | Length | `07` | Seven bytes total. |
| 2 | Command | `53` | Get record count. |
| 3 | Reserved | `00` | Observed as zero. |
| 4 | Count | `24` | `0x24` = 36 records. |
| 5–6 | CRC | `73 8D` | High byte, low byte. |

### Read record (`0x54`)

Request layout:

```text
5A 07 54 INDEX_HIGH INDEX_LOW CRC_HIGH CRC_LOW
```

The current application fixes `INDEX_HIGH` to `0x00` and uses the low eight bits of the record index.

First record request:

```text
5A 07 54 00 00 A9 3C
```

## Measurement record layout

A complete observed measurement response is 18 bytes:

```text
5A 12 54 00 SYS 00 DIA 00 PULSE YY MM DD HH MIN ERROR FLAGS CRC_H CRC_L
```

### Byte-by-byte layout

| Offset | Field | Size | Encoding | Example |
| ---: | --- | ---: | --- | --- |
| 0 | Header | 1 | fixed `0x5A` | `5A` |
| 1 | Length | 1 | total bytes | `12` = 18 |
| 2 | Command | 1 | fixed `0x54` | `54` |
| 3 | Reserved/prefix | 1 | observed `0x00` | `00` |
| 4 | Systolic | 1 | unsigned integer, mmHg | `8D` = 141 |
| 5 | Reserved | 1 | observed `0x00` | `00` |
| 6 | Diastolic | 1 | unsigned integer, mmHg | `40` = 64 |
| 7 | Reserved | 1 | observed `0x00` | `00` |
| 8 | Pulse | 1 | unsigned integer, bpm | `43` = 67 |
| 9 | Year | 1 | year minus 2000 | `19` = 2025 |
| 10 | Month | 1 | `1..12` | `05` = May |
| 11 | Day | 1 | `1..31` | `18` = 24 |
| 12 | Hour | 1 | `0..23` | `03` |
| 13 | Minute | 1 | `0..59` | `38` = 56 |
| 14 | Error | 1 | error code | `00` |
| 15 | Flags | 1 | posture/method/movement bit field | `21` |
| 16 | CRC high | 1 | calculated high byte | `A9` |
| 17 | CRC low | 1 | calculated low byte | `83` |

### Parsing example

Frame:

```text
5A 12 54 00 8D 00 40 00 43 19 05 18 03 38 00 21 A9 83
```

Step-by-step:

1. `5A` confirms the frame header.
2. `12` declares 18 total bytes.
3. `54` identifies a measurement record.
4. `8D` → 141 mmHg systolic.
5. `40` → 64 mmHg diastolic.
6. `43` → 67 bpm.
7. `19 05 18` → `2025-05-24` (`0x19` = 25, `0x18` = 24).
8. `03 38` → `03:56` (`0x38` = 56).
9. Error `00` → no error.
10. Flags `21` → manual measurement (`0x20`) in position code `0x01`.
11. CRC `A9 83` matches the preceding 16 bytes.

Decoded object:

```json
{
  "systolic": 141,
  "diastolic": 64,
  "pulse": 67,
  "datetime": "2025-05-24 03:56",
  "errorCode": 0,
  "error": "none",
  "bodyPosition": "sitting-standing",
  "measurementMethod": "manual",
  "hasMovement": false
}
```

## Measurement flags

The flags byte combines a low-nibble position code with independent movement and method bits.

```text
bit:  7 6 5 4 3 2 1 0
      ? ? M V P P P P

M = manual measurement flag (0x20)
V = movement detected flag  (0x10)
P = position code            (flags & 0x0F)
? = currently undocumented
```

### Position codes

| Low nibble | Canonical value | Display meaning |
| ---: | --- | --- |
| `0x00` | `lying` | Lying down |
| `0x01` | `sitting-standing` | Standing or sitting |
| `0x02` | `light-motion` | Light movement |
| `0x03` | `physical-activity` | Physical activity |
| other | `unknown` | Unknown position |

### Independent bits

| Mask | Meaning when set |
| ---: | --- |
| `0x10` | Movement was detected. |
| `0x20` | Measurement was manual; when clear, it was automatic. |

Example: `0x21 = 0x20 + 0x01`, so it represents a manual measurement with position code `0x01` and no movement flag.

## Measurement error codes

| Code | Canonical value | Meaning |
| ---: | --- | --- |
| `0x00` | `none` | No reported error. |
| `0x0F` | `interrupted` | Measurement interrupted. |
| `0x10` | `movement` | Movement detected. |
| `0x20` | `cuff-pressure` | Cuff pressure error. |
| other | `unknown` | Unrecognized device error. |

## Core commands

| Code | Name | Parameters | Evidence and notes |
| ---: | --- | --- | --- |
| `0x41` | Set user name | UTF-8 bytes, up to 32 characters in UI | Implemented; may require a special menu mode. |
| `0x42` | Set user ID | UTF-8 bytes, up to 16 characters in UI | Implemented. Older captures label `0x42` as a main-configuration command, indicating firmware/mode ambiguity. |
| `0x43` | Set maximum pressure | Device-specific | Declared in code; historical captures use the same code for additional configuration. Firmware-dependent. |
| `0x52` | RR handshake | UTF-16LE `RiXon` | Implemented and captured. |
| `0x53` | Get record count/status | none | Implemented and captured. Count is read from response offset 4. |
| `0x54` | Read record | two-byte record index | Implemented and captured. |
| `0x55` | Get user name | none | Implemented; UTF-8 response payload. |
| `0x56` | Get user ID / V probe | none | Implemented; interpretation depends on device mode. |
| `0x57` | Clear stored measurements | none | Used by the official Hingmed PC software V3.2.7 before device programming. Historical captures had incorrectly inferred this as a firmware-version request. |
| `0x90` | Save and exit | none | Captured fixed frame `5A 05 90 EF 52`. |
| `0xC5` | Get device code | none | Implemented; response is decoded as printable ASCII. |
| `0xD3` | Unsupported-command response | device-specific | Treated as an error/status command in several configuration paths. |

## Schedule and alarm commands

Time and numeric values are binary integers, not ASCII or BCD.

| Code | Setting | Parameter bytes | Current behavior |
| ---: | --- | --- | --- |
| `0x45` | Keypad control | `ENABLED` | `00` disabled, `01` enabled. |
| `0x46` | Display control | `ENABLED` | `00` disabled, `01` enabled. |
| `0x48` | Awake period start | `HH MM` | Both hour and minute are sent. |
| `0x49` | Awake interval | `MINUTES` | One byte. |
| `0x4A` | Awake period end | `HH MM` | Both hour and minute are sent. |
| `0x4B` | Asleep interval | `MINUTES` | One byte. |
| `0x4C` | Special period 1 start | `HH MM` | Sent only when enabled. |
| `0x4D` | Special period 1 end | `HH MM` | Sent only when enabled. |
| `0x4E` | Special period 1 interval | `MINUTES` | Sent only when enabled. |
| `0x4F` | Set device time | `YY MM DD HH MM` | Sent immediately before save/exit to minimize clock drift. Seconds are not transmitted, and this protocol has no known clock-readback command. |
| `0x58` | Finalize schedule | `HAS_SPECIALS` | `01` when any special period is enabled; otherwise `00`. |
| `0x59` | Highest systolic alarm | `00 VALUE` | Sent when either alarm group is enabled. |
| `0x5A` | Highest diastolic alarm | `00 VALUE` | Command byte equals the frame header value; its offset distinguishes it. |
| `0x5B` | Awake alarm | `ENABLED` | `00` disabled, `01` enabled. |
| `0x5C` | Asleep alarm | `ENABLED` | `00` disabled, `01` enabled. Older notes called this additional time configuration. |
| `0x5D` | Special period 2 start | `HH MM` | Sent only when enabled. |
| `0x5E` | Special period 2 end | `HH MM` | Sent only when enabled. |
| `0x5F` | Special period 2 interval | `MINUTES` | One byte in the current implementation. |
| `0x60` | Special period 3 start | `HH MM` | Sent only when enabled. |
| `0x61` | Special period 3 end | `HH MM` | Sent only when enabled. |
| `0x62` | Special period 3 interval | `MINUTES` | One byte. |
| `0x65` | Lowest systolic alarm | `00 VALUE` | Sent when either alarm group is enabled. |
| `0x66` | Lowest diastolic alarm | `00 VALUE` | Sent when either alarm group is enabled. |

## Wi-Fi commands

| Code | Name | Parameter format | Notes |
| ---: | --- | --- | --- |
| `0x50` | Enter/set Wi-Fi device mode | `01` | Captured frame: `5A 06 50 01 3D 0F`. |
| `0xA0` | Set router credentials | UTF-8 `SSID,password` | Total length is computed from encoded payload size. |
| `0xA1` | Set connection interval | `MINUTES` | UI range is 1–120 minutes; captured sequence also sends `00`. |
| `0xA2` | Set server | `IP0 IP1 IP2 IP3 PORT_H PORT_L` | Port is big-endian. |
| `0xA3` | Set IP configuration | described below | Supports DHCP or static addressing. |
| `0xA4` | Get IP configuration | none | Expected response contains DHCP flag and four IPv4 fields. |
| `0xA5` | Set AP-mode SSID | 12 bytes | Input is truncated or space-padded to exactly 12 characters. |
| `0xA6` | Get MAC address | none | Expected response includes six MAC bytes. |
| `0xA7` | Reset Wi-Fi module | none | Firmware-dependent acknowledgement. |
| `0xA8` | Enter station mode | none | Captured frame: `5A 05 A8 3D 53`. |
| `0xAF` | Set module sleep interval | `SECONDS` | Validated by UI to 5–100 seconds. |
| `0xCC` | Blind measurement mode | `ENABLED` | `00` disabled, `01` enabled. |
| `0x98` | Unknown final/status command | none | Captured frame `5A 05 98 29 53`; purpose remains unverified. |

### Server parameters (`0xA2`)

```text
5A 0B A2 IP0 IP1 IP2 IP3 PORT_HIGH PORT_LOW CRC_HIGH CRC_LOW
```

Example for `192.168.1.32:8888`:

```text
5A 0B A2 C0 A8 01 20 22 B8 16 22
```

`0x22B8` is 8888 in network byte order.

### Static IP parameters (`0xA3`)

```text
MODE IP[4] SUBNET[4] GATEWAY[4] DNS[4]
```

- `MODE = 0x00`: static configuration; all four IPv4 fields follow.
- `MODE = 0x01`: DHCP. The current generic setter sends only the mode byte, while captured configuration sequences include populated address fields. This difference is firmware-dependent and should be tested before relying on it.

### Get IP response (`0xA4`)

Expected payload:

```text
DHCP IP[4] SUBNET[4] GATEWAY[4] DNS[4]
```

A complete response with all fields is 22 bytes (`0x16`) including envelope and CRC.

## Configuration transaction

The current device configuration workflow sends commands sequentially with short delays. The official PC workflow issues `0x57` before the configuration frames; the target firmware does not commit the erase when `0x57` is sent alone:

```text
Handshake (52)
  → Clear records / prepare programming (57)
  → Maximum cuff pressure (43)
  → Delayed-start flag (44)
  → Keypad (45)
  → Display (46)
  → Awake alarm (5B)
  → Asleep alarm (5C)
  → Extended profile marker (7A)
  → Base profile parameter (47)
  → Awake start (48)
  → Awake interval (49)
  → Awake end (4A)
  → Asleep interval (4B)
  → Finalize/special-period marker (58)
  → Special period 1 (4C, 4D, 4E) when enabled
  → Special period 2 (5D, 5E, 5F) when enabled
  → Special period 3 (60, 61, 62) when enabled
  → Alarm thresholds (59, 5A, 65, 66) when alarms are enabled
  → Device time (4F)
  → Save and exit (90)
```

The application waits approximately 200 ms between commands, sends the current local time immediately before save/exit, and then queries `0x53` to verify the record count. Hingmed documentation states that programming the WBP-02A deletes its stored history. The UI therefore treats programming as a destructive operation, requires confirmation, and reports whether the device returned zero records afterward. There is no separate verified erase command in the available protocol evidence.

Clock synchronization is transmission-verified only: the application can confirm that the `0x4F` frame was written as part of the completed programming transaction, but it cannot read the clock back over the known protocol. The displayed device time must be checked on the monitor when independent verification is required.

### Connection-time clock synchronization

After a successful handshake, every Hingmed connection sends the current browser-local date and time through `0x4F`. This standalone synchronization does **not** send `0x90` save/exit and therefore does not invoke the destructive programming transaction or clear stored measurements. The known protocol has no clock-readback command, so BPMS reports the transmitted value and the device display remains the independent verification surface.

### Dedicated memory clearing

The monitoring screen exposes a separate, confirmation-protected **Clear device memory** action for Hingmed only. Static inspection of the manufacturer's PC software V3.2.7 shows that its programming workflow calls `ClearMeasureData` (`0x57`) and then writes the complete configuration before save/exit. Testing against the target WBP-02A firmware confirmed that `0x57` alone returns the unchanged record count. BPMS therefore uses this transaction:

```text
Handshake (52) → Clear/prepare (57) → Complete configured profile → Device time (4F) → Save and exit (90) → Record count (53)
```

Because this firmware commits the erase as part of programming, the operation reapplies the schedule currently shown in **Device settings** and synchronizes the clock. BPMS reports success only when the device subsequently returns zero records. A missing count or a non-zero count is reported as unverified or incomplete. The dataset already loaded into browser storage is never removed.

## Worked examples

### Read record 0

```text
TX  5A 07 54 00 00 A9 3C
RX  5A 12 54 00 8D 00 40 00 43 19 05 18 03 38 00 21 A9 83
```

Decoded:

```text
record index:       0
systolic:           141 mmHg
diastolic:          64 mmHg
pulse:              67 bpm
timestamp:          2025-05-24 03:56
error:              none
position:           standing/sitting
method:             manual
movement detected:  no
```

### Read record 1

```text
TX  5A 07 54 00 01 69 FD
RX  5A 12 54 00 94 00 48 00 3C 19 05 18 04 13 00 01 60 E8
```

Decoded:

```text
record index:       1
systolic:           148 mmHg
diastolic:          72 mmHg
pulse:              60 bpm
timestamp:          2025-05-24 04:19
error:              none
position:           standing/sitting
method:             automatic
movement detected:  no
```

### Set device time

For `2025-05-25 09:36`, the parameter bytes are:

```text
YY MM DD HH MM
19 05 19 09 24
```

Complete captured frame:

```text
5A 0A 4F 19 05 19 09 24 F5 AB
```

## Error handling

### Unsupported command (`0xD3`)

Several devices return a short frame whose command byte is `0xD3` when a command is unavailable in the current mode. User-name, user-ID, and Wi-Fi operations treat this as an unsupported-command response.

Possible causes:

- unsupported firmware;
- wrong device mode;
- configuration menu not active;
- command meaning differs for the device model.

### Timeout

Most requests use a 2–5 second timeout. A timeout can indicate:

- an incomplete frame;
- an incorrect baud rate;
- a missing handshake;
- unsupported firmware behavior;
- another process holding the serial port;
- device mode requirements.

### Parser rejection

The measurement codec returns `null` when:

- the frame is shorter than the measurement body;
- the header is not `0x5A`;
- the command is not `0x54`;
- systolic, diastolic, and pulse are all zero;
- the date/time fields do not form a valid local date.

## Implementation map

| Concern | Source |
| --- | --- |
| Command values, positions, errors | [`src/core/constants.js`](src/core/constants.js) |
| CRC, hex conversion, record codec | [`src/core/protocol.js`](src/core/protocol.js) |
| Packet buffering | [`src/infrastructure/hingmed/packet-buffer.js`](src/infrastructure/hingmed/packet-buffer.js) |
| Web Serial lifecycle and response routing | [`src/infrastructure/hingmed/serial-session.js`](src/infrastructure/hingmed/serial-session.js) |
| Hingmed protocol client | [`src/infrastructure/hingmed/client.js`](src/infrastructure/hingmed/client.js) |
| Device command workflows | [`src/features/hingmed/`](src/features/hingmed/) |
| Protocol and round-trip tests | [`test/protocol.test.js`](test/protocol.test.js) |
| Canonical exported measurement schema | [`src/core/data-schema.js`](src/core/data-schema.js) |

## Historical capture notes

Earlier reverse-engineering compared several configuration sessions. These observations remain useful as evidence, but they should not override the current command implementation because some captures appear to come from a different firmware mode.

### Additional captured commands

| Code | Historical label | Captured parameters | Current status |
| ---: | --- | --- | --- |
| `0x42` | Main configuration | variable bytes | Conflicts with the current Set User ID interpretation. |
| `0x43` | Additional configuration | commonly `01 18` | Conflicts with the declared Set Maximum Pressure interpretation. |
| `0x44` | Base parameter | `00` | Not sent by the current application. |
| `0x47` | System parameter G | `00` | Not sent by the current application. |
| `0x57` | Clear records | no request parameters | The old “firmware version” interpretation was disproved by the official V3.2.7 `ClearMeasureData` implementation. |
| `0x7A` | Extended configuration | commonly `01` | Not sent by the current application. |

### Captured UI settings by session

`—` means the original session notes did not contain a value.

| Setting | Session 1 | Session 3 | Session 4 | Session 5 | Session 6 | Session 7 |
| --- | --- | --- | --- | --- | --- | --- |
| Patient number | `202552584558` | `202552585126` | `202552592113` | `202552592113` | `202552595554` | — |
| Name | `555` | `123` | `000` | `000` | `TEST` | — |
| Awake schedule | 18:00–19:30, 30 min | 06:00–21:00, 15 min | 08:00–22:00, 30 min | 08:00–22:00, 30 min | 08:00–22:00, 30 min | 08:00–22:00, 30 min |
| Asleep schedule | 19:30–23:00, 60 min | 21:00–05:30, 45 min | 22:00–08:00, 60 min | 22:00–08:00, 60 min | 22:00–08:00, 60 min | 22:00–08:00, 60 min |
| Special period 1 | 10:00–10:30, 5 min | — | 03:00–04:00, 15 min | 03:00–04:00, 15 min | 03:00–04:00, 15 min | 03:00–04:00, 15 min |
| Special period 2 | 11:00–11:30, 10 min | — | 01:00–02:00, 10 min | 01:00–02:00, 10 min | 01:00–02:00, 10 min | 01:00–02:00, 10 min |
| Special period 3 | active | — | 00:00–01:00, 5 min | 00:00–01:00, 5 min | 00:00–01:00, 5 min | 00:00–01:00, 5 min |
| Keypad | enabled | enabled | disabled | disabled | enabled | enabled |
| Display | enabled | enabled | disabled | enabled | enabled | enabled |
| Awake alarm | disabled | disabled | disabled | disabled | disabled | enabled |
| Asleep alarm | disabled | disabled | disabled | disabled | enabled | disabled |
| Highest systolic | — | — | — | — | 170 | 170 |
| Lowest systolic | — | — | — | — | 90 | 90 |
| Highest diastolic | — | — | — | — | 120 | 120 |
| Lowest diastolic | — | — | — | — | 60 | 60 |

The session matrix documents correlation, not causation. Re-test each write command against the target firmware before treating a historical association as authoritative.

## Known limitations and open questions

1. **Response CRC is not enforced by the transport.** Known frames pass the implemented CRC routine, but `sendAndReceive()` currently dispatches a length-complete response without rejecting a bad CRC.
2. **Record index is effectively eight-bit in the current reader.** `INDEX_HIGH` is always zero.
3. **Command collisions exist across captures.** `0x42`, `0x43`, `0x56`, and `0x5C` have historical meanings that differ from current application usage.
4. **Wi-Fi DHCP payload length is firmware-dependent.** The generic setter sends only the mode byte; a captured sequence sends mode plus address fields.
5. **Unknown flag bits remain undocumented.** Bits `6` and `7` of the measurement flags byte are not interpreted.
6. **Command `0x98` is unidentified.** It appears at the end of captured Wi-Fi setup sequences.
7. **The specification is not vendor-authoritative.** Validate writes on a non-critical device before expanding command support.
