# Business Logic Model — unit `pbt-deep-ci` (#1980)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: 本書のすべての file:line・件数・時間は **worktree HEAD `c8702be09d74daa8091d99d3eae48987b9fd7527`** の実測。`git diff --stat 5a6f79727..HEAD -- .github/workflows/ tests/fixtures/formal-verif-ci-baseline.sha256 tests/integration/t-formal-verif-ci-workflow.integration.test.ts tests/unit/t204-audit-escape.pbt.test.ts` が空(差分ゼロ)であるため、application-design 群の測定 ref `5a6f79727` の値と直接比較できる。

---

## 1. 本 unit の対象境界

本 unit の対象は **`.github/workflows/ci.yml` に追加する非ブロッキングジョブ 1 本**と、その追加によって必然的に生じる **`tests/fixtures/formal-verif-ci-baseline.sha256` の再 baseline** である。components.md の U5 節が所在を「`.github/workflows/ci.yml`(ジョブ追加)+ `tests/fixtures/formal-verif-ci-baseline.sha256`(再 baseline)」と規定し、規模を「ci.yml **+35〜50 行**、fixture **1 行**、`tests/integration/t-formal-verif-ci-workflow.integration.test.ts` の再 baseline 注記 **+5〜10 行**」と見積もっている。unit-of-work.md の Unit 表は本 unit を「AD U5(ci.yml へ workflow_dispatch 限定ジョブ+fixture 再 baseline、41〜61)。ADR-3 準拠・非ブロッキング」「FR-5a〜5b」「CI 41〜61行」と定義しており、本書はその範囲を出ない。

component-methods.md には **U5 の節が存在しない**(同書の節見出しは U1 / U2 / U3 / U4 / U8 と共通規約節のみ)。これは本 unit がプロダクションの関数・型を1つも新設しないことの反映である — 本 unit の「ロジック」は関数本体ではなく **ワークフロー宣言と、その宣言が満たすべき条件**として存在する。したがって本書は関数フローではなく、**ジョブの起動条件・実行フロー・不変量**を業務ロジックとして固定する。

新設するプロパティ(P-xx)は無い。本 unit が扱うのは、**他 unit(election-readpath / state-pbt)が作った PBT のプロパティを深掘り予算で走らせる実行面**であり、プロパティ自体の所有は component-methods.md の U2(P-EL1 / P-EL2 / P-EL3)と U3(P-ST1〜P-ST4)にある。本 unit はそれらを一切再定義しない。

## 2. なぜこの unit が最後になるのか(依存の意味)

unit-of-work-dependency.md の YAML edge block は本 unit を

```yaml
  - name: pbt-deep-ci
    depends_on: [election-readpath, state-pbt, cast-guard]
```

と定義し、同書「並行編成の含意」が「**batch 4**: pbt-deep-ci(PBT 2系統の常駐後、かつ cast-guard 着地後)」と位置づける。エッジの意味は2種類あり、混同してはならない:

| エッジ | 種類 | 根拠 |
| --- | --- | --- |
| election-readpath → pbt-deep-ci | **意味依存** | unit-of-work.md「走らせる対象の PBT(election-readpath / state-pbt)が存在してはじめて意味を持つ」。対象ファイルが不在なら本ジョブは空回りする |
| state-pbt → pbt-deep-ci | **意味依存** | 同上 |
| cast-guard → pbt-deep-ci | **共有資源の直列化** | unit-of-work-dependency.md「cast-guard(S1 = lint ジョブへ1ステップ)と pbt-deep-ci(S2 = ジョブ1本)は**ともに `.github/workflows/ci.yml` と `tests/fixtures/formal-verif-ci-baseline.sha256`(再 baseline)+ t-formal-verif-ci-workflow の再 baseline 注記へ書く**」 |

**この区別が本 unit の実装順序と検証順序を決める**。cast-guard との直列化は「先に着地した側の再 baseline を、後発側が再度上書きする」ことを意味する — 後発である本 unit は、**cast-guard 着地後の ci.yml を入力として** baseline を採り直さなければならず、cast-guard 着地前に採った値は無効である(§5 の不変量 INV-4)。

## 3. 実行フロー(ASCII — Mermaid 不使用)

### 3.1 起動フロー(GitHub Actions 側)

```
  利用者(write 権限保持者)
        |
        | Actions タブ → "CI" ワークフロー → Run workflow
        v
  ci.yml が workflow_dispatch で起動         [ci.yml:8  workflow_dispatch: {}]
        |
        +--> changes / typecheck / lint / ... (既存ジョブ群)
        |         |
        |         +--> ci-success   [ci.yml:612-623 needs に 8 ジョブ]
        |
        +--> formal-model-check     [ci.yml:509-511  if: workflow_dispatch 限定]
        |         (ci-success の needs に不在 = 非ブロッキングの先例)
        |
        +--> pbt-deep  <== 本 unit が追加するジョブ
                  if: github.event_name == 'workflow_dispatch'
                  (ci-success の needs に**追加しない**)
```

