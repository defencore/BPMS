export function calculateZoomMinRange(readingCount) {
    const count = Math.max(0, Number(readingCount) || 0);
    if (count <= 1) return 0;
    const fullRange = count - 1;
    return Math.min(fullRange, Math.max(2, Math.ceil(fullRange * 0.05)));
}
