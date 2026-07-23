# re-scan 記録 — 260723-t241-ci-residency

## 実行メタデータ

- Date: 2026-07-23T00:57:42Z（scan-notes 実行時刻の転記）
- Intent: `260723-t241-ci-residency`（[Issue #1294](https://github.com/amadeus-dlc/amadeus/issues/1294) — `tests/e2e/t241-election-machine-executor.test.ts` のヘッダが「CI-resident」（FR-0 機械実行器の常設証明、ADR-6 layer (i)）を自称するが、PR CI（`--ci`）は e2e 層を実行しない）
- Scope: `bugfix`（Depth Minimal）
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: differential refresh（cid:reverse-engineering:c1、E-L63 の base 選定則）。base `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`（前回 scan `260722-teamup-prompt-race` の observed、`re-scans/` 到達可能 observed のうち HEAD 祖先で距離最小）、observed `78bce87615b985d0151f604c915c6aab1d6ba9f1`（現 HEAD 実測 `git rev-parse HEAD`）、`git merge-base --is-ancestor base HEAD` exit 0、distance `git rev-list --count base..HEAD`=35。Developer スキャン→Architect 合成の直列（cid:reverse-engineering:c3）。
- 測定 ref: 全 file:line は Observed=HEAD `78bce876` のワークツリー実ファイル直読（Developer scan、cid:measurement-ref-in-artifacts）。区間件数（35）・diff 規模（224 files, +10774/−16）はコマンド出力からの転記（numbers-from-command-output-only）。確約級引用（t241 ヘッダ :1、ADR-6 :41-48、run-tests.ts :197-202/:124-127、package.json :14-16）は scan-notes verbatim の転記。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。

## diff 規模（機械集計、ref = base..HEAD）

- `git diff --shortstat a81c11dde..HEAD`: `224 files changed, 10774 insertions(+), 16 deletions(-)`（scan-notes 転記）。
- ディレクトリ別: `amadeus/` 220（大半は前 intent `260722-teamup-prompt-race` の record/audit + codekb re-scan + memory）、`tests/` 3、`scripts/` 1。
- **★本バグ面は base..HEAD で無変更**: `git diff --numstat <base>..HEAD -- tests/e2e tests/run-tests.ts tests/run-tests.sh tests/gen-coverage-registry.ts .github/workflows package.json` = **0 行（出力空）**。欠陥コードは base より前（intent `260718-election-ts-foundation`、導入 PR #1235）に導入済みで、本区間 35 コミットとは無交差。

## 現行結論（原因所在）

**確定した機構（静的読解）**: `tests/e2e/t241-election-machine-executor.test.ts` は FR-0 layer (i) の機械実行器（`scripts/amadeus-election.ts` を `spawnSync`（bun）で子プロセス起動し `next` 指令 JSON を字義実行する LLM 無知識ループ、テスト2件 E-EXEC1 :91-111 / E-EXEC2 :113-140、guard=30、外部 fixture 無し）だが、ヘッダで「CI-resident」を自称しながら自動 CI では一度も実行されない。

- ヘッダ verbatim（:1）: `// t241 — FR-0 machine executor (ADR-6 layer (i), CI-resident, Bolt 4).`。本文（:4-5）は「strongest standing proof of FR-0」= 常設保証を主張。
- **--ci tier = e2e 非実行**: `run-tests.ts:197-202` の `--ci` 実装は `runSmoke/runUnit/runIntegration=true`（runE2e 非設定）。Usage banner :124-127 も `--ci` = smoke+unit+integration、`--release`/`--all` = +e2e と明記。`--release`/`--all`（:203-211）のみ `runE2e=true`。banner :148 が「All levels (hours)」と重量を明記。
- test scripts（`package.json:14-16`）: `test:ci`/`coverage:ci` は共に `--ci`、`test:all` は `--all`。e2e を走らせるのは `test:all`（ローカル手動）のみ。
- 自動 CI 3 ワークフロー: `ci.yml`（:114/:152/:227 が `test:ci`/`coverage:ci -- -P 4`、`--e2e`/`--release`/`test:all` 0 ヒット、トリガー :8 push:main + :13 pull_request）、`release.yml`（test 実行ステップ無し、publish のみ）、`formal-verification.yml`（:12 `workflow_dispatch` のみ、e2e ランナー無関係）。**e2e 層（t241 含む 75 ファイル）はいずれの自動 CI でも実行されない**。

**原因の所在（cid:bug-intent-linkage）**: **設計は正・実装が逸脱**。ADR-6（`application-design/decisions.md:41-48`）Decision verbatim は layer (i) 機械実行器を「これが選挙1件を完走できることを **integration テストで固定する**」と明記。t241 ヘッダ自身も「ADR-6 layer (i), CI-resident」を引く。にもかかわらず実装（#1235）は `tests/e2e/` に配置し、CI 実行範囲（--ci に e2e 非含有）との整合検証を欠いた。導入 intent は `260718-election-ts-foundation`。

## 対照・回復先（integration precedent と設計権威）

- **ADR-6 が権威**: layer (i)=integration、layer (ii)=非 CI subagent 実演の二層（`decisions.md:41-48`）。FR-0 受け入れ基準の「e2e で実証」文言（requirements.md）は layer (ii)（fresh session 断面の受け入れ実演）に対応し、layer (i) 機械実行器は integration が正配置。t241 の正しい tier は **integration**。
- **integration precedent**: `tests/integration/` に `amadeus-election.ts` を spawn する兄弟テストが 6 ファイル既存（`grep -rln amadeus-election tests/integration` = 6: t235-election-store / t236-election-loop / t240-election-transport / t242-election-skill-vocabulary / t244-election-tie-choice + t-formal-verif-arm-s-blind）。同型の「CLI spawn 選挙テスト」が既に integration tier で `--ci` により CI 実行済み。
- **size purity**: t241 は spawnSync + fs → `classifyTestSize`=medium（signals `t-test-size-drift.test.ts:66-69`）。integration の MAX=medium（`test-size.ts:161-166`）。→ 移設で purity 違反なし（clean）。unit へ移すと small 違反。
- **registry 影響小**: t241 は `tests/gen-coverage-registry.ts` 未登録（`grep t241` = 0 ヒット）。wiring 行の coverage は in-process の t236（integration tier）が所有（spawn は bun --coverage の盲点）。移設後に `covers:` claim を書く場合のみ registry 再生成が必要。
- **sibling 健全例（t237）**: `tests/e2e/t237-election-walking-skeleton.test.ts:1-5` はヘッダで「Layer: e2e」と正直宣言し **CI-resident を自称しない**。矛盾は t241 単独（e2e 配置 × CI-resident 主張）。

## 修正候補3案に効く実測（トリアージ用）

| 候補 | 実測事実 | 評価 |
| --- | --- | --- |
| (1) t241 を integration 層へ移設 | size purity clean（spawn→medium ≤ integration MAX）、precedent 6 本、**ADR-6 が layer (i)=integration と明記**、registry 非参照 | **最有力＝設計本来配置への回復**。size purity・precedent・design authority すべてが支持 |
| (2) ci.yml に e2e ジョブ追加 | e2e 75 ファイル、`--release`=「hours」、TUI/worktree 重量テスト含む | コスト過剰（t241 1 本のため e2e 層全体を PR CI へ持込）。ADR-6「flaky な LLM テストを CI に持ち込まない」思想とも緊張 |
| (3) ヘッダ表明を release-tier へ後退 | FR-0 常設保証は ADR-6 Consequences で「決定的テスト（CI）が担う」と明記 | 「standing proof」が弱まる。設計逸脱の追認になりうる |

## 未決点（requirements / Architect へ）

1. 移設方式: 改名（`t241-*.integration.test.ts` — 兄弟が suffix 採用）vs 単純ディレクトリ移動。改名時は参照（`gen-coverage-registry.ts` の EXPECTED_NONE_TO_CLI、`docs/reference/09-testing.md`、他テスト参照）への伝播棚卸しが必要（scan-notes §4）。
2. t241 が将来 `covers:` claim を持つ設計にするか（registry 登録要否）— 現状 t236 が wiring coverage を所有、t241 は契約テスト専任の可能性が高いが要確認。
3. FR-0 要件「e2e で実証」と ADR-6「integration で固定」の traceability を修正 PR で明記するか（layer (i)/(ii) 二層化で解消済みだが requirements-analysis で確定すべき）。
4. t241 / e2e 層の実測実行時間（秒）は本 RE 未計測（規律上の長時間 --e2e 実行回避）。候補1の integration 予算増分・候補2の CI 増分の定量化は別途要実測。
