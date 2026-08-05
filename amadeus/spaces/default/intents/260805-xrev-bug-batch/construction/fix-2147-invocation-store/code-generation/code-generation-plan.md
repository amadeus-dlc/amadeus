# Code Generation Plan — fix-2147-invocation-store

上流入力(consumes 全数): requirements.md（FR-1）, architecture.md, code-structure.md

- 対象 Issue: [#2147](https://github.com/amadeus-dlc/amadeus/issues/2147)（S2-CRITICAL / P1 へ昇格予定 — Q7=A）
- 裁定: Q1=A（invocation store へ永続化 + store 欠損は fail-closed）
- Bolt branch: `bolt-fix-2147-invocation-store`（base `1043b7e67`）
- 実装形態: worktree 分離の並行 builder dispatch（E-OBB4-CGS13。FR-1 全文をプロンプトへ焼き込み）

## Steps（TDD、各スライス RED 実測 → 最小実装 → GREEN）

1. `runScope` が発行した `invocationId` + `iteration` を intent record 配下の invocation store へ永続化する（FR-1a）。
2. `checkRead` / `completeReview` は受け取った id を store と照合し、**store 不在・未発行 id は fail-closed 拒否**
   （非0 exit、READY 不成立、承認決定を返さない — FR-1b を逐語で写す）。
3. replay 検査（同一 invocation/iteration の再提出拒否）を transcript の有無と独立に全経路で執行（FR-1c、
   早期 return `:443` の従属解消）。
4. 受け入れ基準は FR-1d の (i)〜(iv) を verbatim 再適用: 捏造 v4 UUID の check-read / complete-review 拒否、
   空 transcript 経路の id 再利用拒否、正規往復の exit 0。
5. `t245` へ `scopeTranscript: []` 通常経路ケースを追加（FR-1e、現行 repo 全域 0 hit の盲点）。
   新テスト × 修正前実装 = RED の対角実測を記録（`cid:code-generation:c6-260803-state-integrity`）。
6. 既存 t245 アサーションのうち旧挙動（scope なし通過）を暗黙固定していたものは、FR-1 宣言済みのテスト契約改訂として
   fixture 先行 `scope` 化 + Q1=A 引用コメントで改訂し、改訂 vs 新規を summary で区別する（§12a reviewer の FOLLOW-UP 対応）。

## 対象ファイル目録（設計確定後の導出）

- `packages/framework/core/tools/amadeus-reviewer-runtime.ts`
- `tests/integration/t245-reviewer-protocol-production-path.test.ts`

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T09:53:17Z
- **Iteration:** 1
- **Scope decision:** none

FR-1a-eの逐語再現・fail-closed保持・対角実測・2件の落ちる実証・改訂/新規の明示区別・懸案(no-silent-drop rebind, t92 flake)の適切な申告を確認、BLOCKERなし

### Findings

- FOLLOW-UP | code-summary.md: FR-1d の受け入れ基準(i)〜(iv)それぞれを対応する新規/既存テスト名へ明示的に対応付け、トレーサビリティを高めること
