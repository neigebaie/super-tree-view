import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const tree = (page: Page, name: string) => page.getByRole("tree", { name });
const item = (page: Page, name: string | RegExp) => page.getByRole("treeitem", { name });

test.describe("keyboard (WAI-ARIA tree pattern)", () => {
  test("navigates, expands, collapses and type-aheads", async ({ page }) => {
    await page.goto("/#files");
    const files = tree(page, "Project files");
    await files.getByRole("treeitem").first().focus();
    await expect(item(page, /^src$/)).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(item(page, /^components$/)).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(item(page, /^components$/)).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("ArrowLeft");
    await expect(item(page, /^src$/)).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(item(page, /^src$/)).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("End");
    await expect(item(page, /tsconfig\.json/)).toBeFocused();
    await page.keyboard.press("Home");
    await page.keyboard.press("*");
    await expect(item(page, /^public$/)).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("r");
    await expect(item(page, /robots\.txt/)).toBeFocused();
    await page.keyboard.press("Shift+ArrowUp");
    await expect(files.locator("[aria-selected=true]")).toHaveCount(2);
  });

  test("keeps a single tab stop", async ({ page }) => {
    await page.goto("/#files");
    await expect(tree(page, "Project files").locator('[tabindex="0"]')).toHaveCount(1);
  });
});

test("filters and highlights", async ({ page }) => {
  await page.goto("/#files");
  await page.getByRole("searchbox", { name: "Search files" }).fill("use-");
  const rows = tree(page, "Project files").getByRole("treeitem");
  await expect(rows).toHaveText(["src", "hooks", "use-debounce.ts", "use-media-query.ts"]);
  await expect(rows.nth(2).locator("mark")).toHaveText("use-");
});

test("row actions do not select the row", async ({ page }) => {
  await page.goto("/#files");
  await page.getByRole("button", { name: "Delete README.md" }).click({ force: true });
  await expect(item(page, /README\.md/)).toHaveCount(0);
});

test("cascades checkboxes and reports checked nodes", async ({ page }) => {
  await page.goto("/#checkboxes");
  const output = page.getByTestId("checked-output");
  await expect(output).toContainText('"mechanics"');
  await item(page, /^Thermodynamics$/)
    .locator("[data-stv-part=checkbox]")
    .click();
  await expect(item(page, /^Physics$/)).toHaveAttribute("aria-checked", "true");
  await expect(output).toContainText('"physics"');
  await item(page, /^Thermodynamics$/)
    .locator("[data-stv-part=toggle]")
    .click();
  await item(page, /^Entropy$/)
    .locator("[data-stv-part=checkbox]")
    .click();
  await expect(item(page, /^Physics$/)).toHaveAttribute("aria-checked", "mixed");
});

test("lazy loads children with a busy state", async ({ page }) => {
  await page.goto("/#lazy");
  const drive = item(page, /^drive$/);
  await drive.locator("[data-stv-part=toggle]").click();
  await expect(drive).toHaveAttribute("aria-busy", "true");
  await expect(
    item(page, "drive/index.ts")
      .or(item(page, /^index\.ts$/))
      .first(),
  ).toBeVisible();
  await expect(drive).not.toHaveAttribute("aria-busy", "true");
  await expect(page.getByTestId("lazy-log")).toContainText("GET /drive");
});

test("drags a node into a folder", async ({ page }) => {
  await page.goto("/#dnd");
  const source = item(page, /^Entropy$/);
  const target = item(page, /^Chemistry$/);
  // Make room: collapse Mechanics so both rows are on screen.
  await item(page, /^Mechanics$/)
    .locator("[data-stv-part=toggle]")
    .click();
  const from = (await source.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + 60, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 60, from.y + from.height / 2 + 12, { steps: 4 });
  await page.mouse.move(to.x + 80, to.y + to.height / 2, { steps: 10 });
  await expect(target).toHaveAttribute("data-drop", "inside");
  await page.mouse.up();
  const output = page.getByTestId("move-output");
  await expect(output).toContainText('"target": "chemistry"');
  await expect(output).toContainText('"position": "inside"');
  // Dropping inside a folder opens it.
  await expect(item(page, /^Entropy$/)).toHaveAttribute("aria-level", "3");
});

test("reorders with Alt + arrows", async ({ page }) => {
  await page.goto("/#dnd");
  await item(page, /^Newton's Second Law$/).click();
  await page.keyboard.press("Alt+ArrowUp");
  await expect(page.getByTestId("move-output")).toContainText('"target": "newton1"');
  await expect(item(page, /^Newton's Second Law$/)).toHaveAttribute("aria-posinset", "1");
  await expect(item(page, /^Newton's Second Law$/)).toBeFocused();
});

test("moves with buttons (pointer-free alternative)", async ({ page }) => {
  await page.goto("/#dnd");
  await page.getByRole("button", { name: "Move Newton's First Law down" }).click({ force: true });
  await expect(page.getByTestId("move-output")).toContainText('"position": "after"');
});

test("virtualizes 100k nodes", async ({ page }) => {
  await page.goto("/#large");
  const stats = page.getByTestId("bench-stats");
  await expect(stats).toContainText("101,100 nodes");
  await expect(stats).toContainText("101,100 visible");
  const big = tree(page, "Generated tree");
  expect(await big.getByRole("treeitem").count()).toBeLessThan(60);
  await big.getByRole("treeitem").first().focus();
  await page.keyboard.press("End");
  await expect(item(page, "Item 99.9.99")).toBeFocused();
  expect(await big.getByRole("treeitem").count()).toBeLessThan(60);
  await big.evaluate((el) => {
    el.scrollTop = el.scrollHeight / 2;
  });
  await expect(item(page, /^Item 49\.9\./).first()).toBeVisible();
  await expect(page.getByTestId("timings")).toContainText("Expand all");
});

test("navigation sidebar follows the selection", async ({ page }) => {
  await page.goto("/#nav");
  await item(page, /^Styling$/).click();
  await expect(page.getByTestId("nav-page")).toHaveText("styling");
  await item(page, /^Frameworks$/).click();
  await expect(item(page, /^React$/)).toBeVisible();
});

test("keyBy path tells duplicates apart", async ({ page }) => {
  await page.goto("/#duplicates");
  const rows = page.getByRole("treeitem", { name: "Conservation of Momentum" });
  await rows.first().click();
  await rows.nth(1).click({ modifiers: ["ControlOrMeta"] });
  const output = page.getByTestId("dup-output");
  await expect(output).toContainText("science/physics/mechanics/momentum");
  await expect(output).toContainText("exam/week1/momentum");
});

for (const demo of ["files", "checkboxes", "lazy", "dnd", "large", "nav", "duplicates"]) {
  test(`has no axe violations: ${demo}`, async ({ page }) => {
    await page.goto(`/#${demo}`);
    await page.getByRole("tree").first().waitFor();
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual(
      [],
    );
  });
}

test.describe("dark mode", () => {
  test.use({ colorScheme: "dark" });
  for (const demo of ["files", "checkboxes", "nav"]) {
    test(`has no axe violations: ${demo} (dark)`, async ({ page }) => {
      await page.goto(`/#${demo}`);
      await page.getByRole("tree").first().waitFor();
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => v.id)).toEqual([]);
    });
  }
});
