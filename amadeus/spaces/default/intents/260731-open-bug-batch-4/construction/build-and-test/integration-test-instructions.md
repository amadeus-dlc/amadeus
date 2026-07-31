# Integration Test Instructions — 260731-open-bug-batch-4

上流入力(consumes 全数): code-generation-plan.md — 各 unit の患部テストと落ちる実証の注入面から integration 層の検証手順を導出した。code-summary.md — 各 unit の宣言スイート実績(pass 数・exit code)を期待値とした。

## Unit 別手順

- **fix-1811**(#1811): `bun test tests/integration/t-team-up-codex-resume.serial.test.ts` — fixture 偽 stub の supervisor 孤児を reapSupervisors(SIGTERM→poll→SIGKILL)で回収。run-record 実在ポーリング化。
- **fix-1800**(#1800): `bun test tests/integration/t224-upstream-v2-migration-cli.test.ts` — `expectMigrationExit` 一般化による診断対称化+EAGAIN/EMFILE/ENOMEM 限定 spawn リトライ(最大2回)。リトライ発火条件3面をテスト固定。
- **fix-1797**(#1797): `bun test tests/integration/t259-guard-corpus.test.ts` — 交互計測(A,B,A,B)で時間窓共有、RSS は per-process 維持。burst スイープでレンジ幅 0.748→0.087 を実測、閾値 2.5 据置き。
- **fix-1816**(#1816): `bun test tests/integration/t374-amadeus-mirror-completion-status-view.integration.test.ts` — FR-4b' の currentStatus 導出+ネガティブコントロール(実 drift は依然 diverged)。t232/t361 無改変 green 維持。

## 実行結果

各 unit の PR CI(17 checks 級)で全 green を確認済み。main worktree のフルベースライン(674 files)で integration 層 332 files 全 green(build-test-results.md 参照)。conductor 裏取り: fix-1816 は t374+t281 = 10 pass を builder worktree で直接実測。
