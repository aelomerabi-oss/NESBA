/*
 * Website check: opens every public page in Chrome as a visitor and reports
 *   - page errors and failed requests (broken links, images, scripts)
 *   - pages that fall through to "Page not found"
 *   - accessibility problems found by axe-core (missing labels, alt text,
 *     contrast, ...)
 *   - whether the page has its own browser-tab title
 *
 *   npm run check-site                 # all public pages
 *   npm run check-site -- --details    # also list every problem element
 *
 * Start the app first (npm run web).
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.env.APP_URL || 'http://localhost:8081';
const DETAILS = process.argv.includes('--details');

const PAGES = [
  '/', '/courses', '/live', '/learn', '/profile', '/tutoring', '/projects', '/projects/showcase',
  '/organizations', '/search', '/faq', '/terms', '/privacy', '/login', '/signup', '/signup/student',
  '/signup/teacher', '/signup/organization', '/reset-password', '/this-page-does-not-exist',
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

let problems = 0;

for (const route of PAGES) {
  const errors = [];
  const failed = [];

  const onError = (e) => errors.push(e.message);
  const onResponse = (r) => {
    if (r.status() >= 400 && !r.url().includes('/auth/v1/user')) failed.push(`${r.status()} ${r.url()}`);
  };
  page.on('pageerror', onError);
  page.on('response', onResponse);

  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const title = await page.title();
  const notFound = await page.getByText('This page does not exist').count();

  await page.addScriptTag({ content: axeSource });
  const axe = await page.evaluate(async () =>
    // eslint-disable-next-line no-undef
    (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      count: v.nodes.length,
      targets: v.nodes.slice(0, 5).map((n) => {
        const c = n.any[0]?.data;
        const text = (document.querySelector(n.target.join(' '))?.textContent || '').trim().slice(0, 50);
        return c?.contrastRatio ? `"${text}" ${c.fgColor} on ${c.bgColor} = ${c.contrastRatio} (needs ${c.expectedContrastRatio})` : `${n.target.join(' ')} "${text}"`;
      }),
    })),
  );

  page.off('pageerror', onError);
  page.off('response', onResponse);

  const expectedMissing = route === '/this-page-does-not-exist';
  const issues = [];
  if (errors.length) issues.push(`errors: ${errors.join(' | ')}`);
  if (failed.length) issues.push(`failed requests: ${failed.join(' | ')}`);
  if (notFound && !expectedMissing) issues.push('shows "Page not found"');
  if (!notFound && expectedMissing) issues.push('missing page does not show the 404 screen');
  if (title === 'NESBA' || !title) issues.push('no page title');

  const a11y = axe.reduce((sum, v) => sum + v.count, 0);
  problems += issues.length + a11y;

  console.log(`${issues.length || a11y ? '✗' : '✓'} ${route}  "${title}"  accessibility issues: ${a11y}`);
  for (const issue of issues) console.log(`    ${issue}`);
  for (const v of axe) {
    console.log(`    [${v.impact}] ${v.id} ×${v.count}: ${v.help}`);
    if (DETAILS) v.targets.forEach((t) => console.log(`        ${t}`));
  }
}

await browser.close();
console.log(problems ? `\n${problems} problem(s) found.` : '\nAll pages passed.');
process.exitCode = problems ? 1 : 0;
