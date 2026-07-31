# 260731-open-bug-batch-4 差分スキャン記録

## 実行メタデータ

- Date: `2026-07-31T05:31:35Z`
- Repository: `amadeus-dlc/amadeus`
- Base commit: `3f73823b1`
- Observed commit: `6e7a9d701d7cf350310a047bc5b70ff18ed15272`
- Distance: `13 commits`
- Ancestry: `3f73823b1` は observed の祖先（`git merge-base --is-ancestor 3f73823b1 HEAD` exit 0）
- Scope: `self-fix` / Brownfield / single repository
- Scan mode: Developer static live-code scan を上流入力にした differential refresh。Architect の引用再確認あり。テスト未実行（`#1811` のみプロセス残留のライブ実測あり）。
- Focus: [#1811](https://github.com/amadeus-dlc/amadeus/issues/1811) P1/S2、[#1800](https://github.com/amadeus-dlc/amadeus/issues/1800) P3/S3、[#1797](https://github.com/amadeus-dlc/amadeus/issues/1797) P3/S4、[#1816](https://github.com/amadeus-dlc/amadeus/issues/1816) P3/S4 の4バグの機序確定と修正面の特定
- Delivery: 1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)

## Base 選定根拠

**今回は merge-base 復元を要さなかった。** 前 intent（260730-open-bug-batch-3）の observed `3f73823b1` は `origin/main` 系譜のコミットとして記録されており、現 HEAD の祖先性が保たれている。

| 記録済み observed | 出自 intent | `git merge-base --is-ancestor <observed> HEAD` |
| --- | --- | --- |
| `3f73823b1` | 260730-open-bug-batch-3 | **exit 0（祖先）**、距離 `13` |
| `c42ef4d77` | 260730-open-bug-batch-2 | exit 1（非祖先） |
| `278d61d8e` | 260730-skill-reviewer-fixes | exit 1（非祖先） |

これは `cid:reverse-engineering:c2-observed-mainline-commit`（observed にはローカル merge コミットでなく `origin/main` 系譜のコミットを記録する）が前 intent で実践された直接の効果である。同 cid の採用以前は3世代連続で非祖先化し、毎回 merge-base 復元と再走査の膨張を招いていた。

`cid:reverse-engineering:rescan-base-ancestry`（日付最新ではなく HEAD の祖先である observed のうち距離最小を選ぶ）に従い、距離最小かつ祖先である `3f73823b1` を採用した。

本 intent の observed `6e7a9d701` も `origin/main` 系譜のコミット（`6e7a9d701 record: sync intent 260730-open-bug-batch-3 completion (3 bug fixes) (#1815)`）である。

既存成果物の履歴節に含まれる file:line は当時の observed 断面に固定されているため、参照する場合は `cid:requirements-analysis:historical-section-cite-check-at-observed` に従い当該 observed で照合する（HEAD 照合は偽陽性を生む）。

## 区間の変化

`3f73823b1..6e7a9d701` は13コミット、`188 files changed, 6355 insertions(+), 424 deletions(-)`（`git diff --shortstat`）。

面別内訳（`git diff --numstat` からのパス分類集計 — `cid:requirements-analysis:numbers-from-command-output-only`、測定 ref = observed `6e7a9d701`）:

| 面 | files | insertions | deletions |
| --- | --- | --- | --- |
| `amadeus/` record | 72 | 2204 | 10 |
| `dist/` | 52 | 1661 | 171 |
| self-install 8面 | 33 | 1164 | 123 |
| `metrics/` | 5 | 286 | 2 |
| **ソース面** | **26** | **1040** | **118** |

ソース面のディレクトリ別内訳:

| ディレクトリ | files | insertions | deletions |
| --- | --- | --- | --- |
| `tests/integration/` | 4 | 574 | 26 |
| `packages/framework/` | 13 | 268 | 24 |
| `.github/workflows/` | 1 | 68 | 22 |
| `tests/unit/` | 1 | 66 | 2 |
| `tests/.coverage-patch-allowlist.json` | 1 | 38 | 38 |
| `docs/guide/` | 2 | 17 | 2 |
| `.gitignore` | 1 | 5 | 0 |
| その他（`specs/tla`、`README.md`、`packages/setup`） | 3 | 4 | 4 |

主要な変化:

