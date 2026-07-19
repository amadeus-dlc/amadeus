# Code Generation 計画承認 — U2 層責務仕様・tier gate 設計・予算ガイドライン

**人間承認:** 2026-07-17T21:53:40Z — ユーザーが Q1 の `1`（A: Approve Plan）を選択。

## 既決事項

- 本 intent は層責務、tier-aware gate、比率目標、実行時間予算の設計・証拠を record 化する。application code、test、runner、collector、CI、repository docs、package、`dist/`、#1157、強制 gate は変更しない。
- baseline は current HEAD のクリーンな detached worktree で、smoke / unit / integration / e2e を同一条件・直列で各1回だけ観測する。現在の dirty な t115 / t118 は測定面から除外する。
- baseline 後に試行回数・集約式・余裕率を人間へ直接確認し、承認前は追加 trial を行わない。追加測定後、4 tier の予算状態（数値候補または`PENDING`）を人間へ再度確認し、承認前は秒数を確定しない。
- ソロモードのため選挙・agmsgは使わない。未承認または測定不成立の予算は `PENDING` を維持する。

## Q1: U2 Code Generation 計画を承認しますか

A. **Approve Plan（推奨）** — `code-generation-plan.md` の Step 1〜8を順に実行する。まずクリーン環境で4 tierを各1回だけ観測し、その後の測定 protocol と最終予算値を別々の人間確認で確定する。
B. **Request Changes** — 計画を修正して再提示する。変更したい Step または境界を指定する。
X. **Other** — 別の進め方を指定する。

[Answer]: A — Approve Plan（ユーザー回答: `1`）

## Q1a: [PR #1183](https://github.com/amadeus-dlc/amadeus/pull/1183) rebase後の測定基準をどう扱いますか

