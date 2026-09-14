import { expect, test } from '@playwright/test';

test('shows the prototype landing screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hogune' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'ルーティンURLを開いて始めます' }),
  ).toBeVisible();
  await expect(page.getByText(/画像は表示せず/)).toBeVisible();
  await expect(page.locator('img')).toHaveCount(0);
});

test('plays the sound check and makes it available again', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '音を試す' }).click();
  await expect(
    page.getByRole('button', { name: '確認音を再生中' }),
  ).toBeDisabled();
  await expect(page.getByRole('button', { name: '音を試す' })).toBeEnabled({
    timeout: 10_000,
  });
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('does not allow an invalid routine to start', async ({ page }) => {
  await page.goto('/#/v1/30/5/FFF');
  await expect(
    page.getByRole('heading', { name: 'ルーティンを開始できません' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /スタート/ })).toHaveCount(0);
});
