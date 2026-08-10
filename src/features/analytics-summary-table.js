import { formatNumber, t } from '../i18n/i18n.js';
import { escapeHtml } from '../ui/html.js';

export function renderAnalyticsSummaryTable(summaries) {
    const columns = [t('analytics.readings'), 'SBP', 'DBP', 'HR', 'PP', 'SD SBP', 'CV SBP', 'ARV SBP'];
    const rows = [
        ['full', summaries.full],
        ['day', summaries.day],
        ['night', summaries.night]
    ];
    return `<div class="analysis-table-wrap"><table class="table analysis-summary-table">
        <thead><tr><th>${t('analytics.period')}</th>${columns.map(label => `<th>${label}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(([period, summary]) => summaryRow(period, summary, columns)).join('')}</tbody>
    </table></div>`;
}

function summaryRow(period, summary, columns) {
    const values = [
        summary?.count ?? 0,
        number(summary?.systolic?.mean),
        number(summary?.diastolic?.mean),
        number(summary?.pulse?.mean),
        number(summary?.pulsePressure?.mean),
        number(summary?.systolic?.sd),
        `${number(summary?.systolic?.cv)}%`,
        number(summary?.systolic?.arv)
    ];
    return `<tr>
        <th data-label="${escapeHtml(t('analytics.period'))}">${t(`analytics.period.${period}`)}</th>
        ${values.map((value, index) => `<td data-label="${escapeHtml(columns[index])}">${value}</td>`).join('')}
    </tr>`;
}

function number(value, digits = 1) {
    return Number.isFinite(value)
        ? formatNumber(value, { maximumFractionDigits: digits, minimumFractionDigits: digits })
        : '—';
}
