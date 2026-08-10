import { normalizeEvent } from './event-schema.js';
import { eventDateTimeFromMeasurement, measurementAnchorKey } from './measurement-context.js';
import { replaceEvents, state } from './state.js';

export function replaceMeasurementEvents(previousAnchorKey, measurement, drafts) {
    const anchorMeasurementKey = measurementAnchorKey(measurement);
    const retained = previousAnchorKey
        ? state.events.filter(event => event.anchorMeasurementKey !== previousAnchorKey)
        : state.events;
    const linked = drafts.map((draft, index) => normalizeEvent({
        ...draft,
        id: crypto.randomUUID(),
        datetime: eventDateTimeFromMeasurement(measurement, draft.offsetMinutes),
        anchorMeasurementKey,
        edited: false,
        editedAt: null
    }, index));
    replaceEvents([...retained, ...linked]);
    return linked;
}

export function deleteMeasurementEvents(measurement) {
    const anchorMeasurementKey = measurementAnchorKey(measurement);
    const removed = state.events.filter(event => event.anchorMeasurementKey === anchorMeasurementKey);
    if (removed.length) replaceEvents(state.events.filter(event => event.anchorMeasurementKey !== anchorMeasurementKey));
    return removed;
}
