import { describe, expect, test } from "bun:test";
import {
  checkProvenance,
  parseAmadeusWork,
  type ProvenanceInput,
  type ProvenanceViolation,
  renderProvenanceRemediation,
} from "../../plugins/github-pr-convergence/tools/pr-convergence-provenance.ts";
import {
  AMADEUS_WORK_FIELD_LABELS,
  AMADEUS_WORK_HEADING,
  PR_TITLE_PREFIX_PATTERN,
  canonicalUnitSlugs,
  renderPullRequestBody,
  renderPullRequestTitle,
} from "../../plugins/github-pr-convergence/tools/pr-convergence-presentation.ts";

const RECORD = "amadeus/spaces/default/intents/intent-a-00000001/";
const UUID = "00000000-0000-0000-0000-000000000001";
const TITLE = "[intent-a/bolt-1/unit-a] Add provenance checks";
const FIELD_LINES = [
  "- Intent: `intent-a`",
  "- Bolt: `bolt-1`",
  "- Unit: `unit-a`",
  `- Record: \`${RECORD}\``,
  `- UUID: \`${UUID}\``,
] as const;
const CANONICAL_BODY = [AMADEUS_WORK_HEADING, "", ...FIELD_LINES, ""].join("\n");

function input(overrides: Partial<ProvenanceInput> = {}): ProvenanceInput {
  return { title: TITLE, body: CANONICAL_BODY, record: RECORD, unit: "unit-a", ...overrides };
}

function violationsOf(candidate: ProvenanceInput): readonly ProvenanceViolation[] {
  const verdict = checkProvenance(candidate);
  expect(verdict.ok).toBe(false);
  if (verdict.ok) throw new Error("expected provenance violations");
  return verdict.violations;
}

describe("presentation provenance tokens", () => {
  test("canonicalizes a multi-Unit Bolt independently of input order", () => {
    expect(canonicalUnitSlugs(["unit-b", "unit-a"])).toEqual({
      ok: true,
      value: ["unit-a", "unit-b"],
    });
  });

  test("exports the canonical heading, readonly field tuple, and title-prefix contract", () => {
    expect(AMADEUS_WORK_HEADING).toBe("## Amadeus Work");
    expect(AMADEUS_WORK_FIELD_LABELS).toEqual(["Intent", "Bolt", "Unit", "Record", "UUID"]);
    expect(PR_TITLE_PREFIX_PATTERN.exec(TITLE)?.slice(1)).toEqual(["intent-a", "bolt-1", "unit-a"]);
  });

  test("keeps the existing writer bytes while rendering from canonical tokens", () => {
    const work = {
      intent: { name: "intent-a", recordPath: RECORD, uuid: UUID },
      bolt: "bolt-1",
      unit: "unit-a",
    };
    expect(renderPullRequestTitle("Add provenance checks", work)).toBe(TITLE);
    expect(renderPullRequestBody("Summary\n", work)).toBe(`Summary\n\n${CANONICAL_BODY}`);
  });

  test("renders one canonical provenance identity for every member of a multi-Unit Bolt", () => {
    const work = {
      intent: { name: "intent-a", recordPath: RECORD, uuid: UUID },
      bolt: "bolt-1",
      units: ["unit-b", "unit-a"],
    };
    expect(renderPullRequestTitle("Summary", work)).toBe("[intent-a/bolt-1/unit-a+unit-b] Summary");
    expect(renderPullRequestBody("", work)).toContain("- Unit: `unit-a,unit-b`");
    expect(checkProvenance({
      title: renderPullRequestTitle("Summary", work),
      body: renderPullRequestBody("", work),
      record: RECORD,
      unit: "unit-b",
      units: ["unit-b", "unit-a"],
    })).toEqual({ ok: true });
  });

  test("rejects empty, duplicate, malformed, and partial multi-Unit identities", () => {
    expect(canonicalUnitSlugs([]).ok).toBe(false);
    expect(canonicalUnitSlugs(["unit-a", "unit-a"]).ok).toBe(false);
    expect(canonicalUnitSlugs([""]).ok).toBe(false);
    const body = CANONICAL_BODY.replace("`unit-a`", "`unit-a,unit-b`");
    const verdict = checkProvenance({
      title: "[intent-a/bolt-1/unit-a+unit-b] Summary",
      body,
      record: RECORD,
      unit: "unit-a",
      units: ["unit-a", "unit-b", "unit-c"],
    });
    expect(verdict).toEqual({
      ok: false,
      violations: [
        { kind: "title-unit-mismatch", expected: "unit-a+unit-b+unit-c", actual: "unit-a+unit-b" },
        { kind: "unit-mismatch", expected: "unit-a,unit-b,unit-c", actual: "unit-a,unit-b" },
      ],
    });
  });
});