[PR #1183](https://github.com/amadeus-dlc/amadeus/pull/1183) rebase後の current HEAD `244a196795f8b23192ed54dc1221b75d0c8e8f44` は、U1 measurement ref `3917a283a953165866170d235d3dc25ad2fd3643` に対して test files が7件（追加2・変更5）変化している。

A. **新HEADでU2 baselineを測定（推奨）** — U1台帳は旧refのスナップショットとして保持し、7件のdriftとref分離を明記したうえで、U2 runtime baselineを新HEADで測定する。
B. **U1台帳から再構築** — U1分類台帳を新HEADで再測定・再レビューしてからU2へ進む。
C. **Baselineを保留** — rebase完了地点で停止し、U2測定は開始しない。
X. **Other** — 別の扱いを指定する。

[Answer]: A — 新HEADでU2 baselineを測定（ユーザー回答: `1`、2026-07-17T22:28:47Z）

## Baseline observation（2026-07-17T22:32:14Z〜22:39:21Z）

- Subject ref: `244a196795f8b23192ed54dc1221b75d0c8e8f44`
- U1 measurement ref: `3917a283a953165866170d235d3dc25ad2fd3643`（旧台帳スナップショット）
- Host / OS / Bun: `j5ik2o-mac-studio.lan` / macOS 26.5.1 arm64（build 25F80）/ Bun 1.3.13
- Execution: clean detached worktree、同一host、直列、`--parallel`なし、smoke → unit → integration → e2e、各1回、warmup/retryなし
- Raw evidence: `/tmp/amadeus-u2-rebased-baseline.KXl1Ip/evidence`（53 files、SHA-256検証済み）

| tier | exact command | test files | assertions | failed | explicit skipped files | exit | wall-clock |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| smoke | `bash tests/run-tests.sh --smoke` | 14 | 343 | 0 | 0 | 0 | 11.35秒 |
| unit | `bash tests/run-tests.sh --unit` | 212 | 2,998 | 0 | 0 | 0 | 101.82秒 |
| integration | `bash tests/run-tests.sh --integration` | 148 | 1,943 | 2 files / 5 assertions | 24 | 2 | 218.73秒 |
| e2e | `bash tests/run-tests.sh --e2e` | 69 | 146 | 0 | 33 | 0 | 45.01秒 |

assertion-level skip数はrunner非公開のため `N/A` とする。integrationのfailed filesは `t-team-up-codex-resume.test.ts` と `t-team-up-msg-backend.test.ts` で、7件のtracked drift対象には含まれない。integration/e2eの明示skip理由はすべて `Claude substrate unavailable` である。

## Q2: 追加測定protocolを承認しますか

A. **Fail-closed部分測定（推奨）** — exit 0・failed 0・explicit skip 0だったsmoke/unitだけを、同一ref・host・clean worktreeで追加2回ずつ測定して合計3観測にする。各tierの3観測がすべて同じfiles/assertionsで有効な場合だけ、`ceil(max(wall_seconds) × 1.25)` をbudget候補とする。outlier除外・retryはしない。integration/e2eは追加測定せず、budgetを `PENDING` に保つ。
B. **全tierを追加測定** — 4 tierを同じ固定順で追加2 cycle実行する。ただしbaselineを含む1観測でもnonzero・failed・skip・件数不一致なら、そのtierのbudgetは `PENDING` とする。integration/e2eの不完全観測が既にあるため、追加コストを払っても現protocolでは数値化できない。
C. **追加測定なし** — 4 tierすべてのbudgetを `PENDING` に保ち、baseline observationだけを正式recordへ残す。
X. **Other** — 試行回数、集約式、余裕率、失敗・skipの扱いを別途指定する。

[Answer]: A — Fail-closed部分測定（ユーザー回答: `1`、2026-07-17T22:49:28Z）

追加実行順はbaselineのtier順を保つ部分cycleとして、`smoke trial 2 → unit trial 2 → smoke trial 3 → unit trial 3` に固定する。各invocationは1回だけとし、warmup、retry、outlier除外、integration/e2eの追加実行は行わない。

## 追加測定 observation（2026-07-17T22:50:22Z〜22:55:19Z）

- Subject ref / host / OS / Bun / worktree: baselineと同一。全trialで実行前後clean、detached HEAD一致を確認した。
- Execution: `smoke trial 2 → unit trial 2 → smoke trial 3 → unit trial 3` の固定順、個別process、各1回。integration/e2e追加実行、warmup、retry、未承認trialは各0回。
- Runner SHA-256: `tests/run-tests.sh` = `5d46525d488cd15f47cf06d397c9a63f9738723db8a77aaab3556c1444d2529e`、`tests/run-tests.ts` = `b2ee360949bb305b8583db6741cbd06f4aed357e747c958f0d8c480d38e26959`。
- Evidence anchors: baseline 53-file manifest digest `dab2c6baf433700aae992e4a13968d48074c3e7e9aa0b6c30e80aeb25c333262`、追加42-entry manifest digest `b9035ec293499b52ef841637b3c9cdfa27396796ff697b65c00efb9b4a8d7be0`、追加raw-hash list digest `1bd2f672f0da065aef4987f612a7fc53367e2e216cb59d053e03eedadc782842`。baseline raw hashは追加測定前後で一致した。
- Dependency条件: ignored `node_modules` directoryへsource worktree由来のtop-level symlink 225件を構成した。source worktree自体は実行に使っていない。

| tier | trial | started / finished (UTC) | test files | assertions | failed | explicit skipped files | exit | wall-clock |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| smoke | 1 | 22:32:14 / 22:32:26 | 14 | 343 | 0 | 0 | 0 | 11.35秒 |
| smoke | 2 | 22:50:22 / 22:50:38 | 14 | 343 | 0 | 0 | 0 | 16.10秒 |
| smoke | 3 | 22:53:05 / 22:53:20 | 14 | 343 | 0 | 0 | 0 | 14.81秒 |
| unit | 1 | 22:32:40 / 22:34:22 | 212 | 2,998 | 0 | 0 | 0 | 101.82秒 |
| unit | 2 | 22:51:03 / 22:52:42 | 212 | 2,998 | 0 | 0 | 0 | 99.19秒 |
| unit | 3 | 22:53:43 / 22:55:19 | 212 | 2,998 | 0 | 0 | 0 | 96.91秒 |

6観測はいずれもtier内でfiles/assertionsが一致し、exit 0、failed 0、explicit skipped files 0であるため候補算出条件を満たす。shell timingが保持した小数第2位までの値を入力とし、表示値から追加の丸めや外れ値除外は行わない。

| budget key | 入力 | 計算 | Q3回答前の状態 |
| --- | --- | --- | --- |
| `TIME_BUDGET_SMOKE_SECONDS` | `max(11.35, 16.10, 14.81) = 16.10` | `ceil(16.10 × 1.25) = ceil(20.125) = 21` | 候補21秒、未承認のため`PENDING` |
| `TIME_BUDGET_UNIT_SECONDS` | `max(101.82, 99.19, 96.91) = 101.82` | `ceil(101.82 × 1.25) = ceil(127.275) = 128` | 候補128秒、未承認のため`PENDING` |
| `TIME_BUDGET_INTEGRATION_SECONDS` | baselineがexit 2、failed 2 files / 5 assertions、skip 24 files | 承認済みprotocolでは追加測定・算出なし | `PENDING` |
| `TIME_BUDGET_E2E_SECONDS` | baselineがskip 33 files | 承認済みprotocolでは追加測定・算出なし | `PENDING` |

## Q3: 4 tierのbudget状態を承認しますか

A. **候補とPENDINGを承認（推奨）** — smokeを21秒、unitを128秒のguidelineとして正式recordへ採用し、integration/e2eは`PENDING`を維持する。いずれもverdict、exit code、runner、CI gate、設定定数へ接続しない。
B. **値または測定protocolを修正** — 修正対象tier、値・式または追加測定条件を指定する。新しい実行は別途明示承認されるまで開始しない。
C. **数値候補を採用しない** — 4 tierすべてを`PENDING`として正式recordへ残し、追加測定結果はobservationだけにする。
X. **Other** — 別のbudget状態または扱いを指定する。

[Answer]: A — 候補とPENDINGを承認（ユーザー回答: `推奨`、2026-07-17T23:02:06Z）
