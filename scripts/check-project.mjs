import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const sourceFiles = walk(join(root, 'src')).filter(file => extname(file) === '.js');
const projectJavaScriptFiles = [
    ...sourceFiles,
    ...walk(join(root, 'scripts')).filter(file => ['.js', '.mjs'].includes(extname(file))),
    ...walk(join(root, 'test')).filter(file => extname(file) === '.js')
];
const errors = [];
const sourceByFile = new Map();
const dependenciesByFile = new Map();

for (const file of sourceFiles) {
    const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (syntax.status !== 0) errors.push(syntax.stderr.trim());
    const source = readFileSync(file, 'utf8');
    sourceByFile.set(file, source);
    const relativeFile = file.slice(root.length + 1);
    const maxLines = relativeFile.startsWith('src/i18n/locales/') ? 900 : 320;
    const lineCount = source.split('\n').length;
    if (lineCount > maxLines) errors.push(`Module exceeds ${maxLines} lines (${lineCount}): ${relativeFile}`);
    const dependencies = [];
    for (const match of source.matchAll(/(?:import|export)\s+(?:[^'\"]+\s+from\s+)?['\"](\.[^'\"]+)['\"]/g)) {
        const dependency = resolve(dirname(file), match[1]);
        if (!existsSync(dependency)) errors.push(`Missing module: ${match[1]} imported by ${file.slice(root.length + 1)}`);
        else if (sourceFiles.includes(dependency)) dependencies.push(dependency);
    }
    dependenciesByFile.set(file, dependencies);
}

for (const file of sourceFiles) {
    try {
        await import(pathToFileURL(file));
    } catch (error) {
        errors.push(`Module import failed for ${file.slice(root.length + 1)}: ${error.message}`);
    }
}

const html = readFileSync(join(root, 'index.html'), 'utf8');
if (/\son\w+\s*=/.test(html)) errors.push('Inline event handlers are not allowed');
if (!html.includes('<script type="module" src="./src/main.js"></script>')) errors.push('Module entry point is missing');
if (/<script\s+src="(?!https?:|\.\/src\/main\.js)/.test(html)) errors.push('Unexpected local classic script found');

checkDomContracts(html, sourceByFile, errors);
checkImportCycles(dependenciesByFile, errors);
checkUnusedNamedExports(sourceByFile, projectJavaScriptFiles, errors);

if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
}
console.log(`Checked ${sourceFiles.length} JavaScript modules and index.html`);

function walk(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? walk(path) : [path];
    });
}

function checkDomContracts(html, sources, errors) {
    const htmlIds = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
    const duplicateIds = htmlIds.filter((id, index) => htmlIds.indexOf(id) !== index);
    if (duplicateIds.length) errors.push(`Duplicate HTML ids: ${[...new Set(duplicateIds)].join(', ')}`);

    // Controls may be declared in index.html or in feature-owned HTML templates.
    const renderedMarkup = [html, ...sources.values()].join('\n');
    const declaredIds = new Set([
        ...[...renderedMarkup.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]),
        ...[...renderedMarkup.matchAll(/inputField\(["']([^"']+)["']/g)].map(match => match[1])
    ]);
    for (const [file, source] of sources) {
        const references = [
            ...source.matchAll(/getElementById\(["']([^"']+)["']\)/g),
            ...source.matchAll(/querySelector\(["']#([A-Za-z][\w:-]*)["']\)/g)
        ];
        for (const match of references) {
            const id = match[1];
            if (!declaredIds.has(id)) {
                errors.push(`Missing DOM id #${id}, referenced by ${file.slice(root.length + 1)}`);
            }
        }
    }

    const labelTargets = [...html.matchAll(/<label\b[^>]*\bfor=["']([^"']+)["']/g)].map(match => match[1]);
    const missingLabelTargets = labelTargets.filter(id => !declaredIds.has(id));
    if (missingLabelTargets.length) {
        errors.push(`Labels reference missing controls: ${[...new Set(missingLabelTargets)].join(', ')}`);
    }
}

function checkUnusedNamedExports(sources, projectFiles, errors) {
    const projectText = projectFiles.map(file => readFileSync(file, 'utf8')).join('\n');
    for (const [file, source] of sources) {
        const exports = source.matchAll(/^export\s+(?:async\s+)?(?:function|class|const)\s+([A-Za-z_$][\w$]*)/gmu);
        for (const match of exports) {
            const name = match[1];
            const usageCount = [...projectText.matchAll(new RegExp(`\\b${name}\\b`, 'gu'))].length;
            if (usageCount === 1) errors.push(`Unused named export ${name} in ${file.slice(root.length + 1)}`);
        }
    }
}

function checkImportCycles(graph, errors) {
    const visiting = new Set();
    const visited = new Set();
    const stack = [];
    const reported = new Set();

    function visit(file) {
        if (visited.has(file)) return;
        if (visiting.has(file)) {
            const start = stack.indexOf(file);
            const cycle = [...stack.slice(start), file].map(item => item.slice(root.length + 1));
            const signature = [...new Set(cycle)].sort().join('|');
            if (!reported.has(signature)) {
                reported.add(signature);
                errors.push(`Circular module dependency: ${cycle.join(' -> ')}`);
            }
            return;
        }
        visiting.add(file);
        stack.push(file);
        for (const dependency of graph.get(file) ?? []) visit(dependency);
        stack.pop();
        visiting.delete(file);
        visited.add(file);
    }

    for (const file of graph.keys()) visit(file);
}