describe("parseAmadeusWork — bounded canonical section", () => {
  test("parses all five canonical fields from LF and CRLF bodies", () => {
    const expected = { intent: "intent-a", bolt: "bolt-1", unit: "unit-a", record: RECORD, uuid: UUID };
    expect(parseAmadeusWork(CANONICAL_BODY)).toEqual(expected);
    expect(parseAmadeusWork(CANONICAL_BODY.replaceAll("\n", "\r\n"))).toEqual(expected);
  });

  test("requires an exact, fence-external section heading", () => {
    expect(parseAmadeusWork(`prefix ${AMADEUS_WORK_HEADING}\n${FIELD_LINES.join("\n")}`)).toBeNull();
    expect(parseAmadeusWork(`\`\`\`md\n${CANONICAL_BODY}\`\`\``)).toBeNull();
  });

  test("an empty H2 ends the section before otherwise canonical fields", () => {
    expect(parseAmadeusWork([AMADEUS_WORK_HEADING, "", "##", ...FIELD_LINES].join("\n"))).toBeNull();
  });

  test("0–3-space, tab-separated, and empty H2 headings all end the section", () => {
    for (const boundary of ["## Other", " ## Other", "  ## Other", "   ## Other", "##\tOther", "##"]) {
      expect(parseAmadeusWork([AMADEUS_WORK_HEADING, boundary, ...FIELD_LINES].join("\n"))).toBeNull();
    }
  });

  test("a level-three heading and four-space indented code are not H2 boundaries", () => {
    for (const line of ["### Other", "    ## Other"]) {
      expect(parseAmadeusWork([AMADEUS_WORK_HEADING, line, ...FIELD_LINES].join("\n"))).not.toBeNull();
    }
  });

  test("fields after a later H2 cannot repair missing fields in the Amadeus section", () => {
    const body = [AMADEUS_WORK_HEADING, ...FIELD_LINES.slice(0, 2), "## Other", ...FIELD_LINES.slice(2)].join("\n");
    expect(parseAmadeusWork(body)).toBeNull();
  });

  test("a fenced fake missing field is ignored", () => {
    const body = [
      AMADEUS_WORK_HEADING,
      ...FIELD_LINES.slice(0, 4),
      "~~~text",
      FIELD_LINES[4],
      "~~~",
    ].join("\n");
    expect(parseAmadeusWork(body)).toBeNull();
  });

  test("accepts 0–3-space openers and a same-marker longer closer", () => {
    for (const indent of ["", " ", "  ", "   "]) {
      const body = [
        `${indent}\`\`\`language`,
        CANONICAL_BODY,
        `${indent}\`\`\`\`\t`,
        CANONICAL_BODY,
      ].join("\n");
      expect(parseAmadeusWork(body)).not.toBeNull();
    }
  });

  test("four-space indented markers do not open a fence", () => {
    expect(parseAmadeusWork(["    ```", CANONICAL_BODY].join("\n"))).not.toBeNull();
  });

  test("an unclosed fence keeps every later token fenced through EOF", () => {
    expect(parseAmadeusWork(["```", CANONICAL_BODY].join("\n"))).toBeNull();
  });

  test("a different marker and a shorter run do not close the fence", () => {
    const wrongMarker = ["~~~~", "```", CANONICAL_BODY, "~~~~"].join("\n");
    const shortRun = ["````", "```", CANONICAL_BODY, "````"].join("\n");
    const trailingText = ["~~~", "~~~ trailing", CANONICAL_BODY, "~~~"].join("\n");
    expect(parseAmadeusWork(wrongMarker)).toBeNull();
    expect(parseAmadeusWork(shortRun)).toBeNull();
    expect(parseAmadeusWork(trailingText)).toBeNull();
  });

  test("takes the first exact occurrence of each field and rejects malformed values", () => {
    const body = [
      AMADEUS_WORK_HEADING,
      "- Intent: ``",
      "- Intent: `intent-a`",
      "- Intent: `intent-b`",
      ...FIELD_LINES.slice(1),
    ].join("\n");
    expect(parseAmadeusWork(body)?.intent).toBe("intent-a");
    expect(parseAmadeusWork(CANONICAL_BODY.replace(FIELD_LINES[4], "- UUID: `bad`tick`"))).toBeNull();
    expect(parseAmadeusWork(CANONICAL_BODY.replace(FIELD_LINES[4], "- UUID: `bad\rvalue`"))).toBeNull();
  });
});

