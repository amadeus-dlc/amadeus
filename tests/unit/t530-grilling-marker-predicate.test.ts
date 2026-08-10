// covers: file:packages/framework/core/tools/amadeus-sensor-question-budget.ts
//
// t530 — the three grilling tokens the question-budget sensor matches (#2827).
//
// Pure string work only, like its t516 sibling: the marker scan, the
// justification-line parse and the deferred-section scan take a body and return
// a value. Everything needing a real tree — the verdict, the cutoff, the
// answer-evidence non-interference — lives in the integration sibling t531.
//
// The tokens are not invented here. `grilling-protocol.md` §2.3/§2.5 is their
// single definition; this file matches that text verbatim and the sensor's
// constants cite the same source.
import { describe, expect, test } from "bun:test";
import { VALID_DEPTH_VALUES } from "../../packages/framework/core/tools/amadeus-directive.ts";
import {
  DEFERRED_MARKER,
  GRILLING_MODE_MARKER,
  countQuestions,
  detectDeferredSection,
  detectGrillingMarker,
  parseJustificationLine,
} from "../../packages/framework/core/tools/amadeus-sensor-question-budget.ts";

/** A questions file as grilling opens one: the marker on line 1. */
function grillingBody(...rest: string[]): string {
  return [GRILLING_MODE_MARKER, "", "# 質問票", "", ...rest].join("\n");
}

describe("t530 mode marker", () => {
  test("the marker on the first line declares a grilling session", () => {
    expect(detectGrillingMarker(grillingBody())).toEqual({ kind: "valid" });
  });

  test("a file without the marker is an ordinary questions file", () => {
    expect(detectGrillingMarker("# 質問票\n\n### Q1. a")).toEqual({ kind: "none" });
  });

  test("the scan is bounded to the head, where the marker is written", () => {
    // §2.5 puts it on the file's first line. A marker appearing far down is not
    // the header declaration — reading it as one would let a quotation of the
    // protocol inside a record switch that record's file into grilling mode.
    const late = ["# 質問票", ...Array(12).fill(""), GRILLING_MODE_MARKER].join("\n");
    expect(detectGrillingMarker(late)).toEqual({ kind: "none" });
  });

  test("a near-miss marker is reported, not read as absence", () => {
    // Silently treating a mistyped marker as "no marker" would fail open: the
    // file would be measured against a fixed ceiling it was never written for,
    // and the author would see nothing.
    // A near miss is an `amadeus-grilling:` tag whose version or attributes
    // differ — that is the shape a hand-written marker goes wrong in.
    for (const line of [
      "<!-- amadeus-grilling:v2 mode=grilling -->",
      "<!-- amadeus-grilling:v1 mode=grill -->",
      "<!-- amadeus-grilling:v1 -->",
      "<!-- amadeus-grilling:grilling -->",
    ]) {
      expect(detectGrillingMarker(`${line}\n\n# 質問票`), line).toEqual({ kind: "malformed" });
    }
  });

  test("prose about grilling that carries no tag is not a near-miss", () => {
    expect(detectGrillingMarker("# grilling notes\n\nGrill me mode was used.")).toEqual({
      kind: "none",
    });
    expect(detectGrillingMarker("<!-- amadeus-grilling -->\n\n# 質問票")).toEqual({ kind: "none" });
  });

  test("the skeleton delimiter is a different tag and not a near-miss", () => {
    // A record quoting the protocol's own extraction recipe carries
    // `amadeus-grilling-skeleton:begin`. Anchoring the tag on the colon keeps
    // that from reading as a mistyped mode marker.
    const quoted = "<!-- amadeus-grilling-skeleton:begin upstream=1495d014 -->\n\n# notes";
    expect(detectGrillingMarker(quoted)).toEqual({ kind: "none" });
  });
});