| 変化 | 内容 |
| --- | --- |
| 選挙ストアの pending ballot lane（#1773 修正 `25f54b066`） | `amadeus-election-store.ts` `+168/−10`。collecting 中の票を voter 単位の `pending/<voter>.json` へ隔離し tally 時に ledger へ統合。`pendingDir` `:113` / `readPending` `:139` / `appendPending` `:161` / `ballotKey` `:187` / `pendingNotOnLedger` `:197` / `integratePending` `:205`、統合点 `:535` `:540` / `:601` / `:619` / `:663` |
| pending lane の非追跡化 | ルート `.gitignore` `+5`（パターン `amadeus/spaces/*/elections/*/pending/`、コメントに Issue #1773 を明記）+ 7ハーネス `dot-gitignore` 各 `+5` |
| 選挙 view への question / description 搬送（#1772 修正 `75367ba67`） | `amadeus-election-model.ts` `+36/−9`。`SKILL.md` / docs を対訳同期 |
| mirror create 受理判定の反転（#1752 修正 `8a8abf567`） | `succeededMirrorCreateExists`（`amadeus-mirror-state-codec.ts:1731`）を新設し `amadeus-orchestrate.ts:193`（import）/ `:4249`（`const createRan = succeededMirrorCreateExists(stateContent);`）で消費。「Issue が存在するなら create を拒否」→「成功 create receipt が存在すれば受理」 |
| `release.yml` の再実行可能ジョブ分割（#1799 `b488466b8`） | `.github/workflows/release.yml` `+68/−22` |
| テスト | `t373-election-ballot-blind-storage.integration.test.ts` 新規 `+323`、`t265` `+120/−17`、`t223` `+76/−1`、`t234` `+66/−2`、`t236` `+55/−8`、allowlist `+38/−38`（行ピン全面 remap） |
| リリース | `v0.1.7`（`e06b8f601`）、model-map ±4、`metrics/` スナップショット4件 |

構成カウント（`git ls-tree -r --name-only` 実測）:

| 面 | base `3f73823b1` | observed `6e7a9d701` |
| --- | --- | --- |
| core tools `*.ts` | `88` | `88`（**不変** — 新規追加 0件） |
| core sensors | `7` | `7`（不変） |
| core hooks | `12` | `12`（不変） |
| core scopes | `10` | `10`（不変） |

**含意**: 本区間は前 intent（260730-open-bug-batch-3）の3件（#1773 / #1772 / #1752）が**全件着地した**断面である。本 intent の4件はいずれもこれらと機構が重ならない。唯一の接触面は `tests/.coverage-patch-allowlist.json`（本区間で全面 remap、#1816 が再度触れる）である。

## Developer Code Scan の合成結果