`push` / `pull_request` で起動した場合、`if:` が false となり `pbt-deep` は **skipped** になる。skipped は failure ではないため、仮に誤って `ci-success` の needs に入れても即座には赤くならない — だからこそ needs 非参加は**目視でなく機械で**守る必要がある(§5 INV-2)。

### 3.2 ジョブ内フロー

```
  [1] Checkout                (actions/checkout, SHA ピン)
        v
  [2] Set up Bun              (oven-sh/setup-bun, SHA ピン, bun-version 1.3.13)
        v
  [3] Install dependencies    (bun install --frozen-lockfile)
        v
  [4] 対象パス集合の実在検査   <-- fail-closed の要
        |  すべて実在?
        |     no  --> exit 1(ジョブ赤。「実行したつもり」を作らない)
        |     yes
        v
  [5] 深掘り実行
        env: AMADEUS_PBT_DEEP=1
        set -o pipefail
        bun test <対象パス列> 2>&1 | tee pbt-deep-run.log
        |
        +-- 成功: bun の "Ran N tests across M files" を [6] で照合
        +-- 失敗: fast-check が seed / replay path / 縮小反例を stdout へ出す
                  → tee により log とジョブログの両方に残る
        v
  [6] 実行ファイル数の照合     <-- 無音スキップの検出
        |  M == 期待ファイル数?
        |     no  --> exit 1
        |     yes --> ジョブ成功
        v
  [7] 失敗時サマリ(if: failure() && steps.<id>.conclusion == 'failure')
        pbt-deep-run.log の末尾を $GITHUB_STEP_SUMMARY へ追記
```

ステップ [7] の発火条件を「対象ステップの conclusion」に絞るのは perf.yml の既習様式である。`.github/workflows/perf.yml:74-77` 実文:

```
      - name: Summarise failure
        # Scope the summary to the test step itself: a bare failure() also
        # fires on checkout/setup/install failures and would mislabel them.
        if: ${{ failure() && steps.perf_tests.conclusion == 'failure' }}
```

素の `failure()` は checkout / setup / install の失敗でも発火し、PBT の失敗と誤ラベルする。本 unit は同じ理由で同じ形を採る。

## 4. 深掘り階層の意味論(既存規約の実読)

`AMADEUS_PBT_DEEP` は **既存の PBT 規約が定義済みの環境変数**であり、本 unit はその意味論を一切変更しない。判定の実文(`tests/unit/t204-audit-escape.pbt.test.ts:39`、verbatim):

```ts
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
```

予算の切替(同 `:41`、verbatim):

```ts
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };
```

requirements.md FR-4c が「seed / numRuns は既存規約準拠 — PR CI = `PBT_SEED` 固定・numRuns 100、深掘りは `AMADEUS_PBT_DEEP=1` 階層で分離し失敗 seed をログ化(t204:16-28 の規約ヘッダが canonical)」と定め、components.md の再利用棚卸し(`:97`)が同じ `:39` / `:41` を canonical として U2/U3/U7 に割り当てている。**本 unit は判定式にも予算値にも触れず、環境変数を `"1"` に設定する側だけを担う**。

### 現況 — 規約は存在するが実行面が一度も存在しなかった

services.md「実行 tier との関係(重要な非目標)」の実測を本ステージで再実測した(測定 ref = HEAD `c8702be09`):

| 測定 | コマンド | 結果 |
| --- | --- | --- |
| リポジトリ全体の出現 | `grep -rn "AMADEUS_PBT_DEEP" --exclude-dir=node_modules --exclude-dir=.git . \| wc -l` | **32**(record / codekb / 本 intent 成果物を含む) |
| ソース面のファイル数 | `grep -rln "AMADEUS_PBT_DEEP" tests/ scripts/ packages/ .github/ package.json \| wc -l` | **4** |

ソース面の4ファイルは `tests/unit/setup-semver.pbt.test.ts` / `setup-manifest.pbt.test.ts` / `setup-plan-decisions.test.ts` / `t204-audit-escape.pbt.test.ts` であり、**いずれもテストの実装内で `process.env` を読む側**である。`tests/run-tests.ts` / `.github/workflows/*.yml` / `package.json` に設定する側は **0 件**。すなわち深掘り階層は規約として定義済みでありながら、**それを 1 に設定して走らせる実行面が repo に一度も存在しなかった**(`cid:requirements-analysis:absence-claim-grep-verify` の反証確認済み)。本 unit がその最初の実行面である。

