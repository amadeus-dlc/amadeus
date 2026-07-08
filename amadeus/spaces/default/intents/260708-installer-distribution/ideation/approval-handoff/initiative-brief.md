# Initiative Brief — インストーラの実装(installer-distribution)

> ステージ: approval-handoff (Ideation) / 作成: 2026-07-08
> 上流入力: `../intent-capture/intent-statement.md`、`../market-research/competitive-analysis.md`、`../feasibility/feasibility-assessment.md`・`../feasibility/constraint-register.md`、`../scope-definition/scope-document.md`・`../scope-definition/intent-backlog.md`

## Intent と問題定義

Amadeus の現行配布は `git clone` + `cp -r dist/<harness>/...` の手動コピーであり、(1) 初回導入の摩擦 (2) バージョン更新手段の欠落 (3) 導入ミスの3つの構造的問題を持つ(intent-statement)。npm 公開 CLI `@amadeus-dlc/setup` により導入・更新・安全性を包括的に解決する。

**成功指標**: ① `bunx @amadeus-dlc/setup install` の1コマンド・1分以内導入(E2E 検証) ② README から手動コピー手順が消える ③ 更新でユーザー所有ファイル不変(テスト検証)。

## 市場検証サマリー

competitive-analysis の結論: 同カテゴリの cc-sdd / GitHub spec-kit は1コマンド導入を標準装備しており、手動コピーは市場水準を下回る。テーブルステークス(ワンライナー+ウィザード+マルチハーネス)は追随し、**差別化は更新体験(バージョン検出+差分レポート+非破壊マージ)に集中**する。競合はいずれも適用前差分表示を持たない。

## 実現可能性とリスクのハイライト

feasibility-assessment の判定: **GO(実現性: 高)**。完全自作(bun/TypeScript、依存ゼロ)で `scripts/promote-self.ts` 等の実証済み資産を移植可能。主要リスク: R1 npm スコープ確保(公開前タスク、名前は2026-07-08 実測で空き)/ R2 ネットワーク依存 / R3 バージョン整合規約(requirements で固定)/ R4 マージ実装工数(promote-self 移植+skeleton 早期実測で強化済み、フォールバックはリリース分割)。公開前是正必須: I1 `license` → `(MIT OR Apache-2.0)`、I2 `repository` → `https://github.com/amadeus-dlc/amadeus`。

## スコープ境界

- **IN**(scope-document / intent-backlog): `install` / `upgrade`(完全対称の明示サブコマンド、なしはヘルプ)、対話式ウィザード+非対話フラグ、`--force`、npm 公開(是正込み)。実装先は `packages/setup`
- **OUT**: 組織一括展開 / オフライン導入 / ロールバック / 既存導入の自動検出 / provenance・CI 自動公開 / doctor / 内容差分 / サブコマンドなし自動判定(Won't 8項目)

## 体制

単一チーム(このリポジトリのメンテナ)+ AI-DLC の11エージェント体制で遂行(team-formation は composed スコープで SKIP — 編成の意思決定事項なし)。UI サーフェスがないため mockups 系も SKIP。

## Go/No-Go 推奨

**GO — inception へハンドオフする。** ブロッカーなし。未確認事項は npm スコープ確保(人間の公開前タスク R1)のみで、設計未決項目はすべて後続ステージへ割当て済み(共有ファイル例外 → requirements、バージョン規約 → requirements/design、工数実測 → construction skeleton)。承認により reverse-engineering(差分リフレッシュ)から inception を開始する。
