# Intent Statement — upstream-sync-230

上流入力(consumes 全数): なし(本ステージの consumes 宣言は空。外部入力はユーザー承認済み計画 `docs/research/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md` と ledger `docs/research/upstream-sync/ledger.json`)

## Problem Statement

Amadeus は upstream `awslabs/aidlc-workflows` のフォークとして独自進化しているが、upstream v2.2.0(`eae912e0…`)→ v2.3.0(`29a31f78…`)の変更窓(19 パッチ+2.3.0 プラグイン機構、24 コミット・418 パス)に未追従である。この窓には Amadeus でも実測済みの正しさ欠陥への修正(bolt_dag 無音 degrade の self-heal、`$CLAUDE_PROJECT_DIR` 未クォートによるフック全死、compose-pending マーカー孤児化等)と、拡張手段としてのプラグイン機構が含まれる。未追従のまま放置すると、upstream で解決済みの既知欠陥への露出と機能負債が蓄積する。

事前分析はユーザー承認済み: 8 ドメイン・30 項目に分類し、24 項目 ADOPT/ADAPT・6 項目 SKIP(同等実装済み・生成物・フォーク固有)を確定(ledger 8/8 APPROVED、2026-07-20T04:48:20Z)。

## Target Customer

- **Amadeus フレームワーク開発チーム(内部)** — エンジン正しさ修正により、無音 degrade・偽グリーンのクラスの再発を機構で封鎖できる(現状はノルムによる手動回避)
- **全6ハーネス(claude / codex / cursor / kiro / kiro-ide / opencode)の利用者(内部)** — スペース入りパスでのフック死、PATH 欠落環境でのアダプタ死、Kiro IDE のフック no-op が解消される
- **将来のプラグイン作者** — `plugins/<name>/` による追加ステージ・contribution seam の公式拡張手段を得る

## Success Metrics

- 承認済み計画の 24 ADOPT/ADAPT 項目が実装され、6 SKIP 判定が保存される
- 検証契約が全 green: 項目別ターゲットテスト+`bun run typecheck` / `bun run lint:check` / `bun run dist:check` / `bun run promote:self:check` / `bun run test:ci`
- ledger(`docs/research/upstream-sync/ledger.json`)が `PLANNED` → `INTENT_IN_PROGRESS` → `APPLIED` へ遷移し、最終 Amadeus 比較 SHA が記録される
- プラグイン非アクティブ時に core がバイト同一を維持(dist ドリフトガード green)

## Initiative Trigger

ユーザーの明示指示(2026-07-20): upstream v2.3.0 リリース(プラグイン機構)への追従 Intent を作成し、**ideation 完了時点で park** する。inception / construction への進行(=実装)は、ユーザーの明示的な再開承認後に行う。

## Initial Scope Signal

`amadeus` スコープ(compose ゲートでユーザー承認済み、18/32 ステージ EXECUTE)。feature 級のフレームワーク強化であり、bugfix 系 degrade スコープでは application-design / units-generation / delivery-planning / NFR 系が SKIP され不成立。運用(Operation)フェーズは対象外(インフラ運用なし)。最大の構築ブロックは 2.3.0 プラグイン機構の6ハーネス対応再実装で、独立した construction スライスを要する。