describe("checkProvenance — complete ordered verdict", () => {
  test("accepts the canonical writer output", () => {
    expect(checkProvenance(input())).toEqual({ ok: true });
  });

  test("requires a valid prefix at byte zero with three safe nonempty segments", () => {
    for (const title of [
      ` ${TITLE}`,
      "[/bolt-1/unit-a] summary",
      "[intent/a/bolt-1/unit-a] summary",
      "[intent-a/bolt-1/un]it] summary",
      "[intent-a/bolt-1/unit\na] summary",
      "[intent-a/bolt-1/unit\ra] summary",
    ]) {
      expect(violationsOf(input({ title }))[0]).toEqual({ kind: "title-prefix-missing" });
    }
  });

  test("reports a title unit mismatch with expected and actual values", () => {
    expect(violationsOf(input({ title: "[intent-a/bolt-1/unit-b] Summary" }))).toEqual([
      { kind: "title-unit-mismatch", expected: "unit-a", actual: "unit-b" },
      { kind: "title-body-inconsistent", segment: "unit" },
    ]);
  });

  test("distinguishes a missing section from missing fields", () => {
    expect(violationsOf(input({ body: "No provenance here" }))).toEqual([{ kind: "work-section-missing" }]);
    expect(violationsOf(input({ body: [AMADEUS_WORK_HEADING, FIELD_LINES[1]].join("\n") }))).toEqual([
      { kind: "work-field-missing", field: "Intent" },
      { kind: "work-field-missing", field: "Unit" },
      { kind: "work-field-missing", field: "Record" },
      { kind: "work-field-missing", field: "UUID" },
    ]);
  });

  test("does not accept a fully canonical section hidden in a fence", () => {
    expect(violationsOf(input({ body: ["~~~md", CANONICAL_BODY, "~~~"].join("\n") }))).toEqual([
      { kind: "work-section-missing" },
    ]);
  });

  test("reports record and body-unit mismatches after field completeness", () => {
    expect(violationsOf(input({ record: "expected-record", unit: "expected-unit" }))).toEqual([
      { kind: "title-unit-mismatch", expected: "expected-unit", actual: "unit-a" },
      { kind: "record-mismatch", expected: "expected-record", actual: RECORD },
      { kind: "unit-mismatch", expected: "expected-unit", actual: "unit-a" },
    ]);
  });

  test("compares title and body Intent, Bolt, and Unit independently", () => {
    const body = CANONICAL_BODY
      .replace(FIELD_LINES[0], "- Intent: `intent-b`")
      .replace(FIELD_LINES[1], "- Bolt: `bolt-2`")
      .replace(FIELD_LINES[2], "- Unit: `unit-b`");
    expect(violationsOf(input({ body, unit: "unit-b" }))).toEqual([
      { kind: "title-unit-mismatch", expected: "unit-b", actual: "unit-a" },
      { kind: "title-body-inconsistent", segment: "intent" },
      { kind: "title-body-inconsistent", segment: "bolt" },
      { kind: "title-body-inconsistent", segment: "unit" },
    ]);
  });

  test("collects all violations in fixed order without deriving mismatches from missing values", () => {
    const body = [
      AMADEUS_WORK_HEADING,
      "- Intent: `intent-b`",
      "- Unit: `unit-b`",
      "- Record: `actual-record`",
    ].join("\n");
    expect(violationsOf(input({ title: "[intent-a/bolt-1/unit-a] Summary", body, record: "expected-record", unit: "unit-c" }))).toEqual([
      { kind: "title-unit-mismatch", expected: "unit-c", actual: "unit-a" },
      { kind: "work-field-missing", field: "Bolt" },
      { kind: "work-field-missing", field: "UUID" },
      { kind: "record-mismatch", expected: "expected-record", actual: "actual-record" },
      { kind: "unit-mismatch", expected: "unit-c", actual: "unit-b" },
      { kind: "title-body-inconsistent", segment: "intent" },
      { kind: "title-body-inconsistent", segment: "unit" },
    ]);
  });

  test("handles a long input deterministically", () => {
    const candidate = input({ body: `${"ordinary line\n".repeat(20_000)}${CANONICAL_BODY}` });
    const first = checkProvenance(candidate);
    expect(first).toEqual({ ok: true });
    expect(checkProvenance(candidate)).toEqual(first);
    expect(parseAmadeusWork(candidate.body)).toEqual(parseAmadeusWork(candidate.body));
  });
});

