# Code Generation Plan — metrics-publication-convergence

## スコープ根拠

`amadeus-bugfix` では Units Generation と User Stories が設計上 SKIP されているため、本 Unit 名は承認済み要件から `metrics-publication-convergence` と導出した。実装範囲は `requirements.md` の FR-01〜FR-07 / NFR-01〜NFR-03、および Reverse Engineering の「Per-commit Snapshot Publisher / Single Maintenance Publisher」境界を正とする。欠落した Unit・設計成果物の内容は推測しない。

Test Strategy は `Comprehensive`。既存 Bun test 設定を再利用し、新しい test runner・設定ファイル・依存関係は追加しない。

## 実装方針

- Snapshot Publisher は完全 SHA ごとの JSON 1件だけを所有し、`metrics/index.html` と retention 削除へ触れない。
- Maintenance Publisher は安定 branch / PR 1本で index と retention 削除だけを所有し、snapshot JSON を生成しない。
- GitHub/Git の列挙・所有権検証・状態遷移・merge 照合を repo-local TypeScript helper に集約し、workflow YAML の shell は認証・入力受け渡し・summary 出力に限定する。
- `repository_dispatch` の明示要求で Maintenance を起動する。既存 GitHub App の `contents: write` / `pull-requests: write` を超える権限は要求しない。
- 既存自動生成物の destructive recovery は全所有権証拠が一致した対象だけに限定し、API 欠落・未知対象・lease 不一致は変更0件で fail-closed とする。
- 異常を検出した run は、最終状態が収束しても非0を維持する。

## 計画

- [x] **Step 1: Publisher の決定ロジックを RED で固定する。**
  `tests/unit/t222-metrics-publication.test.ts` を追加し、完全 SHA の landed / OPEN / conflicting / closed / branch-only / 複数候補 / 不正 JSON / unknown owner、Snapshot と Maintenance の ownership AND 条件、状態評価順序、sticky failure、cutoff 再評価、lease 不一致、deadline 分類を表形式で検証する。各 Publisher 10〜15件以上の代表ケースを持たせる。対応: FR-01、FR-03〜FR-06、NFR-01〜NFR-03。

- [x] **Step 2: 純粋な状態機械と fail-closed parser を実装する。**
  `scripts/metrics-publication.ts` に候補 inventory、完全 SHA 照合、所有権判定、Snapshot / Maintenance の決定、operation receipt、最終事後条件、polling deadline を実装する。外部 API field は parse-don't-validate で型付き内部表現へ変換し、不完全応答を「候補なし」に丸めない。対応: FR-01、FR-03〜FR-06、NFR-01〜NFR-03。

- [x] **Step 3: Snapshot Publisher の実行境界を RED→GREEN にする。**
  `scripts/metrics-publication.ts snapshot` を command-runner / clock / sleep 注入可能な CLI として実装する。処置前後の全候補列挙、正準 `metrics/snapshot-<40桁SHA>`、JSON-only diff、既存 OPEN 再利用、所有済み異常候補の close + remote-head lease 付き削除、最新 `main` から1回だけの再作成、auto-merge 登録、merge 完了照合、branch 消滅確認、Maintenance dispatch 受付確認を行う。対応: FR-01〜FR-04、FR-06、FR-07、NFR-01〜NFR-03。

- [x] **Step 4: Maintenance Publisher の実行境界を RED→GREEN にする。**
  同 helper の `maintenance` mode に、固定 concurrency 下での cutoff SHA / snapshot 集合、既存 `metrics-retention.ts` と `metrics-visualize.ts` の再利用、安定 branch / PR の create-or-update、観測 remote head を明示した `force-with-lease`、main / remote 前進時の破棄・再計算、no-diff cleanup、auto-merge と最終再照合を実装する。対応: FR-04〜FR-06、NFR-01〜NFR-03。

- [x] **Step 5: CI workflow の所有権を分離する。**
  `.github/workflows/ci.yml` の `metrics-snapshot` から retention / dashboard / `git add -A metrics/` / attempt branch を除去し、完全 SHA の JSON-only Publisher 呼び出しへ置換する。`.github/workflows/metrics-maintenance.yml` を追加し、`repository_dispatch: [metrics-maintenance]`、安定 concurrency group、既存 GitHub App 最小権限、5分 timeout、Maintenance helper 呼び出しを配線する。`push.paths-ignore: metrics/**` と `ci-success` 非依存を維持する。対応: FR-02、FR-04、FR-05、FR-07、NFR-02、NFR-03。

- [x] **Step 6: Git / GitHub 境界の hermetic integration を追加する。**
  `tests/integration/t222-metrics-publication.integration.test.ts` に fake `gh` と local bare remote を用意し、同一 SHA 3回、異なる3 SHA、delayed merge、landed+OPEN、複数 OPEN、conflicting、closed-unmerged、branch-only、unknown owner、API field 欠落、remote-head 変化、timeout、回復後 sticky failure、maintenance coalesce、cutoff/main 前進、no-diff+OPEN を検証する。外部 repository を変更する live E2E は行わない。対応: FR-01〜FR-07、NFR-01〜NFR-03。

- [x] **Step 7: Workflow・既存 metrics 契約の回帰テストを更新する。**
  `tests/lib/ci-snapshot-wiring.ts`、`tests/unit/t222-ci-snapshot-wiring.test.ts`、`tests/integration/t222-ci-snapshot-branch.integration.test.ts` を二 Publisher 構成へ更新し、JSON-only stage、明示 dispatch、stable maintenance branch、固定 concurrency、最小権限、5分 timeout、metrics-only 非再帰、`ci-success` 非依存を固定する。t221 / t231 / t298 の parser・keep-last-360・決定的 index 契約も再実行する。対応: FR-02、FR-04、FR-05、FR-07、NFR-01〜NFR-03。

- [x] **Step 8: 品質ゲートと変更面を検証する。**
  対象 unit / integration、`bun run typecheck`、`bun run lint`、必要に応じ `bun run test:ci` を実行する。新規依存・DB migration・API endpoint・UI・deployment artifact・test config 変更がないこと、Snapshot diff に index / deletion がなく Maintenance diff に snapshot 追加がないこと、同根の旧 attempt branch 契約が残っていないことを `rg` と diff で確認する。対応: 全 FR / NFR。

## Story-to-code traceability

User Stories は scope により SKIP されたため、各 Step は承認済み requirements へ直接追跡する。Step 1〜4 / 6 が収束状態機械、Step 5 / 7 が CI 所有権境界、Step 8 が品質・最小変更制約を実証する。

## 対象外

- metrics JSON 業務 schema、collector、coverage 判定値、keep-last-360 の変更
- scheduler / queue service / database /新規 dependency
- `ci-success` の依存集合変更
- 人間所有または所有権不明な PR / branch の変更
- framework core / dist / self-install 面

## 承認

2026-07-30、ユーザー回答 `1`（Approve Plan）により承認済み。Step 1 から順に実行し、完了直後だけ checkbox を `[x]` に更新する。
