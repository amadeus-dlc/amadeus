// LCOV normalization for the AI-DLC runner's --coverage combine step (#730).
//
// Two responsibilities:
//   1. Union DA counts across the per-test LCOV chunks (bun emits one chunk per
//      spawned test file) so a line hit in any chunk is hit in the combined
//      report. This is the historical behavior lifted verbatim from
//      run-tests.ts::normalizeCoverageReport.
//   2. Strip DA records for lines that are *syntactically* comment-only or
//      blank. bun --coverage stamps DA:<line>,0 on comment and blank lines when
//      a file is only loaded (never executed); merging several such all-zero
//      chunks unions to DA:<line>,0 which codecov then reports as an
//      uncoverable false-red. The strip is driven purely by source-text
//      classification (never inferred from the DA count) so executable-but-
//      uncovered lines (DA:<line>,0 on real code) are preserved.
//
// The strip is deliberately conservative: a line is removed only when it bears
// no code/string content at all. Any uncertainty (unreadable source, a line
// carrying real tokens) keeps the DA record, so we never manufacture a false
// negative by dropping coverage for executable code.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  type CoverageSourcePathContext,
  normalizeCoverageSourcePath,
} from "./coverage-source-path.ts";

// Classify every line of a source file as strippable (comment-only or blank) or
// not. The scanner walks the file character-by-character tracking lexical state
// — code, line/block comment, single/double-quoted string, template literal
// (including `${ ... }` interpolation which re-enters code) — and marks a line
// "code-bearing" the moment it sees a character that is code or string/template
// content. Comment characters and whitespace never mark a line. A line with no
// code-bearing character is therefore comment-only or blank, hence strippable.
//
// The template-literal state is what prevents a pseudo-comment line such as the
// `// not a comment` text inside a backtick string from being mistaken for a
// real comment: inside a template every character (the slashes included) counts
// as string content and marks the line as code-bearing.
export function computeStrippableLines(sourceText: string): Set<number> {
  const totalLines = sourceText.split(/\r?\n/).length;
  const codeBearing = new Set<number>();

  type Mode = "code" | "line-comment" | "block-comment" | "sq" | "dq" | "template";
  let mode: Mode = "code";
  // Brace depth *within* the current interpolation; interpStack records the
  // depth at each `${` so the matching `}` returns us to template state.
  let braceDepth = 0;
  const interpStack: number[] = [];
  // The next character is a backslash-escaped literal (only meaningful inside a
  // string/template): it is content and never a closing delimiter.
  let escapeNext = false;

  let line = 1;
  const n = sourceText.length;
  let i = 0;
  const markCode = () => codeBearing.add(line);

  while (i < n) {
    const c = sourceText[i];
    const d = i + 1 < n ? sourceText[i + 1] : "";

    if (c === "\n") {
      // Line comments and single/double-quoted strings terminate at a newline,
      // unless the newline was backslash-escaped (a line continuation inside a
      // string). Template literals and block comments span newlines untouched.
      if (!escapeNext && (mode === "line-comment" || mode === "sq" || mode === "dq")) {
        mode = "code";
      }
      escapeNext = false;
      line++;
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (escapeNext) {
      markCode();
      escapeNext = false;
      i++;
      continue;
    }

    switch (mode) {
      case "code": {
        if (c === "/" && d === "/") {
          mode = "line-comment";
          i += 2;
          break;
        }
        if (c === "/" && d === "*") {
          mode = "block-comment";
          i += 2;
          break;
        }
        if (c === "'") {
          markCode();
          mode = "sq";
          i++;
          break;
        }
        if (c === '"') {
          markCode();
          mode = "dq";
          i++;
          break;
        }
        if (c === "`") {
          markCode();
          mode = "template";
          i++;
          break;
        }
        if (c === "{") {
          braceDepth++;
          markCode();
          i++;
          break;
        }
        if (c === "}") {
          if (interpStack.length > 0 && braceDepth === interpStack[interpStack.length - 1]) {
            interpStack.pop();
            mode = "template";
          } else if (braceDepth > 0) {
            braceDepth--;
          }
          markCode();
          i++;
          break;
        }
        if (!/\s/.test(c)) markCode();
        i++;
        break;
      }
      case "line-comment": {
        i++;
        break;
      }
      case "block-comment": {
        if (c === "*" && d === "/") {
          mode = "code";
          i += 2;
          break;
        }
        i++;
        break;
      }
      case "sq": {
        markCode();
        if (c === "\\") {
          escapeNext = true;
        } else if (c === "'") {
          mode = "code";
        }
        i++;
        break;
      }
      case "dq": {
        markCode();
        if (c === "\\") {
          escapeNext = true;
        } else if (c === '"') {
          mode = "code";
        }
        i++;
        break;
      }
      case "template": {
        markCode();
        if (c === "\\") {
          escapeNext = true;
          i++;
        } else if (c === "`") {
          mode = "code";
          i++;
        } else if (c === "$" && d === "{") {
          interpStack.push(braceDepth);
          mode = "code";
          i += 2;
        } else {
          i++;
        }
        break;
      }
    }
  }

  const strippable = new Set<number>();
  for (let ln = 1; ln <= totalLines; ln++) {
    if (!codeBearing.has(ln)) strippable.add(ln);
  }
  return strippable;
}

export interface NormalizeCoverageOptions {
  // Injectable source reader for in-process testing. Receives the normalized
  // (repo-relative) source path and returns its full text, or null when the
  // source cannot be read — in which case no line is stripped for that file.
  readSource?: (normalizedSource: string) => string | null;
}

interface FileCoverage {
  lines: Map<number, number>;
  functionsFound: number;
  functionsHit: number;
}

export function normalizeCoverageReport(
  body: string,
  context: CoverageSourcePathContext,
  repoRoot: string,
  options: NormalizeCoverageOptions = {},
): string {
  const readSource =
    options.readSource ??
    ((normalizedSource: string): string | null => {
      try {
        return readFileSync(resolve(repoRoot, normalizedSource), "utf8");
      } catch {
        return null;
      }
    });

  const files = new Map<string, FileCoverage>();
  let current: FileCoverage | null = null;

  const fileFor = (source: string): FileCoverage => {
    const normalized = normalizeCoverageSourcePath(source, context);
    let file = files.get(normalized);
    if (!file) {
      file = { lines: new Map(), functionsFound: 0, functionsHit: 0 };
      files.set(normalized, file);
    }
    return file;
  };

  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith("SF:")) {
      current = fileFor(line.slice(3));
      continue;
    }
    if (!current) continue;
    if (line.startsWith("DA:")) {
      const [lineNoRaw, countRaw] = line.slice(3).split(",");
      const lineNo = Number(lineNoRaw);
      const count = Number(countRaw);
      if (Number.isInteger(lineNo) && Number.isFinite(count)) {
        current.lines.set(lineNo, (current.lines.get(lineNo) ?? 0) + count);
      }
      continue;
    }
    if (line.startsWith("FNF:")) {
      current.functionsFound = Math.max(current.functionsFound, Number(line.slice(4)) || 0);
      continue;
    }
    if (line.startsWith("FNH:")) {
      current.functionsHit = Math.max(current.functionsHit, Number(line.slice(4)) || 0);
    }
  }

  const out: string[] = [];
  for (const [source, file] of [...files.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sourceText = readSource(source);
    const strippable = sourceText === null ? null : computeStrippableLines(sourceText);
    const sortedLines = [...file.lines.entries()]
      .sort(([a], [b]) => a - b)
      .filter(([lineNo]) => !strippable?.has(lineNo));
    out.push("TN:", `SF:${source}`);
    if (file.functionsFound > 0 || file.functionsHit > 0) {
      out.push(`FNF:${file.functionsFound}`, `FNH:${file.functionsHit}`);
    }
    for (const [lineNo, count] of sortedLines) {
      out.push(`DA:${lineNo},${count}`);
    }
    out.push(
      `LF:${sortedLines.length}`,
      `LH:${sortedLines.filter(([, count]) => count > 0).length}`,
      "end_of_record",
    );
  }
  return out.join("\n");
}
