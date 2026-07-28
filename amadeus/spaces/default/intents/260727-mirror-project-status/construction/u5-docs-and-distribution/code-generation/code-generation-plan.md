# Code Generation Plan — u5-docs-and-distribution

上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements

U5 = docs 整備(FR-10b/12b)・配布同期(FR-12b)・テスト完備検収(FR-12a/12c)で intent を完結。実装は U4 Bolt(bolt/u4-config-overrides-and-diagnostics、fd1b8a657)に **stacked** した Bolt ブランチ `bolt/u5-docs-and-distribution` の隔離 worktree で行う。新規コードロジックなし — C8(amadeus-mirror-presentation.ts)の契約台帳追記と docs 4文書のみ。

## 実装ステップ

- [x] **Step 1: docs 4文書追記(BR-U5-1)** — docs/guide/22-intent-mirror.md(+.ja)/ docs/reference/20-intent-mirror.md(+.ja)へ (i) 設定節: `mirror-projects`(配列・status-names 上書き・層全置換)(ii) 認証節: ProjectV2 の `project` scope(gh credential store 委譲・自動 scope 変更なし)(iii) 運用・診断節: repair status の resolution 4値全数+部分成功+解決手順誘導+gh 境界障害挙動。en/ja 対訳を同一変更で同期。新文書を増やさない。
- [x] **Step 2: 閉じた台帳の同一変更同期(BR-U5-2)** — docs TOPICS / t291 parity / MIRROR_USER_CONTRACT(presentation.ts:16 — 設定キー・診断項目の追記面のみ)を文書と同一変更で更新。scopeExclusions(:127 = pull-request/release/deploy/daemon/polling)は不変維持+t291 green(BR-U5-5)。
- [x] **Step 3: 台帳不変の検収(BR-U5-4)** — MIRROR_TOOL_FILES(projections.ts:22)と t285 件数が不変であることを実測確認。変化検出 = 設計逸脱として停止・conductor 報告。
- [x] **Step 4: dist 7面+self-install 再生成(BR-U5-3)** — package.ts / promote:self → dist:check / promote:self:check green を機械確認。
- [x] **Step 5: テスト完備検収(BR-U5-6)** — U1〜U4 のテスト群(t343〜t349 ほか)の完備を確認(後追い代作はしない — 欠落は当該 Unit の欠落として報告)。
- [x] **Step 6: 全体検証(BR-U5-8)** — typecheck / lint / run-tests --ci / complexity gate / local lcov(diff 未カバーの実測 — local-lcov-pre-push)。数値は集計コマンド実出力からのみ転記。
- [x] **Step 7: バージョン・バッジ・リリースノート不変(BR-U5-7)の確認 → deslop → 全検証再実行 → コミット**(push は conductor)。

## トレーサビリティ

FR-10b, FR-12 — 受入条件 15, 16, 17。逸脱は実装前停止(既存様式準拠と判断する場合も停止対象)。

## テスト戦略

Comprehensive の検収面 — 新規テストは t291 parity / TOPICS 同期の既存機構が対象(必要な場合のみ)。落ちる実証は該当する新設検査に限り注入→赤→revert の1セットで実施。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T16:12:20Z
- **Iteration:** 1
- **Scope decision:** none

BR-U5-1〜8 全確認: en/ja parity 11 topics×4文書、同一コミット台帳同期、台帳不変、7面+self-install 再生成、docs と実装の意味論一致、注入残存なし、19ファイル一致。

### Findings

- None
