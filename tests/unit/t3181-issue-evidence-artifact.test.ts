// covers: packages/framework/core/tools/amadeus-utility.ts
// size: small
//
// t3181 — the issue-evidence artifact shape (#3181 FR-EVD-6) and the
// cross-review marker reader that feeds its provenance block.
//
// The artifact is the FIRST-CLASS upstream input requirements-analysis and
// reverse-engineering consume, so its metadata is a contract, not a rendering
// detail: issue number, comment URL, target SHA, review-run-id and fetch time
// must all be recoverable from the file alone (FR-EVD-6 AC — "成果物のメタデータ
// 節を fixture で検査"). Both functions are pure, so the whole surface runs
// in-process with no filesystem and no `gh`.

import { describe, expect, test } from "bun:test";
import {
  parseCrossReviewMarker,
  renderIssueEvidence,
} from "../../packages/framework/core/tools/amadeus-utility.ts";
import type { GitHubRepository } from "../../packages/framework/core/tools/amadeus-github-types.ts";

const REPO: GitHubRepository = {
  owner: "amadeus-dlc",
  name: "amadeus",
  canonical: "amadeus-dlc/amadeus",
};

const SHA = "0b652d2cd1a6fbf2d5a905736d3a3eb887e9d810";

function markerComment(reviewer: string, id: number): {
  id: number;
  body: string;
  createdAt: string;
  authorLogin: string;
  htmlUrl: string;
} {
  return {
    id,
    body: [
      `## クロスレビュー（${reviewer}）: CONFIRMED`,
      "",
      "<!-- issue-cross-review",
      "review-run-id: xrev-3181-20260817",
      `reviewer-id: ${reviewer}`,
      "execution-subject-id: agent-abc",
      `target-sha: ${SHA}`,
      "-->",
      "",
      "### Claim ledger",
    ].join("\n"),
    createdAt: "2026-08-17T10:00:00Z",
    authorLogin: "reviewer-bot",
    htmlUrl: `https://github.com/amadeus-dlc/amadeus/issues/3181#issuecomment-${id}`,
  };
}

describe("t3181 cross-review marker reader", () => {
  test("reads review-run-id, reviewer-id and target-sha out of the HTML marker", () => {
    const marker = parseCrossReviewMarker(markerComment("reviewer-1", 1).body);
    expect(marker).toEqual({
      reviewRunId: "xrev-3181-20260817",
      reviewerId: "reviewer-1",
      targetSha: SHA,
    });
  });

  test("returns null for a comment carrying no marker", () => {
    expect(parseCrossReviewMarker("plain comment, no marker")).toBeNull();
  });

  test("keeps absent keys null rather than inventing a value", () => {
    const marker = parseCrossReviewMarker(
      "<!-- issue-cross-review\nreviewer-id: reviewer-2\n-->",
    );
    expect(marker).toEqual({
      reviewRunId: null,
      reviewerId: "reviewer-2",
      targetSha: null,
    });
  });
});

describe("t3181 issue-evidence artifact format (FR-EVD-6)", () => {
  const rendered = renderIssueEvidence({
    intentSlug: "260817-inception-cost-batch",
    repo: REPO,
    fetchedAt: "2026-08-18T01:02:03Z",
    entries: [
      {
        issue: {
          repository: REPO,
          number: 3181,
          title: "インセプション固定費: Issue エビデンスを上流入力にする",
          body: "## 背景\n\nRE/RA が確定事実を再導出している。",
          state: "OPEN",
        },
        comments: [
          markerComment("reviewer-1", 11),
          markerComment("reviewer-2", 12),
          {
            id: 13,
            body: "着手します。",
            createdAt: "2026-08-17T12:00:00Z",
            authorLogin: "j5ik2o",
            htmlUrl:
              "https://github.com/amadeus-dlc/amadeus/issues/3181#issuecomment-13",
          },
        ],
      },
    ],
  });

  test("names the intent and carries a metadata section with fetch provenance", () => {
    expect(rendered.startsWith("# Issue Evidence — 260817-inception-cost-batch\n")).toBe(true);
    expect(rendered).toContain("## メタデータ");
    expect(rendered).toContain(
      "- fetched-at: 2026-08-18T01:02:03Z / repo: amadeus-dlc/amadeus / tool: issue-evidence fetch",
    );
  });

  test("opens one machine-extractable H2 per issue", () => {
    expect(rendered).toContain(
      "## Issue #3181: インセプション固定費: Issue エビデンスを上流入力にする",
    );
  });

  test("records state, url, target-sha, review-run-id and the reviewer count", () => {
    expect(rendered).toContain("- state: OPEN");
    expect(rendered).toContain(
      "url: https://github.com/amadeus-dlc/amadeus/issues/3181",
    );
    expect(rendered).toContain(`target-sha: ${SHA}`);
    expect(rendered).toContain("- review-run-id: xrev-3181-20260817 / 独立レビュアー: 2名");
  });

  test("keeps the issue body verbatim under its own heading", () => {
    expect(rendered).toContain("### 本文(verbatim)");
    expect(rendered).toContain("## 背景\n\nRE/RA が確定事実を再導出している。");
  });

  test("separates marker-bearing cross-review comments from the rest, each with its URL", () => {
    const crossIdx = rendered.indexOf("### クロスレビューコメント");
    const otherIdx = rendered.indexOf("### その他コメント");
    expect(crossIdx).toBeGreaterThan(-1);
    expect(otherIdx).toBeGreaterThan(crossIdx);
    const crossBlock = rendered.slice(crossIdx, otherIdx);
    expect(crossBlock).toContain("#issuecomment-11");
    expect(crossBlock).toContain("#issuecomment-12");
    expect(crossBlock).not.toContain("#issuecomment-13");
    const otherBlock = rendered.slice(otherIdx);
    expect(otherBlock).toContain("#issuecomment-13");
    expect(otherBlock).toContain("着手します。");
  });

  test("reports n/a — never a fabricated value — when no marker is present", () => {
    const bare = renderIssueEvidence({
      intentSlug: "s",
      repo: REPO,
      fetchedAt: "2026-08-18T01:02:03Z",
      entries: [
        {
          issue: {
            repository: REPO,
            number: 42,
            title: "no reviews yet",
            body: "b",
            state: "CLOSED",
          },
          comments: [],
        },
      ],
    });
    expect(bare).toContain("target-sha: n/a");
    expect(bare).toContain("- review-run-id: n/a / 独立レビュアー: 0名");
  });
});
