# コード生成サマリー

## 結果

[Issue #2018](https://github.com/amadeus-dlc/amadeus/issues/2018) に対し、承認済み Comprehensive 計画の実装・検証を完了した。project-level plugin opt-in を唯一の導入意思とし、7 face / 6 host の各 lifecycle から現在 host だけを再調整する。未選択 repository は zero-impact、formal-model-check は明示 stage 実行だけに限定され、セッション開始や checkpoint から TLC を自動実行しない。

Architecture Review Iteration 1 の BLOCKER 3件と MAJOR 2件は、cross-harness E2E、全 failure injection、doctor 6状態、同一 runner 性能測定、共有 readiness seam、計画チェック更新によって解消した。

## 主な変更

- `<project>/amadeus/config.json` に project-only `plugins` closed schema を追加し、名前検証、重複拒否、昇順正規化、既定値 `[]` を実装した。
- `amadeus-plugin-selection.ts` に `not-selected` / `source-missing` / `not-installed` / `stale` / `current` / `failed` の観測、atomic config write、project/source/host snapshot、rollback を集約した。rollback 時に開始前にはなかった空 `plugins/` が残る欠陥も failure injection から発見し修正した。
- plugin CLI を desired state 基準へ変更した。現在 host の materialize/compose/drop、複数 plugin の plugin 単位部分成功と再試行、install/drop の4面補償、doctor/status の状態表示を実装した。
- install は project supply copy、host staging copy、transaction verify、recompile、runner generation、config commit の全失敗点を補償する。drop は plan拒否、verify、recompile、runner generation、config commit の全失敗点で実行前状態へ戻し、user-managed staging とproject supplyを保持する。
- `amadeus-plugin-compose.ts` の非ブロッキング契約を保ち、失敗警告へ対象 host と正確な再試行コマンドを1回だけ含めた。
- OpenCode の `session.created` から現在の `.opencode` へ auto-compose を接続し、manual-only 分類を廃止した。
- `evaluateTlaModelReadiness` を共有 seam とし、activation と明示 TLA loader の双方が strict model-map parse と model/cfg asset existence を同じ語彙で判定するよう統合した。zero/add/delete/invalid と過去成功 verdict の意味を固定した。
- dogfood opt-in、7 harness の配布生成物、self-install 面、英日ガイド・リファレンス、plugin README、coverage registry/ratchet を正本から同期した。

## Comprehensive 検証結果

- 共有 readiness seam: 8ファイル、88 test、266 assertions、失敗0。zero/invalid、model/cfg不足、add/delete/restore、past-success保持、明示 loader を検証した。
- 対象回帰: 24ファイル、267 test、1,608 assertions、失敗0。
- Cross-harness E2E: 8 test、322 assertions、失敗0。fresh 7 face / 6 host、現在host限定、全face未選択zero-impact、config/graph不変、advisoryなし、TLC stateなしを検証した。
- 3 checkpoint parity: Requirements Analysis / Functional Design / Build and Test の main と `--single` で構造化 advisory が byte-equal、3/3成功。
- 原子性・回復: install 18/18、drop 11/11、reconciliation 5/5成功。複数 plugin の部分成功は `alpha=1回`、失敗 plugin は retry を含め `beta=2回` のapplyとなり、成功済み plugin を再適用しない。
- Doctor: 6状態すべての表示と exit 寄与の全数写像、16/16成功。
- 性能: 同一 runner で unselected/current を各100回、初回導入を baseline/auto 各30回交互測定した。p95 は unselected `0.022ms → 0.708ms`、current `1.155ms → 5.116ms`、初回 `30.513ms → 15.500ms` で、`max(20%, 25ms)` / `max(20%, 50ms)` の全予算内だった。
- TypeScript: `bun run typecheck` 成功。
- Lint: `bun run lint` 成功。既存許容の warning 372件、info 22件、exit 0。
- Complexity gate: `handleInstall` の初回 CCN 17 検出を結果処理分離で解消。新規違反0、regression 0。
- Full CI: coverage registry/ratchet の初回 drift を正規生成コマンドで同期後、`bun run test:ci` を再実行し exit 0。739ファイル、10,000 assertions の全suiteが成功した。live SDK/substrate は資格情報・substrate unavailable の正規skip契約に従った。
- Drift guard: `package --check`、`promote:self:check`、distribution check が成功し、生成面は正本と同期した。

## 計画との差分

- 6状態 doctor の全数写像は `t313-doctor-plugin-section.test.ts` から canonical `doctorPluginRows` を直接通し、実FS状態は `t339` と `t415` selection/reconciliation に分割した。検証範囲は計画と同じである。
- 3 checkpoint × main/single の比較は lifecycle E2E と責務を分け、engine seam を直接駆動する `t381-advisory-checkpoints-latch.integration.test.ts` に置いた。cross-harness E2E は7 faceの実startupと現在host限定/zero-impactを担当する。
- readiness の状態遷移は既存 formal-verif unit名へ分散させず、新しい共有 seam の `t415-formal-model-readiness.test.ts`、実 loader integration、activation real-layout integration で検証した。
- `.codex/.amadeus-plugin-*`、`.codex/plugins/`、`.codex/skills/` は dogfood compose が生成した machine-local/runtime 面であり、正本・配布生成物・commit 対象には含めない。
- commit、push、PR 操作は実施していない。

## 成果物

- 実装計画: `code-generation-plan.md`
- 正本コード: `packages/framework/core/`、`packages/framework/harness/opencode/`、`scripts/plugin-projection.ts`
- 共有 readiness: `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` と `plugins/formal-model-check/tools/`
- 新規テスト: `tests/unit/t415-formal-model-readiness.test.ts`、`tests/integration/t415-plugin-optin-*.test.ts`、`tests/e2e/t415-plugin-optin-cross-harness.serial.test.ts`、`tests/perf/t415-plugin-optin-startup-performance.test.ts`
- 生成面: `dist/` と存在する self-install harness directory
