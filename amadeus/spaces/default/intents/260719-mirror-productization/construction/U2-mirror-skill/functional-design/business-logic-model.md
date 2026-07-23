# Business Logic Model — U2-mirror-skill(260719-mirror-productization)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## SKILL 手順フロー(実装 = SKILL.md の Step 構成)

```
Step 1: bun {{HARNESS_DIR}}/tools/amadeus-mirror.ts status(--intent は任意)
  → exit 0: 「乖離なし」を報告して終了
  → exit 2: precondition 理由(gh 不在/未認証/record 不在)と復旧手順を提示して終了
  → exit 1: Step 2 へ
Step 2: findings 種別ごとの案内(人間の選択を待つ — StatusFinding 3種と1:1)
  → mirror-missing: create を提案(実行例コマンド提示)
  → stale-status-line: detail の record 状態が Completed → close を提案(close-after-landing 検証の注記付き)/ それ以外 → sync を提案(BR-U2-5 の内部分岐)
  → issue-drifted: sync を提案
Step 3: 選択された verb を実行し、結果(exit code+stdout)を報告
```

## 実装順序(story-map U2 順序の詳細化)

1. SKILL 骨格(frontmatter+Step 1 の status 入口)— U1 の StatusOutcome/exit 契約が確定済みであることが前提(DAG: U2 depends_on U1)
2. Step 2 分岐文言+運用注記(BR-U2-4 の3条件)
3. manifest の skills 投影リストへ追加(coreDirs 明示投影 — claude manifest :51-54 同型を6ハーネス分)
4. docs mirror 節の新設(BR-U2-6 — 対訳同期込み)

## テスト設計

- SKILL は文書のため、検証は (a) FR-3 受け入れ基準の grep(実行コマンドが {{HARNESS_DIR}} 経由のみ・gh 直呼び 0)(b) dist:check/promote:self:check(6面投影)(c) 既存 SKILL 系テスト(runner/skills ドリフトガード)が green

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:46:58Z
- **Iteration:** 2
- **Scope decision:** none

i1 Major2件(docs mirror 節の担当不在/complete-close 状態機械未確定)是正 → i2 READY(StatusFinding 3種1:1・close 判定一意化・3配置全充足)

### Findings

- BR-U2-6 新設(docs mirror 節 = U2 担当、是正済み)
- BR-U2-5 書換(close = stale finding 内部分岐、是正済み)