| Issue | P/S | 判定 | 確定事項 | 根因確度 | 主対象 | 欠落テスト |
| --- | --- | --- | --- | --- | --- | --- |
| #1811 | P1/S2 | **現存** | fake supervisor stub の不死設計 — `tests/integration/t-team-up-codex-resume.serial.test.ts:218` の SIGTERM ハンドラのみが終了経路、`:219` の `setInterval(() => {}, 1_000);` が event loop を無期限保持。`afterEach`（`:39-41`）は `rmSync` のみで kill/reap 掃引なし。漏洩テスト3本（`:590` `--kill` なし / `:973` 再開後 kill なし / `:1004` adopt 後 kill なし）。**本番は fail-closed 実装済み**（`team-up-codex-safety-wait.ts:643` の `runRecordIsActive` ループ、`:561-582` の `catch` → `false`）。PID 追跡は `team-up.sh:508` の `safety-wait.pid` で可能（`rmSync` 前に掃引必須） | 100%（ライブ実測: 残留84本、全 PPID=1、1 launch = 7 role） | テスト fixture のみ（**本番非改変を推奨** — dist 交差回避） | **プロセス残留を assert するテスト 0件** |
| #1800 | P3/S3 | **現存** | `t224-upstream-v2-migration-cli.test.ts:1411` の素の `expect(collided.status).toBe(1);`。`-1` はテストのセンチネル（`:170` / `:210` の `status: result.status ?? -1`）で signal 終了 or spawn 失敗を意味し、`:311-313` の `test.each` で3分類が契約固定済み。成功系には診断ヘルパー `expectSuccessfulMigration`（宣言 `:218`、メッセージ配列 `:225-238`）が既存するが失敗系の当該行だけが通らない | 患部所在 100% ／ 機序 90%（spawn `EAGAIN` が第一容疑、実測未確定） | テスト診断のみ | 3分類契約は存在するが失敗系に未適用 |
| #1797 | P3/S4 | **現存** | `t259-guard-corpus.test.ts:108` / `:109` の比 `2.5` assert。median は `:46`（宣言）/ `:47-48` で適用済み（t258 裁定の反映）。機序 = `measure(1)`（`:101`）/ `measure(2)`（`:102`）が**逐次に別プロセスを spawn** し別時間窓で計測されるため負荷変動が比を系統的にずらす。**baseline 相関は健全**（`measure(1)` は同じ計算の1倍量 — `cid:code-generation:c1-benchmark-baseline-correlation-verify` が禁じる noop 型空ウィンドウではない）。実測 `2.5065` に対しマージン 0.26%。閾値 `2.5` は初出（`2e157d7fe` #1424）以来不変 | 100% | `tests/integration/t259-guard-corpus.test.ts` + `tests/helpers/guard-corpus-benchmark-child.ts`。allowlist の `t259` エントリ群は別テスト由来のため**触らない** | 比 assert は存在するが計測設計自体が患部 |
| #1816 | P3/S4 | **現存**（2機序） | (D-1) close が body を書かない — `amadeus-mirror-executor.ts:1156-1159`（sync → `editIssue(permit, body)` / close → `closeIssue(permit)`）。収束判定も同型の非対称（`:1038-1041`）。(D-2) completion 境界の最終 body 書込は `sync` で行われるが Status は構造的に `Running` — `amadeus-mirror-lifecycle.ts:311-312` が pending completion を持つ snapshot に `Running` を強制し、`amadeus-mirror-presentation.ts:259-260` が `snapshot.status` を逐語描画する。`completionInstance` は presentation で**未消費**（同ファイル `grep` 0ヒット） | 100% | `amadeus-mirror-presentation.ts`（本番・**7 dist + self-install 再生成を伴う唯一の Bolt**）、allowlist 行ピン remap、`t281` ケース追加 | `t281:55` / `t232:35` に body の `## Status` assert はあるが `completionInstance` を持つ fixture が無く完了断面を検査していない |

## Architect Synthesis

4件は「テストが本番契約を写せていない」3件（#1811 / #1800 / #1797）と「本番の表示層が完了を知らない」1件（#1816）に分かれる。

前者3件は同型である — 本番コードは正しく、テスト側が本番の終了契約・診断契約・計測契約を部分的にしか写していない。`cid:reverse-engineering:seam-writer-mode-precondition`（信号の書き手側の起動条件を実測せよ）と同じファミリの欠陥である。

後者1件は `cid:requirements-analysis:symmetric-pair-review` の対象クラスタ（sync⇔close の対称性）に属する。#1800 の患部（診断の片側実装）も同クラスタであり、本 intent は**非対称の是正が2件**含まれる。

### 依存と順序

**4件とも並行可。** 条件は2点。

| 組 | 交差 | 判定 |
| --- | --- | --- |
| #1811 × #1800 / #1797 | なし | 並行可 |
| #1800 × #1797 / #1816 | なし | 並行可 |
| #1811 × #1816 | **条件付き** — #1811 が本番（`team-up-codex-safety-wait.ts` / `team-up.sh`）を触ると 7 dist + self-install の再生成チェーンで #1816 と交差する | **条件1**: #1811 の本番非改変を確定する |
| #1797 × #1816 | **条件付き** — `tests/.coverage-patch-allowlist.json` | **条件2**: 同ファイルへ触れるのは #1816 のみとする（#1797 の `t259` エントリ群は別テスト由来） |

**順序依存（交差とは別軸）**: #1811 の着地（残留84プロセスの解消）は #1800（spawn `EAGAIN` が第一容疑）と #1797（負荷変動による比のずれ）の**再現条件を変える**。負荷スイープ実測を #1811 の着地**前**に取るか**後**に取るかで導出される数値が変わるため、要件段で固定する。並行実装自体は妨げない。

本節は着手前の静的目録であり、着地順は実 diff で再評価する（`cid:code-generation:c6`）。

### 要件段へ持ち越す裁定事項

