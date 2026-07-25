# Build and Test Summary — 260725-solo-standing-grants

上流入力（consumes 全数）: `construction/grant-authorization-domain/code-generation/code-generation-plan.md`、`construction/grant-authorization-domain/code-generation/code-summary.md`、`construction/solo-gate-transaction/code-generation/code-generation-plan.md`、`construction/solo-gate-transaction/code-generation/code-summary.md`、`construction/harness-contract-and-regression/code-generation/code-generation-plan.md`、`construction/harness-contract-and-regression/code-generation/code-summary.md`

- U1 の `code-generation-plan.md` / `code-summary.md` — canonical domain の所有境界と audit 投影契約を引き、unit / integration の責務分割根拠とした。
- U2 の `code-generation-plan.md` / `code-summary.md` — directive carrier・route/commit transaction・presence reservation を引き、race / fallback / 監査不変条件の検証対象を確定した。
- U3 の `code-generation-plan.md` / `code-summary.md` — 6 harness 投影と complexity baseline の扱いを引き、drift 検査と `--check` 限定運用の根拠とした。

## ビルド状態と前提

依存は `bun install --frozen-lockfile`。本 intent は依存グラフを変更していない。「ビルド」は canonical source から `dist/<harness>/` 6面と self-install ツリーを再生成する操作であり、`dist:check` / `promote:self:check` がともに exit 0 で同期を確認済み。

## 生成したテスト指示の目録

Test Strategy = **Comprehensive**。`project.md` の比例選定規範に従い、戦略名だけを理由に検査を機械追加せず、承認済み NFR と実在境界へ trace できるものだけを生成した。

| 種別 | ファイル | 生成理由 |
|---|---|---|
| unit | `unit-test-instructions.md` | 中核。純関数層（mode 解決、gate eligibility、carrier / classifier / wire） |
| integration | `integration-test-instructions.md` | 中核。実 FS corpus、transaction、fallback、harness contract |
| performance | `performance-test-instructions.md` | 承認済み NFR **U1-PERF-02**（100 intent / 100,000 events、counter `= E` かつ 5 秒以内）が実在するため |
| security | `security-test-instructions.md` | 承認済み **NFR-03**（Grant Id substitution / cross-intent / forged provenance の fail-closed）が実在するため |

生成しなかったもの: 負荷試験・auto-scaling 検証（デプロイ基盤・常駐 service を持たない）、DAST・network scanning（外部公開エンドポイントなし）、contract/E2E の新規追加（既存 harness contract test が同義性を所有）。

## Unit 別カバレッジ状況

| Unit | 主な検証所有 | 状態 |
|---|---|---|
| `grant-authorization-domain` (U1) | mode 解決、候補投影、完全順序、exact lookup 判別、registry 由来 corpus、receipt lookup、性能 counter | 全 pass |
| `solo-gate-transaction` (U2) | carrier strict wire、route receipt append、lock 内 commit 再検証、typed fallback、fallback 時の body/reviewer/sensor/learnings 増分 0、presence reservation | 全 pass |
| `harness-contract-and-regression` (U3) | 6 harness 投影の同義性、kiro-ide capability 宣言、opencode の mint site 不在、dist / self-install drift 0 | 全 pass |

FR/NFR トレーサビリティは NFR-07（各 FR に最低1 test trace）を満たす。対応表は `unit-test-instructions.md` / `integration-test-instructions.md` / `security-test-instructions.md` / `performance-test-instructions.md` の各表に分割して記載した。

## 実測結果の要約

全数値は `build-test-results.md` に転記済み。要点のみ:

- typecheck / lint / complexity `--check` / dist:check / promote:self:check / coverage registry / `git diff --check` — **すべて exit 0**
- intent スコープ 11 ファイル — **283 pass / 0 fail**、`across 11 files` を DECLARED_PATHS=11 と照合
- 全体スイート `--ci` — exit 3、**Failed files: 3**（Test files 552 / Total assertions 7672 / Failed assertions 3）。3 件はすべて Issue #1481 の既知残赤で、本変更由来の赤は 0 件

## Readiness 評価

| 観点 | 判定 | 根拠 |
|---|---|---|
| Build-ready | ✅ | 配布物・self-install の drift 0、型検査 green |
| Test-ready | ✅（conditional） | intent スコープ全 green。全体スイートは既知残赤 3 件（#1481）を保持したまま |
| Security（対象変更の regression） | ✅ PASS | 全 attack fixture pass、自動 approval 0 件 |
| Security（repository 全体の dependency audit） | ⚠️ CONDITIONAL | `bun audit` exit 1、3 high / 8 moderate / 1 low。全件が dev-only 推移依存で本 intent は依存グラフ未変更。範囲外として別作業へ送る |
| Deployment-ready | N/A | 本プロジェクトはデプロイ基盤を持たない（`project.md` § Deployment）。リリースは release.yml の workflow_dispatch 一本 |

## 既知の制約・未処理事項

1. **Issue #1481** — `t257-status-registry-migration` / `t258-lifecycle-transaction` / `t259-guard-integration` の ref 解決 helper が worktree の common dir を見ないため worktree 実行でのみ失敗する。本 intent の対象外。
2. **dependency advisory 12 件** — `@anthropic-ai/claude-agent-sdk` 推移依存。別作業へ分離。
3. **wall-clock drift 1 件** — `t-codex-hooks-migration.test.ts`（declared=medium / measured=large）。既存の申告済み drift。
