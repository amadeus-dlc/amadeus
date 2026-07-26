上流入力(consumes 全数): components, component-methods, services, component-dependency, decisions, requirements

# Units of Work — 260725-kimi-harness

components.md の C1-C6 と requirements.md の FR-1〜FR-10 から生成。各 Unit は単独で deployable な PR となる(units-generation:c1 を各 Unit の定義に反映)。詳細な形状は component-methods.md、経路は component-dependency.md、選択の根拠は decisions.md を参照。services.md の「ネットワークサービスを持たない」判定により、全 Unit はプロセス起動型の実行単位として定義する(常駐サービス境界は存在しない)。

## U1: kimi-harness-definition

- **内容**: C1 全体。`packages/framework/harness/kimi/` 新設(manifest.ts・orchestrator SKILL.md + question-rendering.md・onboarding.fills.ts・dot-gitignore・hooks/amadeus-hooks.snippet.toml)と、`bun scripts/package.ts kimi` による `dist/kimi/` 生成 + `--check` パス + dist 構造 smoke(FR-7b)
- **責務・境界**: 宣言的なハーネス登録。ロジックを持たない(ADR-2: emit なし・runner-gen 既定)
- **Deployment model**: standalone(他 Unit への実行時依存なし)
- **複雑さ**: S
- **完了定義**: `package.ts kimi` と `--check` が exit 0、dist smoke green。**本 Unit が Walking Skeleton**(team-practices 承認済みの最初の Bolt。単独・ゲート付き)
- **FR 対応**: FR-1, FR-7b, FR-10

## U2: kimi-hook-adapter

- **内容**: C2 全体。`hooks/amadeus-kimi-adapter.ts`(shim) + `amadeus-kimi-lib.ts`(変換ロジック)の実装。実機配線(Q1 許可済みの手順)による全9イベントの payload live capture と変換表の固定、契約テスト(FR-7a)
- **責務・境界**: Kimi payload → Claude 契約の正規化。core hooks は非改変、fail-open、Stop block のみ verbatim 中継(ADR-3)
- **Deployment model**: standalone(U1 のツリーに載るが、adapter 単体で価値を持つ)
- **複雑さ**: M(本 intent 最大の塊。payload 実機差異 R1 を内包)
- **FR 対応**: FR-2, FR-7a

## U3: setup-hooks-merge

- **内容**: C3 全体。`packages/setup/src/domain/kimi-hooks.ts` + `modules/kimi-hooks.ts`。managed block の冪等マージ(plan report 差分表示 + wizard confirm + atomic + バックアップ + 除去)と単体テスト(FR-7c)
- **責務・境界**: ユーザー config への書き込みを既存インストーラ流儀で安全に行う(ADR-5)。kimi 独自 UX なし
- **Deployment model**: standalone
- **複雑さ**: M
- **FR 対応**: FR-3, FR-7c

## U4: core-harness-enums

- **内容**: C4 全体。`amadeus-utility.ts` doctor arm(adapter 実在・managed block 有無・バージョンフロア・機能 probe + otherTrees)、`amadeus-swarm.ts` の `HARNESS_VALUES` 追加、`amadeus-harness.ts` の4定数追加。swarm resolve 分岐テスト(FR-7d)
- **責務・境界**: サンクション済み3箇所の列挙追加のみ。他の core 編集なし
- **Deployment model**: standalone
- **複雑さ**: S
- **FR 対応**: FR-4, FR-7d

## U5: distribution-enumeration

- **内容**: C5 全体 + FR-6。packages/setup の3ファイル(harness.ts/engine-layout/reporter)、plugin-projection、promote-self(managedDirs + PACKAGE_HARNESSES)、detect-ci-changes.sh の列挙追加。`bun run promote:self` でルート `.kimi-code/` を生成し dogfood(実機 `/skill:amadeus` 起動・hook 発火・doctor パス)
- **責務・境界**: 列挙の一貫性(3閉集合)と drift guard の維持
- **Deployment model**: standalone
- **複雑さ**: S
- **FR 対応**: FR-5, FR-6

## U6: kimi-live-journey

- **内容**: C6 全体。`tests/harness/kimi-print-drive.ts` 新規作成と `AMADEUS_KIMI_PRINT_LIVE=1` ゲートの journey 1本以上。ローカル実走 green を確認(FR-9)
- **責務・境界**: 既存 driver と同じポート形状(skipReason・env ゲート・credits 明記)
- **Deployment model**: standalone
- **複雑さ**: M
- **FR 対応**: FR-9

## U7: kimi-harness-docs

- **内容**: `docs/guide/harnesses/kimi-code.md` + `.ja.md` 新設と README 表追加。前提(kimi 0.28.1+・bun)・hook 配線(自動/手動)・制約(ユーザーレベル config)を実測に基づいて記述(FR-8)
- **責務・境界**: 英/日の言語規則(docs は英語、amadeus/** は日本語)
- **Deployment model**: standalone
- **複雑さ**: S
- **FR 対応**: FR-8

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T10:00:39Z
- **Iteration:** 1
- **Scope decision:** none

全6コンポーネント・全10FR が7つの PR-deployable Unit に写像され、yaml DAG は well-formed・acyclic・prose と一致。walking skeleton(U1)は team-practices からの正当な継承。検出4件は全て minor で同一 iteration で修正済み。

### Findings

- (minor / unit-of-work.md) services 未参照 → 修正済み(参照行を追記)
- (minor / unit-of-work-dependency.md) 3成果物の本文参照不足 → 修正済み(参照行を追記)
- (minor / unit-of-work-story-map.md) FR-6/FR-8 の整合主張が過剰 → 修正済み(意図的な差異として注記)
- (minor / unit-of-work-story-map.md) Unit 内実装順序の欠落 → 修正済み(U1 の順序を追記)
