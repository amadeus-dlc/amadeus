上流入力(consumes 全数): HANDOFF.md, amadeus-state.md, requirements.md, unit-of-work.md, unit-of-work-story-map.md, business-logic-model.md, business-rules.md, domain-entities.md, frontend-components.md, performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, performance-design.md, security-design.md, scalability-design.md, reliability-design.md, logical-components.md, nfr-design-questions.md, U1-size-ledger/code-generation/code-summary.md, code-generation-questions.md, tests/run-tests.sh, tests/run-tests.ts

# Code Generation 計画 — U2 層責務仕様・tier gate設計・予算ガイドライン

## 計画状態と境界

- Q1、Q1a、Q2、Q3、Step 1〜8、architecture review READY、manual `answer-evidence` fireは完了した。auditの`SENSOR_PASSED`（fire id `f5da0a46`）を確認済みであり、次はengineへ戻る。`linter` / `type-check`はmatching code outputがないためN/A。memory、stateは直接編集していない。
- User Stories stage はスコープ上 SKIP のため、`unit-of-work-story-map.md` の U2「是正基準の確立」をユーザー価値の正本とし、FR-2 / FR-3 / FR-5へ直接追跡する。
- U2 の正式成果は `construction/U2-layer-spec-gate/code-generation/code-summary.md` だけである。`code-generation-questions.md` は二段階の人間判断と測定証拠を保持する制御記録としてのみ作成する。
- application code、test、runner、collector、CI、repository docs、package、`dist/`、tier-aware gate実装、比率・予算の強制化、#1157は変更しない。
- 比率目標と実行時間予算はガイドラインであり、verdict、exit code、CI gateへ接続しない。

## 実行計画

