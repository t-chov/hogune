import { expect, test } from '@playwright/test';

test('shows the prototype landing screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hogune' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'ルーティンURLを開いて始めます' }),
  ).toBeVisible();
});

test('does not allow an invalid routine to start', async ({ page }) => {
  await page.goto('/#/v1/30/5/FFF');
  await expect(
    page.getByRole('heading', { name: 'ルーティンを開始できません' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /スタート/ })).toHaveCount(0);
});