- **#1811 の修正方式**: A（stub へ record 実在ポーリングを付与し本番契約を写す — `:717` / `:774` / `:823` の3テストへの影響検証必須、述語は「record ディレクトリ実在のみ」に弱めるのが安全）/ B（`afterEach` に期限付き kill/reap 掃引を追加 — 既存テスト無影響）/ **C = A+B（推奨）**。あわせて**本番非改変**を確定する。
- **#1800 の再現不能時の受理条件**: 負荷条件依存で発火するため、修正適用後に再現しなかった場合の扱いを要件段で明示する。「再現しなかったので閉じる」は無申告のスコープ縮小に当たる（`cid:build-and-test:no-silent-scope-narrowing`）。診断の対称化（(i)）は再現可否に関わらず必須。spawn-error 限定リトライ（(ii)、`EAGAIN` / `EMFILE` / `ENOMEM` のみ・上限2回・signal/exit はリトライしない）の採否は裁定事項。並列度制御（(iii)）はスコープ外。
- **#1797 の修正方式と数値**: 交互計測（(i)、推奨）/ 閾値引上げ単独（(ii)、`cid` の要求を満たさない）/ 環境係数（(iii)、検証劇場に近く非推奨）。**いずれの案でも採用前に負荷スイープ実測で数値を導出する**（`cid:code-generation:c1-benchmark-baseline-correlation-verify`）。要件段では数値を固定せず「実測で決める」と書く。
- **#1816 のスコープ切り分け**: 「record の main 着地前に close する」挙動は PR #1689 の設計帰結であり `tests/integration/t361-amadeus-mirror-lifecycle-completion.integration.test.ts:262` で契約固定済みの**仕様裁定マター**である。実装スコープを**表示層に限定する**旨を要件段で申告する（`cid:reverse-engineering:c1-pinned-behavior-ruling`、`cid:code-generation:cg-invariant-conflict-explicit-revision`）。
- **#1816 の導出キーと終端化範囲**: 導出キーは `snapshot.completionInstance` の存在とする（boundary キーだと `renderMirrorStatus`（`:298`）が組む drift 診断が close 後に恒久偽 drift を報告する）。`## Stage` / `## Phase` 行（`:253-257`）も終端化するかは要件段の確定事項。`amadeus-mirror-lifecycle.ts:311-316` の assert は**改訂不要**（record 断面の整合検査であり表示層の関心ではない）。

### 実装段への申し送り

- **#1811**: 掃引は `afterEach`（`:39-41`）の `rmSync` より**前**に行う（PID ファイル `safety-wait.pid` が同ディレクトリ配下にある）。期限付き kill/reap を使う（`cid:code-generation:c3-doctor-seam`）。
- **#1800**: `expectSuccessfulMigration`（`:218`）と同型のヘルパー経由へ寄せる。新機構の導入ではなく既存様式への合流である。
- **#1797**: 交互計測を採る場合の主改修面は `tests/helpers/guard-corpus-benchmark-child.ts`。allowlist の `t259` エントリ群には触れない。
- **#1816**: allowlist の presentation 行ピン5件（`193-194` / `230-234` / `237-239` / `245-247` / `266-271`）は**機械 remap 必須**（`cid:code-generation:c1-allowlist-mechanical-remap`）。remap 後は `reason` 記述と現行行内容の直読照合を併用する（`cid:code-generation:allowlist-line-pin-stale` の追補 — stale 検査は存在検査のみで無音転位を見逃す）。`renderMirrorIssueContent` は `:239-273`、body 組立は `:245-267`。
- core 正本変更（#1816 のみ）は 7 dist + self-install へ再生成し、生成物を独立編集しない（project.md Forbidden）。
- 新規テストは TDD 既定（Red の実測 → 最小実装で Green）で追加する（`cid:code-generation:tdd-default-with-narrow-exceptions`）。#1811 / #1816 は検知テスト 0件のため閉包の実証が必須。

## テスト採番予約

`ls tests/unit tests/integration tests/e2e tests/smoke` の実測で既存の最大番号は **`t373`**。`t372` は**欠番**。

| 番号 | 用途 |
| --- | --- |
| `t374` | #1811（プロセス残留の閉包テスト） |
| `t375` | #1800（診断対称化の閉包テスト） |
| `t376` | #1797（計測設計の閉包テスト） |
| — | #1816 は `tests/unit/t281-amadeus-mirror-presentation.test.ts` へケース追加（新規採番なし） |

