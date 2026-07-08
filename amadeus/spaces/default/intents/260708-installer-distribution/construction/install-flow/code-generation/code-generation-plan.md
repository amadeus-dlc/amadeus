# Code Generation Plan — install-flow(U2 / Bolt 2)

> ステージ: code-generation (3.5) / Unit: install-flow / 作成: 2026-07-08
> 出典: `../functional-design/`(domain-entities・business-logic-model・business-rules・frontend-components=CLI 対話面)、`../nfr-design/logical-components.md`(増分レイアウト)・`performance-design.md`(E2E 計測位置)・`security-design.md`・`reliability-design.md`、`../infrastructure-design/cicd-pipeline.md`(フィクスチャ codeload 形状契約・E2E ネットワークガード)、U1 確定 API(packages/setup/src の実コード)
> テスト戦略: Standard / 承認モード: autonomous(Bolt 1 ゲートで確定 — 本計画は記録用、ユーザーゲートなし)

## 実装スタイル(拘束 — U1 と同一)

- functional-domain-modeling-ts(インスタンスメソッド宣言+internal ファクトリ+コンパニオン static のみ)
- domain ↔ internal 依存規律(値インポート片方向・import type)、modules → domain/ports
- reporter は I/O なし純関数群、console 出力は cli に一元化(SEC-I04)
- ランタイム依存ゼロ。argv 解析は node:util parseArgs、対話は node:readline/promises

## ステップ(トレーサビリティ付き)

- [x] **Step 1: domain/command.ts**(CLI Contract, US-A1/A3)— ParsedCommand(install/upgrade/help の判別ユニオン、サブコマンドなし=ヘルプ)+ UsageError + InstallInputs + internal ファクトリ + ユニットテスト(未知フラグ・欠落値・対称文法)
- [x] **Step 2: domain/harness.ts へ HarnessName.parse 追加**(U1 型への増分 — 片方向値依存規律: harness→command は値、command→harness は型のみ)+ ユニットテスト — 実装注記: ParsedCommand.parse が HarnessName.parse を直接呼ぶ必要があるため、command.ts→harness.ts も値インポートになった(逸脱。理由は report 参照)
- [x] **Step 3: domain/installation.ts**(US-A4, FR-010)— Installation + InstallationEvidence(paths/versionFileContent/anchors 構造化)+ InstallAdmission + テスト(未導入/導入済み/手動導入の判別)
- [x] **Step 4: domain/plan.ts**(FR-007/008)— Plan.forInstall(startedAtIso+backupTimestamp 二重表現、PlanEntry の md5/required をプラン時計算)+ PlanAction/PlanRefusal/PlanSummary + テスト(dispositionFor 委譲・all-skip・refusal 分岐)
- [x] **Step 5: domain/apply-result.ts / verify-result.ts**(FR-013)— ApplyResult(manifestFiles() 射影)+ ApplyFailure + VerifyResult/Check/NextSteps + テスト
- [x] **Step 6: ports/tty.ts + modules/wizard.ts**(US-A2, FR-004)— TtyIO(isTTY/select/input/confirm)、runWizard(欠落入力のみ質問、非 TTY では UsageError)+ fake TtyIO テスト
- [x] **Step 7: modules/applier.ts**(FR-008/009, SEC-I01)— Applier.create(fsWrite): resolveWithin/SafeTargetPath 内包、バックアップ `$namefile.$timestamp.bk`(単一 install 開始時刻)、Plan 実行、失敗時 ApplyFailure + テスト(backup/overwrite/skip/preserve 全 action、途中失敗)
- [x] **Step 8: modules/verifier.ts**(FR-013)— Verifier.create(fsRead): requiredPaths 存在+md5 照合、NextSteps 案内 + テスト(全緑/欠落/改変)
- [x] **Step 9: modules/reporter.ts**(US-A6/A7, FR-011)— 8関数の純関数群(plan 要約・進捗・完了・ClassifiedError 別のエラー文面=rate-limit 待機案内含む)+ テスト(スナップショットではなく意図アサーション)
- [x] **Step 10: cli.ts 本実装**(FR-003, US-A1/A5)— main(argv): parseArgs → wizard 補完 → resolver/fetcher/manifest-io/planner/applier/verifier 配線(ports 組み立てはここが唯一)、`--yes` 非対話、終了コード単一経路、SIGINT/SIGTERM で一時領域破棄(U1 の TmpWrite.remove 配線 — U1 からの持ち越し事項)+ ユニットテスト(配線は fake ポート)
- [x] **Step 11: フィクスチャアーカイブ生成ヘルパー**(U2 提供の共有物)— 既存 `tests/lib/setup-tar-fixture.ts` を基に **codeload 形状(単一トップレベルラッパー)を再現**する `dist/` 由来アーカイブ生成を tests/lib に追加(フラット tar.gz 禁止 — infrastructure-design 契約)
- [x] **Step 12: install E2E**(NFR-001, US-A1)— 子プロセスで `amadeus-setup install --yes ...`(ensureSetupCliBuilt 利用)を起動し fake HTTP 経由 or フィクスチャ注入で一時ターゲットへ導入 → マニフェスト/ファイル検証+起動〜終了の計測(CLI 本体に計測コードを入れない)。実ネットワークテストを書く場合は `AMADEUS_SETUP_E2E_NETWORK=1` の test.skipIf ガード必須
- [x] **Step 13: 統合テスト**(Standard)— resolve→fetch→plan→apply→verify→manifest 書き込みの全経路を fake ポートで
- [x] **Step 14: 検証一式**— `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` / `bun run dist:check` / `bun run promote:self:check` 全グリーン

## ストーリー/要件 → ステップ対応

| 要件/ストーリー | ステップ |
|-----------------|----------|
| US-A1(ワンライナー)/ FR-003 | 1, 10, 12 |
| US-A2(ウィザード)/ FR-004 | 6 |
| US-A3(ヘルプ固定) | 1, 10 |
| US-A4(導入済み保護)/ FR-010 | 3, 4 |
| US-A5(CI 導入 --yes) | 10, 12 |
| US-A6(検証と案内)/ FR-013 | 5, 8, 9 |
| US-A7(エラー表示面)/ FR-011/012 | 9, 10 |
| FR-007/008/009(plan/apply/バックアップ) | 4, 7 |
| FR-016(マニフェスト書き込み) | 10, 13 |
| NFR-001(1分・計測は E2E 側) | 12 |

## スコープ外

- upgrade 実行経路・UpgradeAssessment/UpgradeSource/LegacyLayout(U3)
- pack 契約テスト・publish 手順書(U4)、README 刷新(U5)
