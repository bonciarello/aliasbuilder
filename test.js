#!/usr/bin/env node
/**
 * Test suite per Alias Builder
 * Verifica che il server risponda correttamente e che i file SEO siano validi.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4601;
const HOST = '0.0.0.0';
const BASE = `http://127.0.0.1:${PORT}`;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } catch (e) {
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ============================================================
// 1. File existence tests
// ============================================================
console.log('\n📁 File existence:');
test('index.html exists', () => assert(fs.existsSync(path.join(__dirname, 'index.html'))));
test('robots.txt exists', () => assert(fs.existsSync(path.join(__dirname, 'robots.txt'))));
test('sitemap.xml exists', () => assert(fs.existsSync(path.join(__dirname, 'sitemap.xml'))));
test('server.js exists', () => assert(fs.existsSync(path.join(__dirname, 'server.js'))));

// ============================================================
// 2. HTML content checks
// ============================================================
console.log('\n📄 HTML structure:');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

test('has <!DOCTYPE html>', () => assert(/<!DOCTYPE\s+html/i.test(html)));
test('has lang="it"', () => assert(html.includes('lang="it"')));
test('has <meta name="viewport">', () => assert(/name="viewport"/.test(html)));
test('has <title>', () => assert(/<title>.*Alias Builder.*<\/title>/.test(html)));
test('has meta description', () => assert(/name="description"/.test(html)));
test('has canonical link', () => assert(html.includes('rel="canonical"')));
test('canonical points to cristianporco.it', () => assert(html.includes('cristianporco.it/app/aliasbuilder/')));
test('has og:title', () => assert(html.includes('og:title')));
test('has og:description', () => assert(html.includes('og:description')));
test('has og:type', () => assert(html.includes('og:type')));
test('has og:url', () => assert(html.includes('og:url')));
test('has JSON-LD schema', () => assert(html.includes('application/ld+json')));
test('has schema.org context', () => assert(html.includes('schema.org')));
test('has WebApplication type', () => assert(html.includes('WebApplication')));
test('has exactly one <h1>', () => {
  const matches = html.match(/<h1[\s>]/gi);
  assert(matches && matches.length === 1, `Expected 1 <h1>, found ${matches ? matches.length : 0}`);
});
test('has <header> landmark', () => assert(/<header[\s>]/.test(html)));
test('has <main> landmark', () => assert(/<main[\s>]/.test(html)));
test('has <footer> landmark', () => assert(/<footer[\s>]/.test(html)));
test('has <base href="./">', () => assert(html.includes('base href="./"')));
test('has Vue.js loaded', () => assert(html.includes('vue.global.prod.js') || html.includes('vue@3')));
test('has localStorage usage', () => assert(html.includes('localStorage')));
test('has aria-label usage', () => assert(html.includes('aria-label')));
test('has role="list" for saved aliases', () => assert(html.includes('role="list"')));
test('has <label> for inputs', () => assert((html.match(/<label\b/gi) || []).length >= 2));
test('mention of section-eyebrow CSS class', () => assert(html.includes('section-eyebrow')));

// ============================================================
// 3. robots.txt checks
// ============================================================
console.log('\n🤖 robots.txt:');
const robots = fs.readFileSync(path.join(__dirname, 'robots.txt'), 'utf-8');
test('has User-agent line', () => assert(robots.includes('User-agent:')));
test('has Allow line', () => assert(robots.includes('Allow:')));
test('has Sitemap line', () => assert(robots.includes('Sitemap:')));
test('Sitemap points to correct URL', () => assert(robots.includes('cristianporco.it/app/aliasbuilder/sitemap.xml')));

// ============================================================
// 4. sitemap.xml checks
// ============================================================
console.log('\n🗺  sitemap.xml:');
const sitemap = fs.readFileSync(path.join(__dirname, 'sitemap.xml'), 'utf-8');
test('has XML declaration', () => assert(sitemap.includes('<?xml')));
test('has <urlset>', () => assert(sitemap.includes('<urlset')));
test('has <url>', () => assert(sitemap.includes('<url>')));
test('has correct <loc>', () => assert(sitemap.includes('cristianporco.it/app/aliasbuilder/')));
test('has <lastmod>', () => assert(sitemap.includes('<lastmod>')));
test('has <changefreq>', () => assert(sitemap.includes('<changefreq>')));
test('has <priority>', () => assert(sitemap.includes('<priority>')));

// ============================================================
// 5. Server HTTP tests
// ============================================================
console.log('\n🌐 Server HTTP tests:');

function fetch(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

async function runHttpTests() {
  let res;

  try {
    res = await fetch('/');
    test('GET / returns 200', () => assert(res.status === 200));
    test('GET / has HTML content-type', () => assert(/text\/html/.test(res.headers['content-type'] || '')));
    test('GET / body contains <!DOCTYPE html>', () => assert(/<!DOCTYPE\s+html/i.test(res.body)));

    res = await fetch('/index.html');
    test('GET /index.html returns 200', () => assert(res.status === 200));

    res = await fetch('/robots.txt');
    test('GET /robots.txt returns 200', () => assert(res.status === 200));
    test('robots.txt content-type is text/plain', () => assert(/text\/plain/.test(res.headers['content-type'] || '')));

    res = await fetch('/sitemap.xml');
    test('GET /sitemap.xml returns 200', () => assert(res.status === 200));
    test('sitemap.xml content-type is xml', () => assert(/xml/.test(res.headers['content-type'] || '')));

    res = await fetch('/nonexistent.html');
    test('GET /nonexistent.html returns 404', () => assert(res.status === 404));

  } catch (e) {
    console.log(`  \x1b[31m✗\x1b[0m HTTP test error: ${e.message}`);
    failed++;
  }

  // ============================================================
  // Summary
  // ============================================================
  const total = passed + failed;
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Totale: ${total} test — ${passed} passati, ${failed} falliti`);
  console.log(`${'═'.repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runHttpTests();