`t372` の欠番は埋めない。並行 Bolt 実装時は本予約をディスパッチプロンプトへ明記する（`cid:code-generation:swarm-test-number-reservation`）。テスト引用は `tNNN` 短形でなく**フルパス**で書く（`cid:requirements-analysis:mechanism-cite-verify-at-draft` 追補 — 実測: `t224` は4ファイル、`t232` は2ファイルが同番号で共存する）。

なお本区間で追加されたテストに**番号重複は無い**（前区間の3組と対照的）。

## 既存 open PR の棚卸し

`cid:reverse-engineering:c1-preexisting-pr-inventory`（バグ修正 intent の起動時に対象 Issue ごとの既存 open PR を検査する）に従い conductor が起動前に実測し、**4件とも 0件**。前 intent（260730-open-bug-batch-2）で発生した「既存 PR を見落として再実装する」経路は本 intent では発生しない。

## 引用再確認の結果（Architect が observed `6e7a9d701` で独立再実測）

| 対象 | Developer 報告 | 再実測 | 判定 |
| --- | --- | --- | --- |
| observed / base 祖先性 | `6e7a9d701` / `3f73823b1` 祖先 | `git rev-parse HEAD` = `6e7a9d701d7cf350310a047bc5b70ff18ed15272`、`--is-ancestor` exit 0 | 一致 |
| Distance | 14 commits | `git rev-list --count 3f73823b1..HEAD` = **13** | **相違**（1コミット分。`git log --oneline` でも13行） |
| 区間規模 | 非生成面 `104 files / +3533 / −131` | 全体 `188 files / +6355 / −424`。面別集計では record `72` + `metrics` `5` + ソース `26` = `103 files / +3530 / −130`。**ソース面のみでは `26 files / +1040 / −118`** | **実質一致・精密化**（除外集合の定義差。より意味のある「ソース面」を成果物に採用） |
| `amadeus-election-store.ts` | `+178` | `git diff --numstat` = `168 / 10` | **精密化**（報告値は insertions+deletions の合算に見える） |
| `amadeus-election-model.ts` | `+45` | `36 / 9` | 同上 |
| `release.yml` | `+90/−25` | `68 / 22` | 同上 |
| `t223` / `t236` / `t265` / `t234` | `+77` / `+63` / `+137` / `+68` | `76/1` / `55/8` / `120/17` / `66/2` | 同上 |
| `t373` 新規 | `+323` | `323 / 0` | **完全一致** |
| pending lane 6関数 | `pendingDir` / `readPending` / `appendPending` / `ballotKey` / `pendingNotOnLedger` / `integratePending` | `:113` / `:139` / `:161` / `:187` / `:197` / `:205`、統合点 `:535` `:540` / `:601` / `:619` / `:663` | 一致（行番号を追加） |
| `succeededMirrorCreateExists` | 新設 + `createRan` 反転 | 実装 `amadeus-mirror-state-codec.ts:1731`、import `amadeus-orchestrate.ts:193`、消費 `:4249` | 一致（所在を精密化 — codec ではなく `state-codec`） |
| 7ハーネス `dot-gitignore` | 各 `+5` | 7ファイル全て `5 / 0` | **完全一致** |
| #1811 stub 不死設計 | `:218-219` setInterval、SIGTERM のみ | `:218` `process.on("SIGTERM", () => process.exit(0));` / `:219` `setInterval(() => {}, 1_000);` | 一致 |
| #1811 `afterEach` | `:38-41` | `afterEach(() => {` は `:39`、本体 `:40`、`});` `:41` | **精密化**（`:39-41`） |
| #1811 漏洩テスト3本 | `:590` / `:973` / `:1004` | `:590` `a fresh Codex launch pre-registers every role with agmsg` / `:973` `continue reuses the current run worktrees and restores its runtime` / `:1004` `the first legacy resume requires a runtime and adopts fixed worktrees in place` | **完全一致** |
| #1811 本番 fail-closed | `:643` ループ、`:561-582` catch→false | `:643` `while (await runRecordIsActive(runRecord, run, session)) {`、宣言 `:561`、`catch` → `return false` は `:580-582` | 一致 |
| #1811 PID 追跡 | `team-up.sh:508` | `:508` `printf '%s\n' "$pid" >"$member_record/safety-wait.pid"` | **完全一致** |
| #1800 センチネル | `:170` / `:210` | 両行とも `status: result.status ?? -1,` | **完全一致** |
| #1800 3分類 | `:311-313` | `:311` exit-status / `:312` signal / `:313` spawn-error | **完全一致** |
| #1800 診断ヘルパー | `:222-236` | 宣言 `:218`、メッセージ配列 `:225-238` | **精密化** |
| #1800 患部 | `:1411` | `expect(collided.status).toBe(1);` | **完全一致** |
| #1797 比 assert | `:108-109` | `:108` `twoMedianMs / oneMedianMs` / `:109` `rssMultiplier`、いずれも `toBeLessThanOrEqual(2.5)` | **完全一致** |
| #1797 median | `:46-49` | 宣言 `:46`、本体 `:47-48`、`}` `:49` | 一致 |
| #1797 逐次 spawn | `measure(1)` / `measure(2)` | `:101` / `:102`（`measure` 宣言 `:89`） | 一致（行番号を追加） |
| #1816 close 非対称 | `:1157-1159` | `:1156` `const mutated =` / `:1157` 条件 / `:1158` `editIssue` / `:1159` `closeIssue` | 一致 |
| #1816 収束判定 | `:1039-1041` | `:1038` `const converged =` / `:1039` 条件 / `:1040` body 一致 / `:1041` `state === "CLOSED"` | **精密化**（`:1038-1041`） |
| #1816 lifecycle 強制 | `:311-312`（assert `:311-316`） | `:311` `const completionMismatch = completion?.status === "pending" &&` / `:312` `(status !== "Running" \|\| completion.stage !== currentStage);` | **完全一致** |
| #1816 presentation 逐語 | `:259-260` | `:259` `"## Status",` / `:260` `snapshot.status,` | **完全一致** |
| #1816 `completionInstance` 未消費 | presentation で未消費 | `grep -rn 'completionInstance' packages/framework/core/tools/*.ts` — presentation は **0ヒット**。消費側は executor `:394` / coordinator `:279` `:284` / policy `:254` / lifecycle `:339` / state-codec `:567` `:763` `:770` `:775` / types `:516` `:527` / `amadeus-state.ts:533` ほか | **一致・過程を精密化**（`cid:requirements-analysis:absence-claim-grep-verify`） |
| #1816 allowlist 行ピン | 5件、直撃3+シフト2 | 5件の実在を確認（`193-194` / `230-234` / `237-239` / `245-247` / `266-271`）。ただし `renderMirrorIssueContent` は `:239-273`（body 組立 `:245-267`）であり、交差するのは `245-247`（直撃）と `266-271`（下方シフト）の**2件**。`193-194` / `230-234` / `237-239` は同関数より上方で、挿入位置が `:239` より下なら不変 | **相違**（直撃3+シフト2 → 直撃1+シフト1、残3件は挿入位置依存で原則不変） |
| #1816 テスト契約 | `t361` 改訂不要 / `t281` 既存2件改訂不要 / body assert は `t281:55` と `t232:35` | `t361:262` は `a prepared in-flight completion reaches Done and close before registry seal`（body assert なし）。`t281:52` `"## Stage",` / `:55` `"## Status",`。`t232:35` `"## Status",` | **完全一致** |
| テスト採番 | 最大 373、`t372` 欠番 | `ls` 実測で `...369 370 371 373`（`372` 不在） | **完全一致** |
| 構成カウント | 記載なし | core tools `88` → `88`（新規追加 **0件**）、sensors `7` / hooks `12` / scopes `10` いずれも不変 | Developer 報告外の追加実測 |

**総括**: Developer 報告の**所在・機序・結論は全件一致**。相違は (1) コミット数 14→13、(2) numstat の insertions/deletions 合算表記（8ファイル分）、(3) 行範囲の精密化4点（`afterEach` `:39-41`、診断ヘルパー `:218`+`:225-238`、収束判定 `:1038-1041`、`succeededMirrorCreateExists` の所在が `state-codec`）、(4) allowlist 行ピンの直撃/シフト内訳（3+2 → 1+1、残3件は挿入位置依存）に留まる。**いずれも修正方針に影響しない。** (4) のみ実装段で remap 対象を絞れる実務上の差である。
