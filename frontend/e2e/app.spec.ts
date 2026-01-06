import { expect, test } from "@playwright/test";

test("home loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Родостория • Дигитално родословно дърво");
});

test("login page shows required fields", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.locator("input#email")).toBeVisible();
  await expect(page.locator("input#password")).toBeVisible();
  await expect(page.locator("button.login-button")).toBeVisible();
});

test("login page shows auth links", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.locator("a.register-link")).toBeVisible();
  await expect(page.locator("a.forgot-link")).toBeVisible();
});

test("register page shows required fields", async ({ page }) => {
  await page.goto("/auth/register");
  await expect(page.locator("input#email")).toBeVisible();
  await expect(page.locator("input#password")).toBeVisible();
  await expect(page.locator("input#confirmPassword")).toBeVisible();
  await expect(page.locator("button.login-button")).toBeVisible();
});

test("forgot password page shows email form", async ({ page }) => {
  await page.goto("/auth/forgot");
  await expect(page.locator("input#email")).toBeVisible();
  await expect(page.locator("button[type='submit']")).toBeVisible();
});

test("reset password page shows password fields", async ({ page }) => {
  await page.goto("/auth/reset");
  await expect(page.locator("input#new-pass")).toBeVisible();
  await expect(page.locator("input#conf-pass")).toBeVisible();
});

test("faq page renders accordion", async ({ page }) => {
  await page.goto("/faq");
  await expect(page.locator(".faq-title")).toBeVisible();
  await expect(page.locator("p-accordion")).toBeVisible();
});

test("privacy policy page renders sections", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.locator(".legal-title")).toBeVisible();
  await expect(page.locator(".legal-section").first()).toBeVisible();
});

test("cookie policy page renders table", async ({ page }) => {
  await page.goto("/cookies");
  await expect(page.locator(".legal-title")).toBeVisible();
  await expect(page.locator("table")).toBeVisible();
});

test("support page renders donation form", async ({ page }) => {
  await page.goto("/support");
  await expect(page.locator(".support-page__donation")).toBeVisible();
  await expect(page.locator("input[type='number']")).toBeVisible();
  await expect(page.locator("textarea")).toBeVisible();
  await expect(page.locator("button.support-page__submit")).toBeVisible();
});
