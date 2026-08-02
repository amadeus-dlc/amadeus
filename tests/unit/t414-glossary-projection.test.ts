// t414 — glossary projection generator: the pure parsing/validation/render layer.
// covers: scripts/glossary-projection.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  parseManifest,
  parseTermTable,
  rebaseLinks,
  resolveCitedKey,
  renderKnowledgeSurface,
  renderTable,
  replaceMarkerSection,
  selectRows,
  termKey,
  toCoreTokens,
  validateCanonical,
} from "../../scripts/glossary-projection.ts";

const MANIFEST = [
  "## Projection Manifest",
  "",
  "```yaml",
  "projections:",
  "  protocol:",
  "    terms: [bolt]",
  "  reference:",
  "    terms: [bolt,",
  "            unit-of-work]",
  "  knowledge:",
  "    terms: all",
  "```",
].join("\n");

describe("termKey", () => {
  test("kebab-cases a plain English term", () => {
    expect(termKey("Unit of work")).toBe("unit-of-work");
  });

  test("drops a Japanese parenthetical so the JA row shares the English key", () => {
    expect(termKey("MCP server(MCP サーバー)")).toBe("mcp-server");
  });

  test("normalizes punctuation runs to a single separator", () => {
    expect(termKey("memory.md")).toBe("memory-md");
    expect(termKey("origin:bootstrap")).toBe("origin-bootstrap");
    expect(termKey("HUMAN_TURN")).toBe("human-turn");
    expect(termKey("AIDLC")).toBe("aidlc");
  });
});

describe("parseTermTable", () => {
  const table = [
    "# Glossary",
    "",
    "| Term | Definition |",
    "|------|-----------|",
    "| **Bolt** | One pass through Construction stages. |",
    "| **Unit of work** | An independently implementable piece. |",
    "",
    "## Projection Manifest",
  ].join("\n");

  test("extracts one row per definition line, in file order", () => {
    const rows = parseTermTable(table);
    expect(rows.map((r) => r.key)).toEqual(["bolt", "unit-of-work"]);
    expect(rows[0]!.term).toBe("Bolt");
    expect(rows[1]!.definition).toBe("An independently implementable piece.");
  });

  test("ignores the header separator and surrounding prose", () => {
    expect(parseTermTable("no table here\n| Term | Definition |\n|---|---|\n")).toEqual([]);
  });
});

describe("parseManifest", () => {
  test("reads each projection selector, joining a multi-line flow sequence", () => {
    const { manifest, violations } = parseManifest(MANIFEST);
    expect(violations).toEqual([]);
    expect(manifest.get("protocol")).toEqual({ kind: "subset", terms: ["bolt"] });
    expect(manifest.get("reference")).toEqual({ kind: "subset", terms: ["bolt", "unit-of-work"] });
    expect(manifest.get("knowledge")).toEqual({ kind: "all" });
  });

  test("reports a missing manifest section", () => {
    const { violations } = parseManifest("# Glossary\n");
    expect(violations.map((v) => v.code)).toEqual(["manifest-missing"]);
  });

  test("reports an unknown projection name", () => {
    const src = ["```yaml", "projections:", "  nowhere:", "    terms: all", "```"].join("\n");
    const { violations } = parseManifest(src);
    expect(violations.map((v) => v.code)).toEqual(["manifest-unknown-projection"]);
  });

  test("reports a duplicated projection name", () => {
    const src = [
      "```yaml",
      "projections:",
      "  protocol:",
      "    terms: [bolt]",
      "  protocol:",
      "    terms: [bolt]",
      "```",
    ].join("\n");
    const { violations } = parseManifest(src);
    expect(violations.map((v) => v.code)).toEqual(["manifest-duplicate-projection"]);
  });

  test("reports an unterminated flow sequence rather than truncating it", () => {
    const src = ["```yaml", "projections:", "  protocol:", "    terms: [bolt", "```"].join("\n");
    const { violations } = parseManifest(src);
    expect(violations.map((v) => v.code)).toEqual(["manifest-malformed-terms"]);
  });
});

