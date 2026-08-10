const SCHEDULE_SELECTOR = '.schedule-table';

export function initResponsiveLayout() {
    updateScheduleLabels();
    window.addEventListener('bpms:languagechange', updateScheduleLabels);
}

function updateScheduleLabels() {
    const table = document.querySelector(`${SCHEDULE_SELECTOR} table`);
    if (!table) return;

    const labels = [...table.querySelectorAll('thead th')].map(header => header.textContent.trim());
    table.querySelectorAll('tbody tr').forEach(row => {
        [...row.children].forEach((cell, index) => {
            cell.dataset.label = labels[index] ?? '';
        });
    });
}
