# Build and Test Summary — 260715-opencode-cursor-harness

上流入力(consumes 全数): 各 unit の code-generation-plan.md(実行形態・逸脱裁定履歴)と code-summary.md(変更ファイル・検証記録)— U1 opencode-skeleton / U2 opencode-surface / U3 cursor-port / U4 verification-docs。

## 全体ステータス

- **build-ready**: YES — U1〜U4 すべて main 着地済み(#1032 / #1044 / #1046 / #1074、各着地面を grep/実読で検証済み)。生成同期・ドリフトガード(package.ts / dist:check ×2 / promote:self:check)全 exit 0
- **test-ready**: YES — t-opencode-emit(U1/U2 拡張)・t-cursor-adapter 37 tests(U3)・t149 構造 smoke 4 tests(U4)すべて green、落ちる実証済み(下記)
- **deployment-ready**: N/A(本リポジトリはデプロイ基盤を持たない。リリースは release.yml 一本 — project.md Deployment)

## テスト戦略(変更面に比例 — build-and-test:c1/c3)

- 中核 = unit/integration: emit の write⇔check 両分岐 in-process 駆動(U1/U2)、cursor adapter/lib の exit 値アサート 37 tests(U3)、dist 構造 smoke(U4 t149 — 存在面。byte 面は dist:check の役割分担)
- **performance: 根拠付き N/A** — 本 intent は packaging 面の追加のみで実行時性能境界(タイムアウト・スループット・SLO)に接触しない。performance-test-instructions.md 参照
- **security: 根拠付き N/A(追加検査なし)** — 新規の認証・入力境界・秘密情報なし。cursor hooks は advisory fail-open でゲート強制はツール所有 emit が正(ADR-3 のセキュリティ影響欄で明文化済み)。security-test-instructions.md 参照

## 落ちる実証の台帳(全ユニット)

| Unit | 実証列 | 出典 |
| --- | --- | --- |
| U1 | emit エントリ削除→MISSING exit 1 / 改竄→DIFFERS exit 1 / 復元→0(テストにも恒久化) | #1032・code-summary |
| U3 | AGENTS.md エントリ削除→dist:check exit 1(ORPHAN)→復元 0 | #1046・code-summary |
| U4 | dist/opencode/AGENTS.md 退避→t149 exit 1→復元 0(injection-surface-verify 準拠: t149 は dist 面を読む) | #1074・code-summary |

## ユニット別カバレッジ

- U1: opencode emit 27/27・manifest 21/21 未カバー0 / U2: 変更行未カバー0 / U3: cursor 正本4ファイル(emit/manifest/lib/adapter)未カバー0 / U4: patch gate PASS(t149 は lcov 母集団外 — Q2=A 意味論、被覆は smoke 自身の実行で担保)
- 本 intent 期間中に coverage 基盤自体が codecov → 自己完結ゲート(patch+相対、#1060/#1067)へ移行 — U1〜U3 は codecov 時代、U4 は新ゲートで検証

## 既知の残項目

- installer 対応は Issue #1048(クロスレビュー2名済み)、opencode hooks(plugins)は Issue #1049(同)— 本 intent 非目標の分離起票
- t224 サイズ乖離(#1059、e4 対応中)と setup-pack-contract の hook timeout フレーク(#1074 CI 初回赤 → 再実行緑で帰属確定)は本 intent 無関係の既知事象