describe("validateCanonical", () => {
  const en = [
    "| **Bolt** | One pass. |",
    "| **Unit of work** | A piece. |",
    "",
    MANIFEST,
  ].join("\n");
  const ja = ["| **Bolt** | 1 回の通過。 |", "| **Unit of work(作業単位)** | 一片。 |"].join("\n");

  test("accepts a consistent canonical pair", () => {
    expect(validateCanonical(en, ja)).toEqual([]);
  });

  test("reports keys present on only one side", () => {
    const codes = validateCanonical(en, "| **Bolt** | 1 回の通過。 |").map((v) => v.code);
    expect(codes).toEqual(["en-ja-key-mismatch"]);
  });

  test("reports a duplicated term key in the canonical table", () => {
    const dupEn = ["| **Bolt** | a |", "| **Bolt** | b |", MANIFEST].join("\n");
    const dupJa = ["| **Bolt** | a |", "| **Bolt** | b |"].join("\n");
    expect(validateCanonical(dupEn, dupJa).map((v) => v.code)).toContain("canonical-duplicate-term");
  });

  test("reports a manifest term absent from the canonical table", () => {
    const badEn = ["| **Bolt** | a |", MANIFEST].join("\n");
    const badJa = "| **Bolt** | a |";
    expect(validateCanonical(badEn, badJa).map((v) => v.code)).toContain("manifest-unknown-term");
  });

  test("reports a duplicated term inside one projection", () => {
    const src = ["```yaml", "projections:", "  protocol:", "    terms: [bolt, bolt]", "```"].join(
      "\n",
    );
    const dupEn = ["| **Bolt** | a |", src].join("\n");
    expect(validateCanonical(dupEn, "| **Bolt** | a |").map((v) => v.code)).toContain(
      "manifest-duplicate-term",
    );
  });

  test("reports an empty effective subset", () => {
    const src = ["```yaml", "projections:", "  protocol:", "    terms: []", "```"].join("\n");
    const emptyEn = ["| **Bolt** | a |", src].join("\n");
    expect(validateCanonical(emptyEn, "| **Bolt** | a |").map((v) => v.code)).toContain(
      "manifest-empty-subset",
    );
  });

  test("reports a harness placeholder leaking into the canonical glossary", () => {
    const leakEn = ["| **Bolt** | see {{HARNESS_DIR}}/x |", MANIFEST].join("\n");
    const leakJa = ["| **Bolt** | x |", "| **Unit of work(作業単位)** | 一片。 |"].join("\n");
    const enOk = ["| **Bolt** | ok |", "| **Unit of work** | A piece. |", MANIFEST].join("\n");
    expect(validateCanonical(enOk, leakJa)).toEqual([]);
    expect(validateCanonical(leakEn, leakJa).map((v) => v.code)).toContain("token-leak");
  });
});

describe("selectRows", () => {
  const rows = parseTermTable(
    ["| **Bolt** | a |", "| **Unit of work** | b |", "| **Phase** | c |"].join("\n"),
  );

  test("`all` keeps every row in canonical order", () => {
    expect(selectRows(rows, { kind: "all" }).map((r) => r.key)).toEqual([
      "bolt",
      "unit-of-work",
      "phase",
    ]);
  });

  test("a subset keeps canonical order, not manifest order", () => {
    const selected = selectRows(rows, { kind: "subset", terms: ["phase", "bolt"] });
    expect(selected.map((r) => r.key)).toEqual(["bolt", "phase"]);
  });
});

describe("renderTable", () => {
  test("emits a markdown table with the surface's own column labels", () => {
    const rows = parseTermTable("| **Bolt** | One pass. |");
    expect(renderTable(rows, ["用語", "定義"])).toBe(
      ["| 用語 | 定義 |", "|------|-----------|", "| **Bolt** | One pass. |"].join("\n"),
    );
  });
});

describe("toCoreTokens", () => {
  test("rewrites the neutral harness token to the core placeholder", () => {
    expect(toCoreTokens("under `<harness-dir>/scopes/` and `<harness-dir>/rules/`")).toBe(
      "under `{{HARNESS_DIR}}/scopes/` and `{{HARNESS_DIR}}/rules/`",
    );
  });
});

describe("replaceMarkerSection", () => {
  const wrapped = [
    "## 9. Terminology",
    "",
    "<!-- glossary:projection:begin protocol -->",
    "| Term | Definition |",
    "<!-- glossary:projection:end -->",
    "",
    "## 10. Next",
  ].join("\n");

  test("replaces only the body between the markers", () => {
    const result = replaceMarkerSection(wrapped, "protocol", "NEW");
    expect(result.violations).toEqual([]);
    expect(result.content).toBe(
      [
        "## 9. Terminology",
        "",
        "<!-- glossary:projection:begin protocol -->",
        "NEW",
        "<!-- glossary:projection:end -->",
        "",
        "## 10. Next",
      ].join("\n"),
    );
  });

  test("reports a missing marker pair", () => {
    const result = replaceMarkerSection("## 9. Terminology\n", "protocol");
    expect(result.violations.map((v) => v.code)).toEqual(["marker-missing"]);
    expect(result.content).toBeNull();
  });

  test("reports a duplicated marker pair", () => {
    const result = replaceMarkerSection([wrapped, wrapped].join("\n"), "protocol", "NEW");
    expect(result.violations.map((v) => v.code)).toEqual(["marker-duplicated"]);
  });

  test("reports an unclosed marker pair", () => {
    const result = replaceMarkerSection(
      "<!-- glossary:projection:begin protocol -->\n| Term | Definition |\n",
      "protocol",
      "NEW",
    );
    expect(result.violations.map((v) => v.code)).toEqual(["marker-missing"]);
    expect(result.content).toBeNull();
  });

  test("reports a nested begin marker", () => {
    const nested = [
      "<!-- glossary:projection:begin protocol -->",
      "<!-- glossary:projection:begin reference -->",
      "<!-- glossary:projection:end -->",
    ].join("\n");
    const result = replaceMarkerSection(nested, "protocol", "NEW");
    expect(result.violations.map((v) => v.code)).toEqual(["marker-nested"]);
  });
});

