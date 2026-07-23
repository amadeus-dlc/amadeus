# Business Logic Model — U1-mirror-tool(260719-mirror-productization)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## 処理フロー(status verb)

```
main("status", intentArg)
  → ensureGhReady()                    …失敗 → StatusOutcome{precondition}(exit 2)
  → buildSnapshot(intentArg)           …record 不在 → precondition(exit 2)
  → readMirrorIssue(snapshot, gh)      …フィールド不在/view 失敗 → findings に mirror-missing
  → compareStatusLine(snapshot, issue) …不一致 → findings に stale-status-line(**detail に record 側状態(state の Status)を含める** — U2 SKILL の close 案内分岐(BR-U2-5)が消費する契約。U2 レビュー裁定からの申告付き追補、StatusFinding 型は不変)
  → renderExpectedBody(snapshot) と issue.body の比較 …不一致 → findings に issue-drifted
  → findings.length === 0 ? clean(0) : diverged(1)
```

- `renderExpectedBody` は create/sync が使う既存レンダラ関数を**そのまま再利用**(canonical 1定義 — 期待本文の独立再実装を作らない。cid:pbt-oracle-cancellation の同型回避: 比較オラクルを別実装にしない)
- mirror-missing 検出時は後続2クラスの比較対象が無いため、その2クラスは「判定不能(findings に含めない)」— 3クラスの独立検査は「対象が存在する範囲で」の意味に精密化

## 実装順序(story-map の U1 順序の詳細化)

1. 移設(git mv 相当+import パス整合+t232 パス更新)→ 全検証 green
2. status 骨格(parseArgs/main 分岐+precondition 経路)
3. 乖離3クラス判定(mirror-missing → stale → drifted の順に実装し、各クラスの fixture+落ちる実証)
4. usage 注記(BR-U1-6)

## テスト設計(in-process seam — fs-tests-integration-first)

- unit 層: StatusOutcome 導出の純関数(スナップショット/issue 本文を引数注入)
- integration 層: 実 FS の record fixture+GhRunner fake での main 直駆動(spawn 盲点回避 — bun-coverage-spawn-blindspot)
- 落ちる実証は「テストが実際に読む面」= 移設後の core/tools 正本で行う(injection-surface-verify)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:30:19Z
- **Iteration:** 1
- **Scope decision:** none

U1 FD READY(6観点 file:line 整合)。Minor の型名相違は正本名 StatusFinding の申告行で即時解消

### Findings

- Finding vs StatusFinding の命名相違 → 意図的相違として申告・正本名固定(解消済み)
