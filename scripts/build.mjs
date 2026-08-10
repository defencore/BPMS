import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { applySeoToHtml, createRobotsText, createSitemapXml, loadSiteConfig } from './seo.mjs';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'dist');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const entry of ['index.html', 'styles', 'assets', 'src']) {
    cpSync(join(root, entry), join(output, entry), { recursive: true });
}
const siteConfig = loadSiteConfig(root);
const htmlPath = join(output, 'index.html');
const html = applySeoToHtml(readFileSync(htmlPath, 'utf8'), siteConfig);
writeFileSync(htmlPath, html);
writeFileSync(join(output, 'robots.txt'), createRobotsText(siteConfig));
const sitemap = createSitemapXml(siteConfig);
if (sitemap) writeFileSync(join(output, 'sitemap.xml'), sitemap);
for (const match of html.matchAll(/(?:src|href)="(\.[^"?#]+)["?#]/g)) {
    const target = join(output, match[1]);
    if (!existsSync(target)) throw new Error(`Build references a missing asset: ${match[1]}`);
}

validateModule(join(output, 'src/main.js'), new Set());
console.log(`Built GitHub Pages artifact at ${output}`);

function validateModule(file, visited) {
    if (visited.has(file)) return;
    if (!existsSync(file)) throw new Error(`Missing module: ${file}`);
    visited.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:import|export)\s+(?:[^'\"]+\s+from\s+)?['\"](\.[^'\"]+)['\"]/g)) {
        validateModule(resolve(dirname(file), match[1]), visited);
    }
}
