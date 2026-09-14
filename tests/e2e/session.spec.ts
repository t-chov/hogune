import { expect, test } from '@playwright/test';

test('plays instructions, holds, transitions and completes using the real MP3s', async ({
  page,
}) => {
  test.setTimeout(100_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/v1/5/10/00D00E');
  await expect(
    page.getByRole('heading', { name: '2種目のストレッチ' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'スタート', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('準備・音声案内');
  await expect(page.getByRole('status')).toHaveText('ストレッチ', {
    timeout: 35_000,
  });
  await page.getByRole('button', { name: '一時停止', exact: true }).click();
  const frozen = await page.getByRole('timer').textContent();
  await expect(page.getByRole('status')).toHaveText('一時停止中');
  await page.waitForTimeout(1100);
  await expect(page.getByRole('timer')).toHaveText(frozen ?? '');
  await page.getByRole('button', { name: '再開', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('ストレッチ', {
    timeout: 5000,
  });
  await expect(page.getByRole('status')).toHaveText('休憩・次の種目の準備', {
    timeout: 7000,
  });
  await expect(
    page.getByRole('heading', { name: '股関節の前のストレッチ、左' }),
  ).toBeVisible();
  // The next hold starts after 10 seconds although its speech is ~26 seconds.
  await expect(page.getByRole('status')).toHaveText('ストレッチ', {
    timeout: 12_000,
  });
  await expect(
    page.getByRole('heading', { name: 'おつかれさまでした' }),
  ).toBeVisible({ timeout: 7000 });
  await page.getByRole('button', { name: 'もう一度' }).click();
  await expect(
    page.getByRole('button', { name: 'スタート', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('handles missing audio and retries', async ({ page }) => {
  await page.route('**/exercises/00D/voice.mp3', (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.goto('/#/v1/5/0/00D');
  await page.getByRole('button', { name: 'スタート', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    '音声を読み込めませんでした',
  );
  await page.unroute('**/exercises/00D/voice.mp3');
  await page.getByRole('button', { name: 'スタート', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('準備・音声案内');
});

test('pauses when hidden, confirms ending, persists mute and resets on URL change', async ({
  page,
}) => {
  await page.goto('/#/v1/5/0/00D');
  await page.getByRole('button', { name: 'ミュートする' }).click();
  await page.getByRole('button', { name: 'スタート', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('準備・音声案内');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('status')).toHaveText('一時停止中');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.getByRole('button', { name: 'セッションを終了' }).click();
  await expect(page.getByRole('group', { name: '終了の確認' })).toBeVisible();
  await page.getByRole('button', { name: '戻る', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('一時停止中');
  await page.getByRole('button', { name: '再開', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('準備・音声案内');
  await page.getByRole('button', { name: 'セッションを終了' }).click();
  await page.getByRole('button', { name: '終了する', exact: true }).click();
  await page.getByRole('button', { name: 'スタート', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('準備・音声案内');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('status')).toHaveText('一時停止中');
  await page.screenshot({
    path: test.info().outputPath('session-paused.png'),
    fullPage: true,
  });
  await page.evaluate(() => {
    window.location.hash = '#/v1/5/0/00E';
  });
  await expect(
    page.getByRole('button', { name: 'スタート', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '音声をオンにする' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'スタート', exact: true }),
  ).toBeVisible();
});