describe("renderKnowledgeSurface", () => {
  const rendered = renderKnowledgeSurface(parseTermTable("| **Bolt** | `<harness-dir>/x` |"));

  test("marks the file generated and names the canonical source", () => {
    expect(rendered).toContain("docs/guide/glossary.md");
    expect(rendered.split("\n")[0]).toContain("GENERATED");
  });

  test("substitutes the harness placeholder and ends with a trailing newline", () => {
    expect(rendered).toContain("| **Bolt** | `{{HARNESS_DIR}}/x` |");
    expect(rendered.endsWith("\n")).toBe(true);
  });
});

describe("rebaseLinks", () => {
  test("re-points a guide-relative link at a docs/reference surface", () => {
    expect(rebaseLinks("see [Scopes](05-scopes-and-depth.md).", "docs/reference")).toBe(
      "see [Scopes](../guide/05-scopes-and-depth.md).",
    );
  });

  test("normalizes a link that already climbs out of the guide", () => {
    expect(rebaseLinks("[Engine](../reference/17-skill-system.md)", "docs/reference")).toBe(
      "[Engine](17-skill-system.md)",
    );
  });

  test("keeps the fragment attached to the rebased path", () => {
    expect(
      rebaseLinks("[Levels](05-scopes-and-depth.md#the-3-test-strategy-levels)", "docs/reference"),
    ).toBe("[Levels](../guide/05-scopes-and-depth.md#the-3-test-strategy-levels)");
  });

  test("renders repo-root-relative paths for a core surface", () => {
    expect(rebaseLinks("[Codex](harnesses/codex-cli.md)", ".")).toBe(
      "[Codex](docs/guide/harnesses/codex-cli.md)",
    );
    expect(rebaseLinks("[MCP](../reference/14-claude-features.md#mcp-servers)", ".")).toBe(
      "[MCP](docs/reference/14-claude-features.md#mcp-servers)",
    );
  });

  test("leaves absolute URLs and bare fragments alone", () => {
    const text = "[site](https://example.com/a.md) and [here](#anchor)";
    expect(rebaseLinks(text, "docs/reference")).toBe(text);
  });
});

describe("validateCanonical — subset reference closure", () => {
  const table = [
    "| **Bolt** | Bundles a **Unit of work**. |",
    "| **Unit of work** | An independently implementable piece. |",
    "| **Phase** | A grouping. |",
  ].join("\n");
  const manifestFor = (terms: string) =>
    ["```yaml", "projections:", "  protocol:", `    terms: ${terms}`, "```"].join("\n");

  test("accepts a subset that contains every term its definitions cite", () => {
    const en = [table, manifestFor("[bolt, unit-of-work]")].join("\n");
    expect(validateCanonical(en, table)).toEqual([]);
  });

  test("reports a cited term that the subset omits", () => {
    const en = [table, manifestFor("[bolt]")].join("\n");
    const found = validateCanonical(en, table).filter((v) => v.code === "subset-reference-unclosed");
    expect(found.length).toBe(1);
    expect(found[0]!.detail).toContain("unit-of-work");
    expect(found[0]!.detail).toContain("bolt");
  });

  test("ignores bold text that is not a glossary term", () => {
    const prose = "| **Phase** | Emphasis on **not a term** here. |";
    const en = [prose, manifestFor("[phase]")].join("\n");
    expect(validateCanonical(en, prose)).toEqual([]);
  });

  test("reports a cited term that the subset omits when the citation is plural", () => {
    const plural = [
      "| **Bolt** | Bundles several **Unit of works**. |",
      "| **Unit of work** | An independently implementable piece. |",
    ].join("\n");
    const en = [plural, manifestFor("[bolt]")].join("\n");
    const found = validateCanonical(en, plural).filter((v) => v.code === "subset-reference-unclosed");
    expect(found.length).toBe(1);
    expect(found[0]!.detail).toContain("unit-of-work");
  });
});

describe("resolveCitedKey", () => {
  const isTerm = (key: string) => ["rule", "sensor", "phase", "process"].includes(key);

  test("resolves a term cited in its own singular form", () => {
    expect(resolveCitedKey("Rule", isTerm)).toBe("rule");
  });

  test("resolves an -s plural back to the defined term", () => {
    expect(resolveCitedKey("Rules", isTerm)).toBe("rule");
    expect(resolveCitedKey("Sensors", isTerm)).toBe("sensor");
  });

  test("resolves an -es plural back to the defined term", () => {
    expect(resolveCitedKey("Processes", isTerm)).toBe("process");
  });

  test("resolves nothing for bold text whose singular forms are not terms", () => {
    expect(resolveCitedKey("MUST", isTerm)).toBeNull();
    expect(resolveCitedKey("Guidelines", isTerm)).toBeNull();
    expect(resolveCitedKey("Ses", isTerm)).toBeNull();
  });
});