- [x] **Step 1: 測定面と保護境界を固定する**
  - [PR #1183](https://github.com/amadeus-dlc/amadeus/pull/1183) rebase後の current HEAD `244a196795f8b23192ed54dc1221b75d0c8e8f44` と measurement ref `3917a283a953165866170d235d3dc25ad2fd3643` の実在を確認する。`tests/` と `scripts/metrics-snapshot.ts` の relevant tracked tree差分は7件（追加2・変更5）であり、2026-07-17T22:28:47Z に人間が選択肢1を承認したため、U1台帳は旧refのスナップショットとして保持し、U2 runtime baselineはrebase後HEADで新規観測する。7件のdriftと両refを正式recordへ明記する。
  - repo外の `mktemp` 配下へ current HEAD の clean detached worktreeを作り、現在worktreeのdirtyな t115/t118を測定面から除外する。
  - host、OS、Bun version、ref、runner file hash、直列条件を採取し、raw stdout/stderr・時刻証拠はrepo外へ置く。
  - 完了証拠: `/tmp/amadeus-u2-rebased-baseline.KXl1Ip`。detached HEAD・branchなし・tracked status cleanを確認し、依存解決用のignored `node_modules` symlink farmをenvironmentへ明記した。
  - Trace: FR-5 AC-5a、PERF-D4、SCAL-D4、FR-7。

- [x] **Step 2: 4 tierのbaseline observationを各1回だけ実行する**
  - 同一host/OS/Bun・同一clean detached worktreeで、`bash tests/run-tests.sh --smoke`、`--unit`、`--integration`、`--e2e` をこの順に個別プロセスで各1回だけ実行する。`--parallel` は指定せず、runner既定値1のCI同様の直列条件を維持する。
  - 各実行について exact command、observed ref、開始/終了、wall-clock、exit code、test files、assertions、failed/skipped countをstdout/exitから採取する。
  - この4回はプロトコル選定用のbaselineであり、最終trial数を既決にしない。非zero・skip・欠測を成功値へ縮退させず、そのまま観測結果として扱う。
  - 完了証拠: `/tmp/amadeus-u2-rebased-baseline.KXl1Ip/evidence`。fixed orderの4 invocation、warmup/retry/additional trial 0件、53 evidence filesのSHA-256、実行前後cleanを確認した。smoke/unitはexit 0・skip 0、integrationはexit 2・failed files 2・skip 24、e2eはexit 0・skip 33として未縮退で保持する。
  - Trace: FR-5 AC-5a、PERF-3、PERF-D4、REL-D3。

- [x] **Step 3: baseline証拠と測定protocol推奨案を人間へ直接提示する**
  - `code-generation-questions.md` に4 tierのcommand/ref/host/OS/Bun/count/exit/wall-clockを転記し、baselineから試行回数、集約式、余裕率の推奨案と根拠を導出する。
  - ソロモードとして選挙・agmsgを使わず、人間へ直接「推奨protocolを承認 / 修正」を提示して停止する。
  - 明示承認までは追加trialを1回も実行せず、`TIME_BUDGET_{TIER}_SECONDS` の秒数候補も確定しない。
  - Trace: FR-5 AC-5a、PERF-D4、nfr-design-questions Deferred。

- [x] **Step 4: 承認済みprotocolだけで追加測定する**
  - Step 3で人間が承認した試行回数・集約式・余裕率だけを適用し、同一ref・host/OS/Bun・clean detached worktree・直列条件で必要な追加trialを実行する。
  - 各trialのcommand、順序、count、exit、wall-clockを質問ファイルへ追記し、失敗・skip・外れ値の扱いも承認済み式どおりに記録する。未承認の再試行や都合のよい除外は行わない。
  - protocolが承認されなければ本Stepを実行せず、予算値はPENDINGを維持する。
  - 完了証拠: 2026-07-17T22:50:22Z〜22:55:19Zに、`smoke trial 2 → unit trial 2 → smoke trial 3 → unit trial 3`を各1回だけ実行した。4回ともtrial 1とfiles/assertions/exit/failed/skippedが一致し、同一ref・host・cleanを確認した。integration/e2e追加実行、warmup、retry、未承認trialは0件で、追加manifestのSHA-256検証も通過した。
  - Trace: FR-5 AC-5a、PERF-D4、SCAL-D4、検証劇場禁止。

- [x] **Step 5: 4 budget状態を人間へ直接提示して再度停止する**
  - 承認済みprotocolと実測だけから `TIME_BUDGET_SMOKE_SECONDS`、`TIME_BUDGET_UNIT_SECONDS`、`TIME_BUDGET_INTEGRATION_SECONDS`、`TIME_BUDGET_E2E_SECONDS` の4状態（数値候補または`PENDING`）を導出し、式・入力trial・丸め・余裕率を質問ファイルで再現可能にする。
  - 選挙・agmsgを使わず、人間へ4状態を直接提示する。明示承認後だけ有効測定を持つtierの数値を正式値として採用し、拒否・保留・測定不成立のtierは`PENDING`のままにする。
  - 候補または承認値をrunner、CI、設定、定数コードへ書かず、強制gateへ接続しない。
  - 完了証拠: 2026-07-17T23:02:06Zにユーザーが推奨案を承認した。`TIME_BUDGET_SMOKE_SECONDS=21`、`TIME_BUDGET_UNIT_SECONDS=128`をguidelineとして採用し、integration/e2eは`PENDING`を維持する。
  - Trace: FR-5 AC-5a/AC-5b、PERF-3、PERF-D4。

- [x] **Step 6: U2設計契約を`code-summary.md`へ正式record化する**
  - 4 NamedTier policyを唯一の表として記録する: `unit→small`、`integration→medium`、`e2e→large`、`smoke→medium`。補助tier registry初期値は `harness | lib` とし、unknown tierを補助扱いせずinvalidとしてfail-closedにする。
  - `LedgerBuildOutcome → TierEvaluationResult` の `admission-rejected / complete / indeterminate`、3 reject reason、3 diagnostic kind、`file→tier→measured`優先順位、1行1診断、安定順序、count invariantsを記録する。実装済みとは主張しない。
  - 比率ガイドライン `small≥50% / medium≤45% / large≤5%` と現状 `13.6% / 85.7% / 0.68%`、442行・governed 440・auxiliary 2・violation 163の由来refを記録する。
  - baseline、承認済みprotocol、追加trial、budget導出式、人間判断を記録し、Step 5承認時だけ有効測定を持つtierのbudget秒数を確定する。integration/e2eを含む未承認・測定不成立のtierは`PENDING`と理由を記録する。
  - 現行purity ratchetの存在、target policyとの差、既存declared-vs-measured gateの非破壊温存、将来は単一policyへ収束し二重gateを作らない方針を記録する。
  - Trace: FR-2 AC-2a〜2c、FR-3 AC-3a〜3c、FR-5 AC-5a/5b、LOG-D1〜D4、REL-D1〜D4。

- [x] **Step 7: recordの再現性・完全性をread-only検証する**
  - 質問ファイルのraw evidenceと`code-summary.md`のcommand/ref/host/Bun/count/exit/wall-clock、集約式、budget状態が一致することをrepo外の一時validatorで照合する。
  - policy 4件、auxiliary registry、failure/result/diagnosticの閉包、不変条件、比率の分子・分母、budgetの承認状態を機械照合する。PENDINGをPASSや0秒へ変換しない。
  - 比率/予算がguidelineであり、tier verdict、exit code、CI gateへ接続されていないことを文面とdiffの両方で確認する。
  - Trace: FR-2、FR-3、FR-5、PERF-D5、REL-D3、SEC-D1/D2。

- [x] **Step 8: 最終diffと一時測定面を検査・片付ける**
  - 本作業によるrecord変更が本計画、`code-generation-questions.md`、`code-summary.md`だけであることを確認する。
  - application code、tests、`tests/run-tests.sh`、`tests/run-tests.ts`、collector、CI、repository docs、package、`dist/`、#1157、state、memoryに本作業由来の変更がないことを確認する。質問回答などframework経由のaudit eventは期待されるため、手編集がないこととevent内容を確認する。sensor/engineはStep 8内では実行しない。
  - repo外のdetached worktreeと一時証拠領域は対象path/refを再確認してから安全に片付け、正式recordだけを残す。
  - 完了証拠: 2026-07-17T23:15:48Zにsubject ref、clean、manifestを再確認してdetached worktree登録を解除した。直接削除は安全ポリシーにより実行されなかったため、evidenceを復元可能な`/Users/j5ik2o/.Trash/amadeus-u2-rebased-baseline.KXl1Ip-20260717T231331Z`へ移動した。旧中断baseline `/tmp/amadeus-u2-baseline.dKQLzy`は保持した。
  - Trace: FR-7、HANDOFF継承制約、LOG-D5。

## generic code/test必須項目の適用判定

generic stageのapplication code・test files・test configuration必須規定は、承認済みのFR-7、U2 Unit境界、HANDOFF、人間指示の「設計/ガイドラインの正式record化のみ」と衝突する。本ユニットには新しいexecutable behaviorがないため、次を反証可能なN/Aとする。これはPASSや後続Build and Testへの先送りではない。

| generic項目 | 判定 | 根拠 |
| --- | --- | --- |
| Business logic / API / repository / DB / UI | N/A | 判定IF・型・diagnosticsは設計契約のみ。実装、adapter、endpoint、永続化、UIは承認済みOut |
| Application code | N/A | tier policy、registry、evaluation resultの実コードとpurity ratchet収束は別intent |
| 新規unit/integration/E2E test files | N/A | executable deltaがなく、既存runnerは時間観測のためread-only再利用するだけ |
| Test configuration | N/A | Bun設定、runner、parallelism、CI profileを変更しない |
| Repository docs / package / deployment / IaC | N/A | 正式成果はintent record内の`code-summary.md`であり、配布・実行・基盤面を持たない |

active Test StrategyはComprehensiveだが、test volume規定は新規実装面に適用される。本Unitでは新規実装面が0であるためtest fileを捏造せず、Step 2/4の既存4-tier実測とStep 7のrecord整合検証を証拠とする。

## FRトレーサビリティ

| 要求 | 対応Step | 完了条件 |
| --- | --- | --- |
| FR-2 / AC-2a〜2c | 6, 7, 8 | named比率目標と現状gapをrecord化し、強制gate・コード変更0件 |
| FR-3 / AC-3a〜3c | 6, 7, 8 | 4 NamedTier policy、smoke=medium、auxiliary/invalid分離、fail-closed設計をrecord化し、実装・CI配線0件 |
| FR-5 / AC-5a/5b | 1〜5, 6, 7 | baseline→protocol承認→追加測定→budget承認を追跡し、未承認ならPENDING、常にguideline |
| FR-7 / HANDOFF Out | 1, 8 | clean detached測定でdirty t115/t118を除外し、保護対象への変更0件 |

## 承認待ち

Q1、Q1a、Q2、Q3の承認、Step 1〜8、architecture review READY、manual sensorのaudit verdict確認は完了した。engine nextへ進む。
