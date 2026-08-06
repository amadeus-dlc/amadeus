# Code Generation Plan — fix-2112-cast-guard

上流入力(consumes 全数): requirements.md（FR-6）, architecture.md, code-structure.md

- 対象 Issue: [#2112](https://github.com/amadeus-dlc/amadeus/issues/2112)
- 裁定: Q6=B（最外1サイト化 + 逆方向の穴も同一変更）+ Q6b=A（`as unknown as` 経由の連鎖も1サイト）
- Bolt branch: `bolt-fix-2112-cast-guard`（base `1043b7e67`）
- 実装形態: worktree 分離の並行 builder dispatch（E-OBB4-CGS13。FR-6 全文をプロンプトへ焼き込み）

## Steps（TDD スライス、各スライスで RED 実測 → 最小実装 → GREEN）

1. 多段 `as` 連鎖の計数を最外1サイトへ是正する — `JSON.parse(x) as A as B` = 1（FR-6a を逐語で写す。
   現行は visitNodes 全ノード訪問 × unwrapExpression の as 剥がしで 2 計上）。
2. `JSON.parse(s) as A as unknown as B` も 1 サイト（Q6b=A）。BR-CG-2 の unknown 免除は
   「単独の `as unknown as` 形に限る」ことをガードのヘッダコメントへ明文化する。
3. 逆方向の過少カウントを同一変更で塞ぐ（FR-6b）— `<A>JSON.parse(s)`（TypeAssertionExpression）と
   `JSON.parse(s) satisfies A`（SatisfiesExpression）を検出対象へ追加。
4. 台帳の再ベースはマージ先の最終 base で実測し、shrink-only 方向を維持（FR-6c、
   `cid:code-generation:c5-ratchet-census-at-final-base`）。手編集禁止 — ガード自身の経路のみ。
5. コーパス両側実測（FR-6d）: (i)-(iii) fixture で検出、(iv) 実コーパス全数で偽赤ゼロ
   （`cid:code-generation:corpus-sweep-for-new-guards`）。落ちる実証は注入 → 赤 → 復元 → 残渣ゼロを不可分1セット。
6. FR-6e（Issue 件数訂正コメント）は conductor 所有 — PR 発行時に実施。

## 対象ファイル目録（設計確定後の導出）

- `tests/unchecked-cast-guard.ts`（検出器 + ヘッダ文書）
- `tests/unit/t420-unchecked-cast-guard.test.ts`（既存テストファイルの拡張）
- `.github/workflows/ci.yml`（stale 件数コメントの count-free 化 — `cid:functional-design:c3-adjacent-enum-numerals`）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T09:42:11Z
- **Iteration:** 1
- **Scope decision:** none

Plan copies FR-6a-d verbatim without narrowing; summary shows 4 TDD RED-GREEN slices, one-set falling proof with zero residue, both-sides corpus sweep, final-base ledger re-base (35/19 unchanged, shrink-only preserved), per-command exit codes; all deviations declared with grounds, none undeclared.

### Findings

- NIT | code-summary.md does not show a fixture combining the new spellings (angle-bracket/satisfies) with the as-unknown-as chain to confirm outermost-site counting under co-occurrence - not required since FR-6a and FR-6b are validated independently.
