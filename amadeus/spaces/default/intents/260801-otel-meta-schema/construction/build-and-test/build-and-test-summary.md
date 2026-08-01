# Build & Test Summary — 260801-otel-meta-schema

上流入力(consumes 全数): 各 unit の code-generation-plan.md(全6 unit — 実行形態と経過の正本)と code-summary.md(全6 unit — 変更面・検証実測・PR 着地の正本)、build-instructions.md / unit-test-instructions.md / integration-test-instructions.md / performance-test-instructions.md / security-test-instructions.md / build-test-results.md — 本ファイルは各 instructions の実施状況と results の判定を束ねる要約。

## 総括

スキーマ正本 #1868 v1 の6面すべてが実装・着地した(6 Bolt / 6 PR 全マージ)。最終統合断面の full CI は Failed assertions 0(9761 assertions)、全 drift guard green。

## 面別の実施状況

- **build**(build-instructions): 全 Bolt で NFR-4(dist 7ハーネス+self-install 同期)を同一 PR で完遂。最終断面の dist:check / promote:self:check PASS
- **unit**(unit-test-instructions): 新設6ファイル(suppliers/span-context/stacktrace/purpose/lifetime/metrics-vocabulary)全 green。TDD Red→Green 記録は各 Bolt 報告に実測あり
- **integration**(integration-test-instructions): 新設5ファイル(resource/span-attrs/exception/metrics-instruments/log-subagent-start)全 green。store 実文字列 assert を必須化(本 intent で2度の欠陥素通りを実測した教訓の反映)
- **performance**(performance-test-instructions): NFR trace 範囲のみ — memo counter assert・redactStacktrace 線形性スイープ。負荷試験は非適用(根拠付き不生成)
- **security**(security-test-instructions): 二層 redaction 両層 assert・閉集合 fail-closed・Purpose 統制。DAST/依存更新は範囲外(根拠付き)

## 判定と引き継ぎ

build-test-results.md のとおり**条件付き READY**(未検証3面 — Relay 実外部送出 / kimi 実機 E2E / store 長期容量 — を明示引き継ぎ)。フォローアップ Issue: #1906(t145 lock フレーク)、#1909(stale marker 回収)。
