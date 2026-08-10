import assert from 'node:assert/strict';
import test from 'node:test';

import { applySeoToHtml, createRobotsText, createSeoMarkup, createSitemapXml } from '../scripts/seo.mjs';

const configuredSite = Object.freeze({
    siteUrl: 'https://example.github.io/bpms/',
    title: 'BPMS — Blood Pressure Monitoring System',
    description: 'ABPM and blood pressure monitoring data explorer.',
    keywords: ['ABPM', 'BPMS', 'blood pressure'],
    socialImage: 'assets/social-preview-v8.png',
    googleAnalyticsId: 'G-ABC1234567',
    googleSiteVerification: 'verification-token'
});

test('SEO markup contains social previews, structured data, GA4, and Search Console verification', () => {
    const markup = createSeoMarkup(configuredSite);
    assert.match(markup, /property="og:image" content="https:\/\/example\.github\.io\/bpms\/assets\/social-preview-v8\.png"/u);
    assert.match(markup, /name="twitter:card" content="summary_large_image"/u);
    assert.match(markup, /name="keywords" content="ABPM, BPMS, blood pressure"/u);
    assert.match(markup, /name="google-site-verification" content="verification-token"/u);
    assert.match(markup, /googletagmanager\.com\/gtag\/js\?id=G-ABC1234567/u);
    assert.match(markup, /"@type":"WebApplication"/u);
});

test('optional Google integrations are omitted when not configured', () => {
    const markup = createSeoMarkup({ ...configuredSite, googleAnalyticsId: '', googleSiteVerification: '' });
    assert.doesNotMatch(markup, /googletagmanager|google-site-verification/u);
});

test('SEO block, robots, and sitemap use the canonical deployment URL', () => {
    const html = '<head><!-- BPMS:SEO:START --><meta name="old"><!-- BPMS:SEO:END --></head>';
    const rendered = applySeoToHtml(html, configuredSite);
    assert.match(rendered, /rel="canonical" href="https:\/\/example\.github\.io\/bpms\/"/u);
    assert.equal(createRobotsText(configuredSite), 'User-agent: *\nAllow: /\nSitemap: https://example.github.io/bpms/sitemap.xml\n');
    assert.match(createSitemapXml(configuredSite), /<loc>https:\/\/example\.github\.io\/bpms\/<\/loc>/u);
});
