import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

const baseUrl = process.env.LOVETREE_QA_BASE_URL || process.env.V4_BASE_URL || 'http://127.0.0.1:3000';
const route = '/design-lab/source-tracks/24/v1/donor';

test('Track24 donor route keeps the guided workflow interactive without demo persistence', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  try {
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    assert.ok(response?.ok(), `route HTTP ${response?.status()}`);
    assert.equal(await page.locator('nav button').count(), 4);

    await page.getByRole('button', { name: /장면의 의미를 붙입니다/ }).click();
    await page.getByRole('heading', { name: '장면의 의미를 붙입니다' }).waitFor();

    await page.getByRole('button', { name: /저장 전에 다시 봅니다/ }).click();
    await page.getByRole('heading', { name: '저장 전에 다시 봅니다' }).waitFor();

    await page.getByRole('button', { name: /LoveTree에서 이어갑니다/ }).click();
    await page.getByRole('link', { name: 'LoveTree에서 계속' }).waitFor();

    const href = await page.getByRole('link', { name: 'LoveTree에서 계속' }).getAttribute('href');
    assert.equal(href, '/v4');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `horizontal overflow ${overflow}px`);
    assert.deepEqual(runtimeErrors, []);
  } finally {
    await context.close();
    await browser.close();
  }
});

test('Track24 donor route remains operable under reduced motion', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    assert.ok(response?.ok(), `route HTTP ${response?.status()}`);
    await page.getByRole('button', { name: /기억을 고릅니다/ }).focus();
    assert.equal(await page.getByRole('button', { name: /기억을 고릅니다/ }).evaluate((node) => node === document.activeElement), true);
  } finally {
    await context.close();
    await browser.close();
  }
});