describe("renderProvenanceRemediation", () => {
  test("renders every violation kind with actionable detail", () => {
    const violations: readonly ProvenanceViolation[] = [
      { kind: "title-prefix-missing" },
      { kind: "title-unit-mismatch", expected: "unit-a", actual: "unit-b" },
      { kind: "work-section-missing" },
      { kind: "work-field-missing", field: "UUID" },
      { kind: "record-mismatch", expected: "record-a", actual: "record-b" },
      { kind: "unit-mismatch", expected: "unit-a", actual: "unit-b" },
      { kind: "title-body-inconsistent", segment: "bolt" },
    ];

    expect(renderProvenanceRemediation(violations)).toContain(
      [
        '- Title must start with "[intent/bolt/unit] " (the trailing space is required).',
        "- Title Unit mismatch: expected=unit-a actual=unit-b.",
        `- Body is missing ${AMADEUS_WORK_HEADING}.`,
        `- ${AMADEUS_WORK_HEADING} is missing UUID.`,
        "- Record mismatch: expected=record-a actual=record-b.",
        "- Body Unit mismatch: expected=unit-a actual=unit-b.",
        "- Title and body disagree on bolt.",
      ].join("\n"),
    );
  });

  test("is deterministic, keeps values single-line, and gives fixed body-file guidance", () => {
    const violation: ProvenanceViolation = {
      kind: "record-mismatch",
      expected: "want\nline\t\0\u009f",
      actual: "got\rdel\u007f",
    };
    const first = renderProvenanceRemediation([violation]);
    expect(renderProvenanceRemediation([violation])).toBe(first);
    expect(first).toContain("want\\nline\\t\\0\\u009f");
    expect(first).toContain("got\\rdel\\x7f");
    expect(renderProvenanceRemediation([{ ...violation, expected: "a\\nb", actual: "a\nb" }])).toContain(
      "expected=a\\\\nb actual=a\\nb.",
    );
    expect(first).toContain("gh pr edit --title ... --body-file ...");
    expect(first).not.toContain("want\nline");
    expect(first).not.toContain("got\rdel");
  });
});
