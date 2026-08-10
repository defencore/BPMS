import { HEADER_SERIAL } from '../../core/constants.js';
import { isValidSerialFrame } from './serial-codec.js';

const MIN_PACKET_LENGTH = 5;

export class PacketBuffer {
    #bytes = new Uint8Array(0);

    push(chunk) {
        const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
        this.#bytes = concat(this.#bytes, bytes);
        const packets = [];

        while (this.#bytes.length >= MIN_PACKET_LENGTH) {
            const headerIndex = this.#bytes.indexOf(HEADER_SERIAL);
            if (headerIndex < 0) {
                this.clear();
                break;
            }
            if (headerIndex > 0) this.#bytes = this.#bytes.slice(headerIndex);
            if (this.#bytes.length < MIN_PACKET_LENGTH) break;

            const packetLength = this.#bytes[1];
            if (packetLength < MIN_PACKET_LENGTH) {
                this.#bytes = this.#bytes.slice(1);
                continue;
            }
            if (this.#bytes.length < packetLength) break;

            const candidate = this.#bytes.slice(0, packetLength);
            if (isValidSerialFrame(candidate)) {
                packets.push(candidate);
                this.#bytes = this.#bytes.slice(packetLength);
                continue;
            }
            this.#bytes = this.#bytes.slice(1);
        }

        return packets;
    }

    clear() {
        this.#bytes = new Uint8Array(0);
    }

    get pendingByteCount() {
        return this.#bytes.length;
    }
}

function concat(left, right) {
    const result = new Uint8Array(left.length + right.length);
    result.set(left);
    result.set(right, left.length);
    return result;
}
