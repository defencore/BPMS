import { existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'dist');
const indexPath = join(output, 'index.html');
const errors = [];

for (const required of ['index.html', 'robots.txt', 'assets/favicon.svg', 'assets/social-preview-v8.png']) {
    if (!existsSync(join(output, required))) errors.push(`Missing deployment file: dist/${required}`);
}

const robotsPath = join(output, 'robots.txt');
if (existsSync(robotsPath) && /^Sitemap:/mu.test(readFileSync(robotsPath, 'utf8')) && !existsSync(join(output, 'sitemap.xml'))) {
    errors.push('robots.txt declares a sitemap, but dist/sitemap.xml is missing');
}

if (existsSync(indexPath)) {
    const html = readFileSync(indexPath, 'utf8');
    for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
        const reference = match[1];
        if (reference.startsWith('/')) {
            errors.push(`Root-absolute URL is not GitHub Pages subpath-safe: ${reference}`);
            continue;
        }
        if (isExternalReference(reference)) continue;
        const localPath = reference.split(/[?#]/u, 1)[0];
        if (localPath && !existsSync(join(output, localPath))) errors.push(`Missing referenced deployment asset: ${reference}`);
    }

    for (const stylesheet of html.matchAll(/\bhref=["']([^"']+\.css(?:[?#][^"']*)?)["']/g)) {
        checkCssReferences(stylesheet[1].split(/[?#]/u, 1)[0], errors);
    }
}

if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
}

console.log('Checked GitHub Pages artifact links and required files');

function isExternalReference(reference) {
    return /^(?:https?:|data:|mailto:|tel:|#)/u.test(reference);
}

function checkCssReferences(relativePath, errors) {
    const stylesheetPath = join(output, relativePath);
    if (!existsSync(stylesheetPath) || extname(stylesheetPath) !== '.css') return;
    const css = readFileSync(stylesheetPath, 'utf8');
    for (const match of css.matchAll(/url\((?:["']?)([^)'"\s]+)(?:["']?)\)/g)) {
        const reference = match[1];
        if (isExternalReference(reference) || reference.startsWith('/')) continue;
        const assetPath = resolve(stylesheetPath, '..', reference.split(/[?#]/u, 1)[0]);
        if (!existsSync(assetPath)) errors.push(`Missing CSS asset referenced by ${relativePath}: ${reference}`);
    }
}
