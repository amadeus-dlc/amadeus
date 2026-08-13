# コード生成計画 — remove-team-up

入力: Requirements（units-generation は SKIP）。Depth: Minimal。テスト戦略: Comprehensive。

トレーサビリティ: 各ステップ → FR / NFR（ユーザーストーリーなし）。

- [x] Step 1: ランチャ正本を削除する（FR-1, FR-2, FR-8）
- [x] Step 2: ランチャ駆動テストと fixture を削除する（FR-3）
- [x] Step 3: doctor の trust 修復文言を置換する（FR-4）
- [x] Step 4: Team Mode 文書と glossary を書き換え、`team-msg.sh` を削除する（FR-5, FR-7）
- [x] Step 5: 不在回帰テストを追加する（NFR-1）
- [x] Step 6: 削除テストの test-time-factor allowlist 行を落とす（FR-3）
- [x] Step 7: `bun run build`（dist は手編集しない）（FR-6, NFR-3）
- [x] Step 8: typecheck / lint / 対象テスト（NFR-3）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-13T14:56:09Z
- **Iteration:** 1
- **Scope decision:** none

Deletion set, doctor copy, docs, absence test, and build path match FR-1 through FR-8; remaining PR report is a follow-up until a pull request exists.

### Findings

- FOLLOW-UP | pr-convergence-report.md is not CLI-issued because this branch has no pull request yet; emit it in the pr-convergence stage rather than hand-writing.
