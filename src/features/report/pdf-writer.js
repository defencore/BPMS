const COLORS = Object.freeze({
    primary: [37, 99, 235],
    primaryDark: [30, 64, 175],
    text: [15, 23, 42],
    muted: [100, 116, 139],
    border: [203, 213, 225],
    surface: [248, 250, 252],
    header: [226, 232, 240],
    white: [255, 255, 255]
});

export function createPdfWriter(pdf, title) {
    return new PdfWriter(pdf, title);
}

class PdfWriter {
    constructor(pdf, title) {
        this.pdf = pdf;
        this.title = title;
        this.y = 14;
        this.margin = 14;
        this.contentWidth = 182;
        this.bottom = 282;
    }

    cover({ title, subtitle, notice, patient, range, generated, site }) {
        this.pdf.setFillColor(15, 23, 42);
        this.pdf.rect(0, 0, 210, 50, 'F');
        this.pdf.setFillColor(...COLORS.primary);
        this.pdf.rect(0, 0, 210, 3, 'F');
        this.pdf.setFont('DejaVuSans', 'bold');
        this.pdf.setTextColor(...COLORS.white);
        this.pdf.setFontSize(20);
        this.pdf.text(title, this.margin, 18, { maxWidth: this.contentWidth });
        this.pdf.setFontSize(10);
        this.pdf.setFont('DejaVuSans', 'normal');
        this.pdf.text(subtitle, this.margin, 29, { maxWidth: this.contentWidth });
        this.pdf.setFillColor(...COLORS.primaryDark);
        this.pdf.roundedRect(this.margin, 35, 117, 8, 2, 2, 'F');
        this.pdf.setFontSize(8);
        this.pdf.text(notice, this.margin + 3, 40.2, { maxWidth: 111 });
        this.pdf.setTextColor(125, 211, 252);
        this.pdf.textWithLink(site.value, this.margin + this.contentWidth, 40.2, { align: 'right', url: site.url });
        this.pdf.setTextColor(...COLORS.text);
        this.y = 60;
        if (patient) this.keyValue(patient.label, patient.value);
        this.keyValue(range.label, range.value);
        this.keyValue(generated.label, generated.value);
        this.keyValue(site.label, site.value);
        this.y += 2;
    }

    section(title) {
        this.ensure(14);
        this.y += 4;
        this.pdf.setFont('DejaVuSans', 'bold');
        this.pdf.setFontSize(12);
        this.pdf.setTextColor(...COLORS.primaryDark);
        this.pdf.setFillColor(...COLORS.primary);
        this.pdf.rect(this.margin, this.y - 3.8, 1.5, 5, 'F');
        this.pdf.text(title, this.margin + 4, this.y);
        this.pdf.setDrawColor(...COLORS.border);
        this.pdf.line(this.margin, this.y + 3, this.margin + this.contentWidth, this.y + 3);
        this.pdf.setTextColor(...COLORS.text);
        this.y += 9;
    }

    keyValue(label, value) {
        this.ensure(6);
        this.pdf.setFontSize(8.5);
        this.pdf.setFont('DejaVuSans', 'bold');
        this.pdf.text(`${label}:`, this.margin, this.y);
        const labelWidth = Math.min(52, this.pdf.getTextWidth(`${label}:`) + 3);
        this.pdf.setFont('DejaVuSans', 'normal');
        this.pdf.text(String(value), this.margin + labelWidth, this.y, { maxWidth: this.contentWidth - labelWidth });
        this.y += 5;
    }

    paragraph(text, { muted = false, size = 8.5 } = {}) {
        this.pdf.setFont('DejaVuSans', 'normal');
        this.pdf.setFontSize(size);
        this.pdf.setTextColor(...(muted ? COLORS.muted : COLORS.text));
        const lines = this.pdf.splitTextToSize(String(text), this.contentWidth);
        const height = lines.length * 4.1 + 2;
        this.ensure(height);
        this.pdf.text(lines, this.margin, this.y);
        this.y += height;
        this.pdf.setTextColor(...COLORS.text);
    }

