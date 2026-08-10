import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SEO_BLOCK = /<!-- BPMS:SEO:START -->[\s\S]*?<!-- BPMS:SEO:END -->/u;

export function loadSiteConfig(root, environment = process.env) {
    const raw = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
    const siteUrl = normalizeSiteUrl(environment.SITE_URL || raw.siteUrl || deriveGitHubPagesUrl(environment.GITHUB_REPOSITORY));
    const config = {
        siteUrl,
        title: requiredText(raw.title, 'title'),
        description: requiredText(raw.description, 'description'),
        keywords: normalizeKeywords(raw.keywords),
        socialImage: normalizeAssetPath(raw.socialImage, 'socialImage'),
        googleAnalyticsId: optionalText(environment.GA4_MEASUREMENT_ID || raw.googleAnalyticsId),
        googleSiteVerification: optionalText(environment.GOOGLE_SITE_VERIFICATION || raw.googleSiteVerification)
    };
    if (config.googleAnalyticsId && !/^G-[A-Z0-9]+$/u.test(config.googleAnalyticsId)) {
        throw new TypeError('googleAnalyticsId must use the GA4 G-XXXXXXXX format');
    }
    if (!existsSync(join(root, config.socialImage))) throw new Error(`Missing social preview image: ${config.socialImage}`);
    return Object.freeze(config);
}

export function applySeoToHtml(html, config) {
    if (!SEO_BLOCK.test(html)) throw new Error('index.html is missing the BPMS SEO marker block');
    return html.replace(SEO_BLOCK, createSeoMarkup(config));
}

export function createSeoMarkup(config) {
    const title = escapeHtml(config.title);
    const description = escapeHtml(config.description);
    const keywords = escapeHtml(config.keywords.join(', '));
    const siteUrl = config.siteUrl;
    const imageUrl = siteUrl ? new URL(config.socialImage, siteUrl).href : '';
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: config.title,
        alternateName: 'BPMS',
        description: config.description,
        applicationCategory: 'HealthApplication',
        operatingSystem: 'Any modern web browser',
        inLanguage: ['en', 'uk', 'ru'],
        ...(siteUrl ? { url: siteUrl } : {}),
        ...(imageUrl ? { image: imageUrl } : {})
    };
    const lines = [
        '<!-- BPMS:SEO:START -->',
        `    <meta name="description" content="${description}">`,
        `    <meta name="keywords" content="${keywords}">`,
        '    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">',
        '    <meta name="author" content="BPMS">',
        '    <meta name="theme-color" content="#4f46e5">',
        ...(siteUrl ? [`    <link rel="canonical" href="${escapeHtml(siteUrl)}">`] : []),
        '    <meta property="og:type" content="website">',
        `    <meta property="og:title" content="${title}">`,
        `    <meta property="og:description" content="${description}">`,
        '    <meta property="og:site_name" content="BPMS">',
        '    <meta property="og:locale" content="en_US">',
        '    <meta property="og:locale:alternate" content="uk_UA">',
        '    <meta property="og:locale:alternate" content="ru_RU">',
        ...(siteUrl ? [`    <meta property="og:url" content="${escapeHtml(siteUrl)}">`] : []),
        ...(imageUrl ? [
            `    <meta property="og:image" content="${escapeHtml(imageUrl)}">`,
            '    <meta property="og:image:width" content="1200">',
            '    <meta property="og:image:height" content="630">',
            '    <meta property="og:image:type" content="image/png">',
            '    <meta property="og:image:alt" content="BPMS blood pressure monitoring dashboard">'
        ] : []),
        '    <meta name="twitter:card" content="summary_large_image">',
        `    <meta name="twitter:title" content="${title}">`,
        `    <meta name="twitter:description" content="${description}">`,
        ...(imageUrl ? [`    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">`] : []),
        `    <script type="application/ld+json">${safeJson(structuredData)}</script>`,
        ...googleVerificationMarkup(config.googleSiteVerification),
        ...googleAnalyticsMarkup(config.googleAnalyticsId),
        '    <!-- BPMS:SEO:END -->'
    ];
    return lines.join('\n');
}

export function createRobotsText(config) {
    return ['User-agent: *', 'Allow: /', ...(config.siteUrl ? [`Sitemap: ${config.siteUrl}sitemap.xml`] : []), ''].join('\n');
}

export function createSitemapXml(config) {
    if (!config.siteUrl) return '';
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${escapeHtml(config.siteUrl)}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`;
}

function googleVerificationMarkup(token) {
    return token ? [`    <meta name="google-site-verification" content="${escapeHtml(token)}">`] : [];
}

function googleAnalyticsMarkup(id) {
    if (!id) return [];
    const safeId = escapeHtml(id);
    return [
        `    <script async src="https://www.googletagmanager.com/gtag/js?id=${safeId}"></script>`,
        '    <script>',
        '        window.dataLayer = window.dataLayer || [];',
        '        function gtag(){dataLayer.push(arguments);}',
        "        gtag('js', new Date());",
        `        gtag('config', '${safeId}', { anonymize_ip: true });`,
        '    </script>'
    ];
}

function deriveGitHubPagesUrl(repository) {
    if (!repository || !repository.includes('/')) return '';
    const [owner, name] = repository.split('/');
    return `https://${owner}.github.io/${name}/`;
}

function normalizeSiteUrl(value) {
    if (!value) return '';
    const url = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('siteUrl must use HTTP or HTTPS');
    url.hash = '';
    url.search = '';
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url.href;
}

function normalizeKeywords(value) {
    if (!Array.isArray(value) || value.length === 0) throw new TypeError('keywords must be a non-empty array');
    return [...new Set(value.map(keyword => requiredText(keyword, 'keyword')))];
}

function normalizeAssetPath(value, field) {
    const path = requiredText(value, field).replace(/^\.\//u, '');
    if (path.startsWith('/') || path.includes('..')) throw new TypeError(`${field} must be a project-relative path`);
    return path;
}

function requiredText(value, field) {
    const text = optionalText(value);
    if (!text) throw new TypeError(`${field} is required`);
    return text;
}

function optionalText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/gu, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function safeJson(value) {
    return JSON.stringify(value).replaceAll('<', '\\u003c');
}
