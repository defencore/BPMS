export function getActiveTabTarget(tabListSelector, fallbackTarget) {
    return document.querySelector(`${tabListSelector} [data-bs-target].active`)?.dataset.bsTarget ?? fallbackTarget;
}

export function activateTabTarget(target) {
    const trigger = [...document.querySelectorAll('[data-bs-target]')].find(element => element.dataset.bsTarget === target);
    if (!trigger) return false;
    if (globalThis.bootstrap?.Tab) bootstrap.Tab.getOrCreateInstance(trigger).show();
    else trigger.click();
    return true;
}
