export async function registerReportFonts(pdf) {
    const { DEJAVU_SANS_REGULAR, DEJAVU_SANS_BOLD } = await import('../../vendor/dejavu-font-data.js');
    pdf.addFileToVFS('DejaVuSans.ttf', DEJAVU_SANS_REGULAR);
    pdf.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
    pdf.addFileToVFS('DejaVuSans-Bold.ttf', DEJAVU_SANS_BOLD);
    pdf.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');
    pdf.setFont('DejaVuSans', 'normal');
}
