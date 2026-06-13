import { expect, test } from "@playwright/test";

test.describe("authentication routing", () => {
  test("redirects unauthenticated visitors from the app to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in to Flack" })).toBeVisible();
  });

  test("login page renders the sign-in form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Sign in to Flack" })).toBeVisible();
    await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
    await expect(page.getByPlaceholder("Minimum 6 characters")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Magic link" })).toBeVisible();
  });

  test("magic link mode hides the password field", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByPlaceholder("Minimum 6 characters")).toBeVisible();
    await page.getByRole("button", { name: "Magic link" }).click();

    await expect(page.getByPlaceholder("Minimum 6 characters")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send magic link" })).toBeVisible();
  });

  test("submit stays disabled until the form is valid", async ({ page }) => {
    await page.goto("/login");

    const submit = page.getByRole("button", { name: "Continue" });
    await expect(submit).toBeDisabled();

    await page.getByPlaceholder("you@company.com").fill("user@company.com");
    await page.getByPlaceholder("Minimum 6 characters").fill("123");
    await expect(submit).toBeDisabled();

    await page.getByPlaceholder("Minimum 6 characters").fill("supersecret");
    await expect(submit).toBeEnabled();
  });
});

test.describe("navigation between auth pages", () => {
  test("login links to signup and back", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: "Create one" }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { name: "Set up a workspace" })).toBeVisible();

    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("signup page renders the create-organization form", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByRole("heading", { name: "Set up a workspace" })).toBeVisible();
    await expect(page.getByPlaceholder("Acme Research")).toBeVisible();
    await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create organization" })).toBeDisabled();
  });
});
