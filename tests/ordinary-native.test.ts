import { assert } from "./support.ts";
Deno.test("ordinary native Quarto PDF keeps exercises and solutions outside the bank", async () => {
  const root = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      root + "/ordinary.qmd",
      `---
format: typst
---

# Ordinary page

::: {#exr-ordinary}
ORDINARY_CONDITION without Course difficulty or time.
:::

::: {#sol-ordinary}
ORDINARY_SOLUTION
:::
`,
    );
    const output = await new Deno.Command("quarto", {
      args: ["render", "ordinary.qmd", "--fail-if-warnings"],
      cwd: root,
      stdout: "piped",
      stderr: "piped",
    }).output();
    assert(output.success, new TextDecoder().decode(output.stderr));
    const text = await new Deno.Command("pdftotext", {
      args: [root + "/ordinary.pdf", "-"],
      stdout: "piped",
    }).output();
    const contents = new TextDecoder().decode(text.stdout);
    assert(
      text.success && contents.includes("ORDINARY_CONDITION") &&
        contents.includes("ORDINARY_SOLUTION"),
      "ordinary native PDF lost authored content",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
