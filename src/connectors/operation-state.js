let activeOperation = null;
const listeners = new Set();

export function isConnectorOperationBusy() {
    return activeOperation !== null;
}

export async function runConnectorOperation(name, action) {
    if (activeOperation) throw new Error(`Connector operation already in progress: ${activeOperation}`);
    activeOperation = name;
    notify();
    try {
        return await action();
    } finally {
        activeOperation = null;
        notify();
    }
}

export function onConnectorOperationChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function notify() {
    for (const listener of listeners) listener(activeOperation);
}