describe("t530 justification line", () => {
  const LINE = "<!-- amadeus-grilling:justification depth=Standard questions=11 frontier-driven -->";

  test("the recorded crossing carries the depth and the total", () => {
    expect(parseJustificationLine(grillingBody(LINE))).toEqual({
      depth: "Standard",
      questions: 11,
    });
  });

  test("the scan covers the whole body — the line is appended at the crossing", () => {
    // §2.5 writes it at the moment the total crosses the ceiling, so its
    // position is wherever the session had reached. A head-window scan would
    // miss every real one.
    const late = grillingBody(...Array(40).fill("### Qx. filler"), LINE);
    expect(parseJustificationLine(late)).toEqual({ depth: "Standard", questions: 11 });
  });

  test("a non-numeric total is not a recorded crossing", () => {
    // Parsed as a number rather than accepted as text: a line whose count
    // cannot be read records nothing, and reading it as present would let a
    // malformed line satisfy the obligation.
    const bad = "<!-- amadeus-grilling:justification depth=Standard questions=many frontier-driven -->";
    expect(parseJustificationLine(grillingBody(bad))).toBeNull();
  });

  test("the template in the protocol is not a recorded crossing", () => {
    const template =
      "<!-- amadeus-grilling:justification depth=<Depth> questions=<N> frontier-driven -->";
    expect(parseJustificationLine(grillingBody(template))).toBeNull();
  });

  test("a body with no such line records no crossing", () => {
    expect(parseJustificationLine(grillingBody("### Q1. a"))).toBeNull();
  });
});

describe("t530 deferred section", () => {
  test("the marker records that pruning was disclosed", () => {
    const body = grillingBody(DEFERRED_MARKER, "", "## 閾値未満として明示的に先送りした点", "", "- なし");
    expect(detectDeferredSection(body)).toEqual({ present: true });
  });

  test("the heading language is free — only the marker is matched", () => {
    // The sensor ships to every project. Matching the heading would make the
    // check unmatchable in any record language but one.
    const en = grillingBody(DEFERRED_MARKER, "", "### Deferred as below the threshold", "", "- none");
    expect(detectDeferredSection(en)).toEqual({ present: true });
  });

  test("a heading without the marker is not the recorded section", () => {
    const body = grillingBody("## 閾値未満として明示的に先送りした点", "", "- なし");
    expect(detectDeferredSection(body)).toEqual({ present: false });
  });

  test("presence is the whole judgement — an empty list still counts", () => {
    // §2.3 requires the section even when nothing was pruned, so a predicate
    // that looked at the entries would report a Free session as an omission.
    const empty = grillingBody(DEFERRED_MARKER, "", "## Deferred", "", "none — Free prunes nothing");
    expect(detectDeferredSection(empty)).toEqual({ present: true });
  });

  test("the scan covers the whole body — the section closes the file", () => {
    const late = grillingBody(...Array(40).fill("### Qx. filler"), DEFERRED_MARKER);
    expect(detectDeferredSection(late)).toEqual({ present: true });
  });
});

describe("t530 the tokens do not disturb the question count", () => {
  // The vacuity half of the language-neutrality argument: HTML comments were
  // chosen partly because they cannot collide with the predicates already
  // reading these files. The answer-evidence side of this lives in t531, which
  // needs a real file.
  const ANSWERED = [
    "# Requirements Analysis 質問票",
    "",
    "### Q1. 論点 1 をどうしますか？",
    "",
    "[Answer]: A — ユーザー承認: 2026-08-10T00:00:00Z",
    "",
    "### Q2. 論点 2 をどうしますか？",
    "",
    "[Answer]: B",
  ].join("\n");

  test("injecting all three tokens leaves the count unchanged", () => {
    const before = countQuestions(ANSWERED);
    expect(before).toBe(2);
    const injected = [
      GRILLING_MODE_MARKER,
      ANSWERED,
      "<!-- amadeus-grilling:justification depth=Standard questions=2 frontier-driven -->",
      DEFERRED_MARKER,
      "## 閾値未満として明示的に先送りした点",
      "",
      "- なし",
    ].join("\n");
    expect(countQuestions(injected)).toBe(before);
  });

  test("the deferred heading is not read as a question heading", () => {
    // The heading form is the one place a collision was plausible: the count
    // predicate reads `^#{2,4}` headings. It requires a question code after
    // the hashes, so a prose heading contributes nothing — measured, not
    // assumed.
    expect(countQuestions("## 閾値未満として明示的に先送りした点")).toBe(0);
    expect(countQuestions("### Deferred as below the threshold")).toBe(0);
  });
});

describe("t530 depth wire vocabulary", () => {
  test("the engine's depth values stay at three — Free is not one of them", () => {
    // Free is a grilling level, not a depth. It never reaches the wire, state,
    // or a directive (grilling-protocol.md §2.2), so the sensor's ceiling table
    // and the directive validator read the same three values.
    expect([...VALID_DEPTH_VALUES]).toEqual(["Minimal", "Standard", "Comprehensive"]);
  });
});
