import { getSettings } from '../core/settings-store.js';
import { state } from '../core/state.js';
import { formatDate, t } from '../i18n/i18n.js';
import { showAlert } from '../ui/alerts.js';
import { addToTerminal } from '../ui/terminal.js';
import { registerReportFonts } from './report/pdf-fonts.js';
import { createPdfWriter } from './report/pdf-writer.js';
import { buildReportModel } from './report/report-data.js';
import { formatReportRange, reportFilename } from './report/report-formatters.js';
import { writeReportSections } from './report/report-sections.js';

const PUBLIC_APP_URL = 'https://bpms.global.agency';

export async function exportResearchReport() {
    if (!state.measurements.length) {
        showAlert(t('report.no-data'), 'warning');
        return;
    }
    try {
        const model = buildReportModel({
            measurements: state.measurements,
            events: state.events,
            settings: getSettings(),
            deviceInfo: state.deviceInfo
        });
        const pdf = await createResearchReportDocument(model);
        const filename = reportFilename(model);
        pdf.save(filename);
        addToTerminal(`PDF: ${filename}`, 'system');
        showAlert(t('report.saved'), 'success');
    } catch (error) {
        console.error('PDF report generation failed:', error);
        showAlert(t('report.failed', { message: error.message }), 'danger');
    }
}

export async function createResearchReportDocument(model, PdfConstructor = window.jspdf.jsPDF) {
    const pdf = new PdfConstructor({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
    await registerReportFonts(pdf);
    const writer = createPdfWriter(pdf, t('report.title'));
    writer.cover({
        title: t('report.title'),
        subtitle: t('report.subtitle'),
        notice: t('report.notice'),
        patient: model.deviceInfo.username
            ? { label: t('report.patient-name'), value: model.deviceInfo.username }
            : null,
        range: { label: t('report.range'), value: formatReportRange(model.range) },
        generated: { label: t('report.generated'), value: formatDate(new Date(), { dateStyle: 'medium', timeStyle: 'short' }) },
        site: { label: t('report.website'), value: PUBLIC_APP_URL, url: PUBLIC_APP_URL }
    });
    writeReportSections(writer, model);
    writer.finalize(t('report.footer'));
    setDocumentProperties(pdf, model);
    return pdf;
}

function setDocumentProperties(pdf, model) {
    pdf.setProperties({
        title: t('report.title'),
        subject: t('report.subtitle'),
        author: 'BPMS',
        creator: 'BPMS',
        keywords: `BPMS, ABPM, blood pressure, ${model.quality.recorded} measurements`
    });
}
