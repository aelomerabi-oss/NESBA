/*
 * Form checks in Chrome: each form must show the right message for wrong
 * input. Nothing is created: sign-up is only tried with invalid input, and
 * the login test uses an address that has no account.
 *
 *   npm run test-forms
 *
 * Start the app first (npm run web).
 */
import { chromium } from 'playwright';

const BASE = process.env.APP_URL || 'http://localhost:8081';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

let failures = 0;

async function check(name, run) {
  try {
    await run();
    console.log(`✓ ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`✗ ${name}\n    ${error.message.split('\n')[0]}`);
  }
}

async function expectText(text) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 8000 });
}

async function open(route) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
}

// Login
await check('Login: empty form asks for an email', async () => {
  await open('/login');
  await page.getByText('Log In', { exact: true }).last().click();
  await expectText('Please enter your email address.');
});

await check('Login: invalid email is rejected', async () => {
  await open('/login');
  await page.getByPlaceholder('you@example.com').fill('not-an-email');
  await page.getByPlaceholder('Password').fill('whatever123');
  await page.getByText('Log In', { exact: true }).last().click();
  await expectText('Please enter a valid email address.');
});

await check('Login: wrong password shows a clear error', async () => {
  await open('/login');
  await page.getByPlaceholder('you@example.com').fill(`nobody-${Date.now()}@example.com`);
  await page.getByPlaceholder('Password').fill('wrong-password-123');
  await page.getByText('Log In', { exact: true }).last().click();
  await expectText('Incorrect email or password');
});

// Sign-up (never submitted with valid data)
const signupButton = () => page.getByText('Create Student Account', { exact: true });

await check('Sign-up: empty form asks for a name', async () => {
  await open('/signup/student');
  await signupButton().click();
  await expectText('Please enter your full name.');
});

await check('Sign-up: short password is rejected', async () => {
  await open('/signup/student');
  await page.getByPlaceholder('Your full name').fill('Test Person');
  await page.getByPlaceholder('you@example.com').fill('test@example.com');
  await page.getByPlaceholder('Create a password').fill('123');
  await page.getByPlaceholder('Enter your password again').fill('123');
  await signupButton().click();
  await expectText('at least 6 characters');
});

await check('Sign-up: different passwords are rejected', async () => {
  await open('/signup/student');
  await page.getByPlaceholder('Your full name').fill('Test Person');
  await page.getByPlaceholder('you@example.com').fill('test@example.com');
  await page.getByPlaceholder('Create a password').fill('abcdef123');
  await page.getByPlaceholder('Enter your password again').fill('abcdef999');
  await signupButton().click();
  await expectText('Passwords do not match');
});

// Other interactive pages
await check('Search: typing does not break the page', async () => {
  await open('/search');
  await page.locator('input').first().fill('business');
  await page.waitForTimeout(1500);
});

await check('FAQ: a question opens its answer', async () => {
  await open('/faq');
  await page.getByText('Is NESBA free?').click();
  await expectText('Creating an account is free');
});

await check('Workshop page: unknown workshop shows a friendly message', async () => {
  await open('/event/00000000-0000-0000-0000-000000000000');
  await expectText('not available any more');
});

await check('Home: visitors see the Join button', async () => {
  await open('/');
  await expectText('Join NESBA free');
});

await check('No page errors during the tests', async () => {
  if (pageErrors.length) throw new Error(pageErrors.join(' | '));
});

await browser.close();
console.log(failures ? `\n${failures} check(s) failed.` : '\nAll form checks passed.');
process.exitCode = failures ? 1 : 0;
