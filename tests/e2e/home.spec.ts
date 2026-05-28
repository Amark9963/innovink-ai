import { expect, test } from "@playwright/test";

test("renders the enterprise landing shell", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Operational control for serious innovation programs.",
    }),
  ).toBeVisible();
});