なお既存規約ヘッダは深掘りの想定起動を `--release` tier と書いている(`tests/unit/setup-semver.pbt.test.ts:24` 実文 ``//    `--release` tier (`AMADEUS_PBT_DEEP=1 bash tests/run-tests.sh --release`),``)。本 unit は requirements.md FR-5a に従い **`bun test` へ対象ファイルを直接渡す**形を採る — 対象を新規 PBT に限定して深掘りの実行時間を有界に保つためであり、services.md S2 のジョブ契約表「実行コマンド = `AMADEUS_PBT_DEEP=1 bun test <新規 PBT ファイル群>`」の指定どおりである。`--release` tier 全体を深掘りで回すと、深掘りを意図していない既存4本まで 50,000 runs で走ることになる。

### 実測: 深掘りの実コスト(1ファイルの対照)

| 条件 | コマンド | 結果 |
| --- | --- | --- |
| 既定(numRuns 100) | `/usr/bin/time -p bun test tests/unit/t204-audit-escape.pbt.test.ts` | `500 expect() calls` / `Ran 2 tests across 1 file. [121.00ms]` / real **0.14** |
| 深掘り(numRuns 50,000) | `AMADEUS_PBT_DEEP=1 /usr/bin/time -p bun test tests/unit/t204-audit-escape.pbt.test.ts` | `250000 expect() calls` / `Ran 2 tests across 1 file. [190.00ms]` / real **0.21** |

expect 呼び出しは 500 → 250,000(**500 倍**)なのに wall clock は 0.14 → 0.21 秒である。これは t204 が純関数(文字列エスケープ)の property であるためで、**FS を触る integration 層の property では同じ倍率が wall clock にほぼ線形で乗る**。本 unit の `timeout-minutes` はこの非線形性を前提に、実装段で **対象ファイル集合そのものの深掘り実測**から導出する(business-rules.md BR-PDC-8)。上表は「純関数層の深掘りは安い」という下限の傍証であって、上限の根拠にはならない。

## 5. 不変量(この unit が守るべき性質)

| ID | 不変量 | 破れたときに起きること | 機械的な守り |
| --- | --- | --- | --- |
| INV-1 | `pbt-deep` は `workflow_dispatch` でのみ実行される | 全 PR / push で深掘りが走り、リードタイムを直撃する(FR-5a が schedule 化を Out としている趣旨も同時に破れる) | ジョブレベル `if: github.event_name == 'workflow_dispatch'`。ci.yml の `on:` は変更しない(`:8` に既存) |
| INV-2 | `ci-success` の `needs` は 8 要素のまま(`changes` / `typecheck` / `lint` / `distribution-contract` / `plugin-conformance-e2e` / `tests` / `drift-check` / `coverage`) | 非ブロッキング契約(FR-5b)と既存ブロッキング集合維持(NFR-5)が同時に破れる | 追加しない。`tests/unit/t222-ci-snapshot-wiring.test.ts` / `tests/integration/t222-ci-snapshot-branch.integration.test.ts` が `ci-success` の needs をピンしている(services.md「ジョブを `ci-success` の `needs` に足さないことで…ピンは触れずに済む」) |
| INV-3 | 失敗が無音化されない | 深掘りが恒常的に赤いまま誰も気づかない状態が固定される | `continue-on-error` / `\|\| true` を書かない。`set -o pipefail` と `tee` の併用(§6) |
| INV-4 | `formal-verif-ci-baseline.sha256` は **cast-guard 着地後の ci.yml** から採った値である | 再 baseline が cast-guard の編集を「未承認の編集」として拒否する、あるいは逆に本 unit の編集を拒否する | 直列化(unit-of-work-dependency.md batch 3 → batch 4)+ 再 baseline を本 unit の最終手順に置く |
| INV-5 | 対象パス集合が全数実行される | bun が不存在パスを無音で除外したまま exit 0 になり、「深掘りを走らせた」という記録だけが残る | パス実在の事前検査 + `Ran ... across M files` の照合(business-rules.md BR-PDC-5 / BR-PDC-6) |
| INV-6 | 実行 tier の所属は変わらない | `t257-ci-residency-marker-guard` が守る「CI-resident 自称と実行 tier の乖離」が発生する | 新規 PBT は `tests/unit/` と `tests/integration/` に置かれたまま。本 unit はファイルを移動せず、環境変数を渡すだけ(services.md「`AMADEUS_PBT_DEEP=1` は**環境変数による numRuns の切替のみ**で、テストの tier 所属を変えない」) |

INV-2 は「守るべき性質」であると同時に**すでに機械で守られている性質**である。decisions.md ADR-3 Rationale 3 が実測を記録している: `tests/unit/t222-ci-snapshot-wiring.test.ts:121`(`ci-success remains independent from both publishers`)と `tests/integration/t222-ci-snapshot-branch.integration.test.ts:107`(`const ciSuccessNeeds = jobs["ci-success"]?.needs;`)。したがって本 unit の INV-2 違反は**新規テストを書かなくても既存テストが捕捉する** — 本 unit は「守る仕組みを作る」のではなく「既存の仕組みに乗る」側である。

## 6. loud fail の成立条件

services.md S2 のジョブ契約表は失敗の扱いを「loud fail(`continue-on-error` や `\|\| true` は使わない)」と定め、根拠を `.github/workflows/perf.yml:6-11` の非ブロッキング loud-fail 契約に置く。同 perf.yml 実文(`:6-11`):

```
# Non-blocking loud-fail contract: this workflow is deliberately absent from
# ci.yml's `ci-success` needs list and from branch protection, so a red run here
# never blocks a pull request. Failures stay loud instead: the workflow run goes
# red in the Actions tab and each failing job appends the tail of its output to
# the run's step summary. Silencing a failure (continue-on-error, `|| true`) is
# not an acceptable way to keep this workflow green.
```

この契約は3要素の合成である: (a) needs 非参加 → PR を塞がない、(b) 失敗はジョブが赤になる → Actions タブで見える、(c) 失敗時に末尾をステップサマリへ追記 → 中身が見える。本 unit は3要素すべてを採る。

**`tee` を挟む場合 `set -o pipefail` が loud fail の必要条件になる** — パイプの終端(`tee`)の exit code が採られると `bun test` の失敗が exit 0 に化ける。これは `cid:code-generation:no-exit-capture-through-pipe` が記録する既知の失敗様式(パイプライン越しに exit code を捕捉すると対象コマンドの失敗を無音で隠す)そのものであり、perf.yml の実行ステップも `set -o pipefail` を先頭に置いている(`.github/workflows/perf.yml:61-63` 実文 `        run: |` / `          set -o pipefail` / `          bash tests/run-tests.sh --perf 2>&1 | tee perf-run.log`)。本 unit は同形を採る。

## 7. 状態(ジョブの取りうる終端)

本 unit にドメイン状態機械は無い。ジョブの終端状態は GitHub Actions の値域に一致する:

```
  skipped   <- if: が false(push / pull_request 起動時)。異常ではない
  success   <- 全ステップ exit 0。対象集合が全数実行され、全 property が緑
  failure   <- 以下のいずれか:
                 (F1) 対象パスの実在検査に失敗       [INV-5 / BR-PDC-5]
                 (F2) property が反例を検出           [FR-5a の本来の目的]
                 (F3) 実行ファイル数の照合に失敗      [INV-5 / BR-PDC-6]
                 (F4) checkout / setup / install の失敗
  cancelled <- 利用者による中断、または timeout-minutes 超過
```

**F1〜F4 は区別可能でなければならない**。F2 だけがステップサマリへ本文を出す設計(§3.2 [7])にすることで、サマリの有無が「PBT が落ちたのか、環境が落ちたのか」を1目で示す。F4 をサマリ対象にしないのは perf.yml の誤ラベル回避と同じ理由である(§3.2)。

## 8. 上流成果物の本文参照(consumes の依拠箇所)

| 上流成果物 | 本書での依拠箇所 |
| --- | --- |
| requirements.md | §1(FR-5a/5b の範囲)、§4(FR-4c の既存規約準拠、FR-5a の手動トリガと seed 可視化)、§5 INV-2(NFR-5 の既存ブロッキング集合維持) |
| unit-of-work.md | §1(Unit 定義と規模 41〜61 行)、§2(意味依存の記述「走らせる対象の PBT が存在してはじめて意味を持つ」) |
| unit-of-work-dependency.md | §2(YAML edge block の3エッジと種別)、§5 INV-4(batch 3 → batch 4 の直列化と共有資源) |
| components.md | §1(U5 の所在と規模内訳)、§4(再利用棚卸し `:97` の PBT 規約 canonical 割当) |
| component-methods.md | §1(U5 節が存在しないこと = 新設関数ゼロの反映)、§1(P-EL1〜3 / P-ST1〜4 の所有は U2/U3 にあり本 unit は再定義しない) |
| decisions.md | §1・§3.1(ADR-3 の配置裁定 = ci.yml へジョブ追加・独立 workflow 新設せず)、§5 INV-2(ADR-3 Rationale 3 の t222 実測)、§5 INV-4(ADR-3 Consequences の再 baseline 必須手順) |

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段4(手動深掘りによる浅い探索の見逃し回収と失敗 seed 再現)に対応する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T18:26:04Z
- **Iteration:** 1
- **Scope decision:** none

S2 ジョブ契約と 1:1 対応、needs 8要素非参加は4箇所 verbatim 一致、申告2件(BR-PDC-5/6 追加・先行例件数の単位差)とも妥当。GoA 1。

### Findings

- None