    statCards(items, { columns = 4 } = {}) {
        const gap = 3;
        const width = (this.contentWidth - gap * (columns - 1)) / columns;
        const rows = Math.ceil(items.length / columns);
        this.ensure(rows * 20 + Math.max(0, rows - 1) * gap);
        items.forEach((item, index) => {
            const column = index % columns;
            const row = Math.floor(index / columns);
            const x = this.margin + column * (width + gap);
            const y = this.y + row * 23;
            this.pdf.setFillColor(...COLORS.surface);
            this.pdf.setDrawColor(...COLORS.border);
            this.pdf.roundedRect(x, y, width, 20, 2, 2, 'FD');
            this.pdf.setFillColor(...COLORS.primary);
            this.pdf.roundedRect(x, y, width, 1.4, 1, 1, 'F');
            this.pdf.setFont('DejaVuSans', 'normal');
            this.pdf.setFontSize(7);
            this.pdf.setTextColor(...COLORS.muted);
            this.pdf.text(this.pdf.splitTextToSize(item.label, width - 5).slice(0, 2), x + 2.5, y + 5);
            this.pdf.setFont('DejaVuSans', 'bold');
            this.pdf.setFontSize(12);
            this.pdf.setTextColor(...COLORS.text);
            this.pdf.text(String(item.value), x + 2.5, y + 16, { maxWidth: width - 5 });
        });
        this.y += rows * 23 + 2;
    }

    table(columns, rows, { fontSize = 7.2 } = {}) {
        const widths = columns.map(column => column.width);
        const header = columns.map(column => column.label);
        this.drawTableRow(header, widths, { header: true, fontSize });
        for (const [rowIndex, row] of rows.entries()) {
            const values = columns.map(column => row[column.key] ?? '');
            const height = this.tableRowHeight(values, widths, fontSize);
            if (this.y + height > this.bottom) {
                this.addContentPage();
                this.drawTableRow(header, widths, { header: true, fontSize });
            }
            this.drawTableRow(values, widths, { fontSize, height, alternate: rowIndex % 2 === 1 });
        }
        this.y += 3;
    }

    link(label, url) {
        this.ensure(6);
        this.pdf.setFont('DejaVuSans', 'normal');
        this.pdf.setFontSize(8);
        this.pdf.setTextColor(...COLORS.primary);
        this.pdf.textWithLink(label, this.margin, this.y, { url });
        this.pdf.setTextColor(...COLORS.text);
        this.y += 5;
    }

    ensure(height) {
        if (this.y + height <= this.bottom) return;
        this.addContentPage();
    }

    pageBreak() {
        this.addContentPage();
    }

    addContentPage() {
        this.pdf.addPage();
        this.pdf.setFont('DejaVuSans', 'bold');
        this.pdf.setFontSize(8);
        this.pdf.setTextColor(...COLORS.primaryDark);
        this.pdf.text(this.title, this.margin, 10, { maxWidth: this.contentWidth });
        this.pdf.setDrawColor(...COLORS.border);
        this.pdf.line(this.margin, 13, this.margin + this.contentWidth, 13);
        this.pdf.setTextColor(...COLORS.text);
        this.y = 20;
    }

    finalize(footerText) {
        const total = this.pdf.getNumberOfPages();
        for (let page = 1; page <= total; page += 1) {
            this.pdf.setPage(page);
            this.pdf.setDrawColor(...COLORS.border);
            this.pdf.line(this.margin, 288, this.margin + this.contentWidth, 288);
            this.pdf.setFont('DejaVuSans', 'normal');
            this.pdf.setFontSize(7);
            this.pdf.setTextColor(...COLORS.muted);
            this.pdf.text(footerText, this.margin, 293, { maxWidth: 145 });
            this.pdf.text(`${page} / ${total}`, 196, 293, { align: 'right' });
        }
    }

    tableRowHeight(values, widths, fontSize) {
        this.pdf.setFontSize(fontSize);
        const lines = values.map((value, index) => this.pdf.splitTextToSize(String(value), widths[index] - 3).length);
        return Math.max(7, Math.max(...lines) * 3.4 + 3);
    }

    drawTableRow(values, widths, { header = false, alternate = false, fontSize, height } = {}) {
        const rowHeight = height ?? this.tableRowHeight(values, widths, fontSize);
        let x = this.margin;
        values.forEach((value, index) => {
            this.pdf.setFillColor(...(header ? COLORS.header : alternate ? COLORS.surface : COLORS.white));
            this.pdf.setDrawColor(...COLORS.border);
            this.pdf.rect(x, this.y, widths[index], rowHeight, 'FD');
            this.pdf.setFont('DejaVuSans', header ? 'bold' : 'normal');
            this.pdf.setFontSize(fontSize);
            this.pdf.setTextColor(...COLORS.text);
            const lines = this.pdf.splitTextToSize(String(value), widths[index] - 3);
            this.pdf.text(lines, x + 1.5, this.y + 4.2);
            x += widths[index];
        });
        this.y += rowHeight;
    }
}
