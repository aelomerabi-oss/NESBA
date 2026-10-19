/*
 * Open pages of the running web app in Chrome, save a screenshot of each and
 * report any page errors or console errors.
 *
 *   npm run shots                      # default pages, phone size
 *   npm run shots -- /courses /login   # specific pages
 *   npm run shots -- --desktop --dark /
 *
 * Start the app first (npm run web). Screenshots go to ./screenshots.
 * Uses the Chrome installed on this computer, so no browser download.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
// Git Bash on Windows rewrites "/courses" to "C:/Program Files/Git/courses";
// undo that, and allow routes without the leading slash.
const routes = args
  .filter((a) => !a.startsWith('--'))
  .map((a) => {
    const mangled = a.match(/\/Git(\/.*)$/);
    if (mangled) return mangled[1];
    return a.startsWith('/') ? a : `/${a}`;
  });

const BASE = process.env.APP_URL || 'http://localhost:8081';
const OUT = path.resolve('screenshots');
const viewport = flags.has('--desktop') ? { width: 1280, height: 860 } : { width: 390, height: 844 };
const theme = flags.has('--dark') ? 'dark' : 'light';

const DEFAULT_ROUTES = ['/', '/courses', '/learn', '/live', '/profile', '/login', '/projects', '/tutoring', '/privacy'];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport });

await context.addInitScript((name) => {
  try {
    localStorage.setItem('nesba-theme', name);
  } catch {
    // Storage blocked: the default theme is used.
  }
}, theme);

let failures = 0;

for (const route of routes.length ? routes : DEFAULT_ROUTES) {
  const page = await context.newPage();
  const errors = [];

  page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`);
  });

  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  const file = path.join(OUT, `${theme}-${viewport.width}${route.replace(/[^a-z0-9]+/gi, '_') || '_home'}.png`);
  await page.screenshot({ path: file, fullPage: true });

  if (errors.length) failures += 1;
  console.log(`${errors.length ? '✗' : '✓'} ${route} -> ${path.relative(process.cwd(), file)}`);
  errors.forEach((e) => console.log(`    ${e}`));

  await page.close();
}

await browser.close();
process.exit(failures ? 1 : 0);
