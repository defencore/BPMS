export function downloadJSON(payload, filename) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, filename);
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export async function readJSONFile(file) {
    if (!(file instanceof File)) throw new TypeError('A file is required');
    if (file.size > 10 * 1024 * 1024) throw new TypeError('The file is larger than 10 MB');
    try {
        return JSON.parse(await file.text());
    } catch {
        throw new TypeError('The selected file is not valid JSON');
    }
}

export function datedFilename(prefix, extension) {
    return `${prefix}_${new Date().toISOString().slice(0, 10)}.${extension}`;
}
