上流入力(consumes 全数): HANDOFF.md, amadeus-state.md, requirements.md, unit-of-work.md, unit-of-work-story-map.md, U1-size-ledger/code-generation/code-summary.md, business-logic-model.md, business-rules.md, domain-entities.md, frontend-components.md, performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, performance-design.md, security-design.md, scalability-design.md, reliability-design.md, logical-components.md, nfr-design-questions.md, code-generation-plan.md, code-generation-questions.md, tests/run-tests.sh, tests/run-tests.ts

# Code Generation Summary — U2 層責務仕様・tier gate設計・予算ガイドライン

## 実行境界と結論

本成果物は、U2の承認済み境界「層責務規約、tier-aware判定IF、比率目標、tier別実行時間予算の正式record化」を実行した記録である。application code、test、runner、collector、CI、repository docs、package、`dist/`、強制gate、#1157は変更していない。以下の判定IFは設計契約であり、実装済みとは主張しない。

| 判断 | 人間回答 | 結果 |
| --- | --- | --- |
| Q1 計画承認 | `1`（2026-07-17T21:53:40Z） | Plan Aを承認 |
| Q1a rebase後の測定基準 | `1`（2026-07-17T22:28:47Z） | U1台帳refを保持し、新HEADでU2 runtimeを測定 |
| Q2 追加測定protocol | `1`（2026-07-17T22:49:28Z） | smoke/unitだけを追加2回、fail-closed式を採用 |
| Q3 budget状態 | `推奨`（2026-07-17T23:02:06Z） | smoke 21秒、unit 128秒、integration/e2e `PENDING`を承認 |

ソロモードのため、Q1a〜Q3は選挙・agmsgを使わず、既決ノルム、実測、人間の直接回答から確定した。時間値はguidelineであり、verdict、exit code、runner、CI gate、設定定数へ接続していない。

## Measurement refの分離

本recordでは分類oracleとruntime observationのrefを分離する。同じ母集団として合算または比較しない。

| 用途 | ref | 保持する事実 |
| --- | --- | --- |
| U1分類台帳の正本 | `3917a283a953165866170d235d3dc25ad2fd3643` | 442行、size 60/379/3、governed 440、auxiliary 2、violation 163 |
| U2 runtime baselineのsubject | `244a196795f8b23192ed54dc1221b75d0c8e8f44` | clean detached worktreeで既存4 tier commandを観測 |
| U2 NFR成果物の歴史的検証HEAD | `7ce376ed008fc77a7df25429fb311b45bd69537b` | 当時はU1 refとのrelevant test tree差分0。現在refへ流用しない |

[PR #1183](https://github.com/amadeus-dlc/amadeus/pull/1183) のrebase後、U1分類refからU2 runtime subjectへtest fileが追加2件・変更5件の計7件変化した。

| 状態 | path |
| --- | --- |
| modified | `tests/integration/t-practices-promote-contract.test.ts` |
| modified | `tests/integration/t199-generated-prefix-contract.test.ts` |
| modified | `tests/integration/t227-project-skill-projection.test.ts` |
| added | `tests/integration/t232-amadeus-mirror.integration.test.ts` |
| modified | `tests/integration/t75.test.ts` |
| modified | `tests/unit/t209-promote-self-dangling-symlink.test.ts` |
| added | `tests/unit/t232-amadeus-mirror.test.ts` |

したがって、以下の442行・比率・163 violationはU1 refのsnapshotに限定する。U2 runnerのtest-files件数から新refのSizeLedger matrixを推定しない。

## U1入力anchor

U2はU1正式成果物 `construction/U1-size-ledger/code-generation/code-summary.md` の次の結果だけを分類入力の正本とする。

| 項目 | U1正式結果 |
| --- | --- |
| `LedgerBuildOutcome` | `complete` |
| observed ref | `3917a283a953165866170d235d3dc25ad2fd3643` |
| candidates / rows / matrix sum | 442 / 442 / 442 |
| read failures | 0 |
| pretty stdout SHA-256（run 1 / run 2） | `8b1d084d79bb5a8719ea23c5c36910cbc5aec1d9305194d497b2c55258892f84` / 同値 |
| compact ledger digest | `d2525dff03c4dbc2623332c867a71daf8fa217f061f6ac547c2fcfc966667142` |
| U1 reviewer | Iteration 2 `READY` |

`LedgerBuildOutcome = complete | incomplete | fatal` とし、`complete`かつ非空observed refだけをU2評価へadmitする。`incomplete` / `fatal`を`complete`へ縮退させない。

## Key implementation decisions

### 4 NamedTierの単一policy

次表をU2設計内の唯一の上限定義とし、既存`SIZE_ORDER`によるstrict比較を使う。

| `NamedTier` | `allowedMaxSize` |
| --- | --- |
| `unit` | `small` |
| `integration` | `medium` |
| `e2e` | `large` |
| `smoke` | `medium` |

```text
over-limit ⇔ SIZE_ORDER[measured] > SIZE_ORDER[allowedMaxSize(tier)]
```

- `NamedTier = unit | integration | e2e | smoke` は閉じたpolicy入力である。
- 台帳の`Tier`は開いた入力集合であるが、unknownを自動承認する意味ではない。
- applicabilityは`NamedTier / approved auxiliary / invalid`の3分類とする。
- approved auxiliaryの初期registryは`harness | lib`。台帳・比率分母・auxiliary countには残すがdetectorへ渡さない。
- auxiliaryはdetectorの`none`ではなく`not-applicable`である。
- registry外のtierはauxiliaryへ自動昇格させず、`invalid-tier`としてfail-closedにする。
- 新しいNamedTierは型、policy、要件、テストを同時に変更する仕様変更であり、新しいauxiliary tierはregistryと根拠を同時に更新する。

### Evaluation resultとadmission

Evaluation Boundaryの論理I/Oを次の閉じたresultとする。具体的なexported型名、serialization、stderr、exit codeは後続実装に残す。

```text
AdmissionRejectReason =
  | "upstream-incomplete"
  | "upstream-fatal"
  | "observed-ref-missing"

IndeterminateDiagnostic =
  | { kind: "invalid-file"; rowIndex: number }
  | { kind: "invalid-tier"; rowIndex: number; file: LogicalRepoPath }
  | { kind: "invalid-measured"; rowIndex: number; file: LogicalRepoPath }

EvaluationObservation = {
  observedRef: string,
  total: number,
  governed: number,
  auxiliary: number,
  indeterminate: number,
  violationCount: number,
  sizeCounts: {
    small: number,
    medium: number,
    large: number,
    unclassified: number
  }
}

TierEvaluationResult =
  | { kind: "admission-rejected"; reason: AdmissionRejectReason }
  | { kind: "complete"; report: TierDriftReport; observation }
  | { kind: "indeterminate"; observation; diagnostics: IndeterminateDiagnostic[] }
```

admission mappingは次のとおりである。

| U1 outcome / ref | U2 result |
| --- | --- |
| `incomplete` | `admission-rejected(upstream-incomplete)` |
| `fatal`かつref欠落 | `admission-rejected(observed-ref-missing)` |
| その他の`fatal` | `admission-rejected(upstream-fatal)` |
| `complete`だがobserved refが欠落または空 | `admission-rejected(observed-ref-missing)` |
| `complete`かつ非空observed ref | 行評価へ進む |

admission拒否時はrowsを走査せず、observation、diagnostics、reportを構成しない。

### 行評価と診断

1. U1のfile code-unit順を保ち、zero-based `rowIndex`を付ける。
2. `file`、`tier`、`measured`を独立にexact validationする。
3. 不正fieldがあれば`file → tier → measured`の優先順位で最初の1件だけを診断にする。その行をindeterminateへ1回だけ数え、detectorへ渡さない。
4. valid NamedTier行だけpolicy lookupとstrict序数比較を各1回行う。
5. valid auxiliary行はnot-applicableとして数え、violation母集団から外す。
6. indeterminateが0のときだけratioとauthoritative `TierDriftReport`を返す。

`invalid-file`はraw fileを保持せず`rowIndex`だけを持つ。`invalid-tier` / `invalid-measured`はfile validation通過後だけ、検証済みrepository相対`LogicalRepoPath`を持つ。raw不正値、source本文、absolute/canonical path、credential、環境変数、stack trace、runtime messageをresultへ含めない。

### 計算量と不変条件

Nをrows、Vをover-limit、Iをindeterminate診断数とすると、時間O(N)、追加メモリO(V + I)とする。source/FSの再読込、分類器の再実行、network、child process、cache、worker fan-out、行ごとの再sortをtarget pipelineへ含めない。

- `total = ledger.rows.length`
- `total = governed + auxiliary + indeterminate`
- `indeterminate = diagnostics.length`
- `small + medium + large + unclassified = total`
- `unclassified <= indeterminate`
- completeでは`indeterminate = 0`かつ`unclassified = 0`
- completeでは`violationCount = report.violations.length`
- completeでは`report.summary.total = total`かつ`report.summary.violationCount = violationCount`
- indeterminateの`violationCount`はvalid NamedTier行の内部candidate数に限り、candidate配列やauthoritative reportを公開しない
- diagnosticsは1行1件以下、`rowIndex`厳密昇順
- 同じobserved ref、rows、policy、registryからbyte-equivalentなlogical outcomeを返す
- indeterminateが1件でもあればauthoritative report、ratio、zero-violation successを返さない

## U1 snapshotの比率とviolation oracle

この節の数値はすべてU1 measurement ref `3917a283a953165866170d235d3dc25ad2fd3643`に限定する。

| tier | small | medium | large | total | over-limit |
| --- | ---: | ---: | ---: | ---: | ---: |
| unit | 48 | 162 | 1 | 211 | 163 |
| integration | 9 | 138 | 0 | 147 | 0 |
| e2e | 3 | 63 | 2 | 68 | 0 |
| smoke | 0 | 14 | 0 | 14 | 0 |
| harness | 0 | 1 | 0 | 1 | N/A（auxiliary） |
| lib | 0 | 1 | 0 | 1 | N/A（auxiliary） |
| **total** | **60** | **379** | **3** | **442** | **163** |

evaluation oracleは`total=442`、`governed=440`、`auxiliary=2`、`indeterminate=0`、`violationCount=163`である。163はunit medium 162 + unit large 1から機械導出する。これらはregression oracleであり、将来実装の固定定数にしない。

| guideline key | target | U1 snapshot | gapの扱い |
| --- | ---: | ---: | --- |
| `RATIO_TARGET_SMALL_MIN` | ≥ 50% | 60 / 442 = 13.6% | 未達を表示するがverdict化しない |
| `RATIO_TARGET_MEDIUM_MAX` | ≤ 45% | 379 / 442 = 85.7% | 未達を表示するがverdict化しない |
| `RATIO_TARGET_LARGE_MAX` | ≤ 5% | 3 / 442 = 0.68% | 目標内でもPASS gate化しない |

ratio分母にはauxiliaryを含む全442行を使うが、auxiliaryをtier violation母集団には含めない。比率目標はguidelineであり、強制gateではない。

## Runtime measurement protocol

### 環境とrunner識別子

| 項目 | 値 |
| --- | --- |
| subject ref / head mode | `244a196795f8b23192ed54dc1221b75d0c8e8f44` / detached |
| worktree | `/tmp/amadeus-u2-rebased-baseline.KXl1Ip/tree`（実行時clean） |
| host / timezone | `j5ik2o-mac-studio.lan` / JST |
| OS / kernel / arch | macOS 26.5.1 build 25F80 / Darwin 25.5.0 / arm64 |
| Bun / Node / Git / Bash | 1.3.13 / v26.3.0 / 2.54.0 / 3.2.57(1)-release |
| execution | 同一worktree・同一host・serial、`--parallel`未指定 |
| dependency | ignored `node_modules`へtop-level symlink 225件。source worktreeはdirtyだが実行には未使用 |
| warmup / retry | 0 / none |

| runner path | SHA-256 | Git blob |
| --- | --- | --- |
| `tests/run-tests.sh` | `5d46525d488cd15f47cf06d397c9a63f9738723db8a77aaab3556c1444d2529e` | `dabfe402475c7a1ac94afcace468da435eee5b4f` |
| `tests/run-tests.ts` | `b2ee360949bb305b8583db6741cbd06f4aed357e747c958f0d8c480d38e26959` | `a8fcaa1358ca2a3cf77c51e3040d317cded653ed` |
| `tests/lib/bun-junit-to-meta.ts` | `af91849830dc2a691dfecc278eca0dc9872533f27702ea93e2ad8a88ec21f729` | `ae4745e52c017a74226591fa1db61ed2b3f9d6a7` |
| `tests/lib/run-tests-totals.ts` | `14cdc795edae6d0ffa4d9761b86ad07bf82467f9bf587333ccaf6cba51ea6b6d` | `6b934a49987868bf8d4f5420daf44b260d298072` |
| `tests/lib/test-size.ts` | `83313a8372785d966f0da6e231d1ea631a14e0ff5f0df1b4cb570cb1fc1ce362` | `d7aaece287e64d85baff511bc898e74db6698237` |

baselineは`smoke → unit → integration → e2e`を各1回だけ実行した。Q2承認後、同じworktreeで`smoke trial 2 → unit trial 2 → smoke trial 3 → unit trial 3`だけを追加した。

| 区分 | 順序 | tier / trial | exact command | started UTC | finished UTC | wall | exit | files | assertions | failed files / assertions | skipped files / assertions |
| --- | ---: | --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| baseline | 1 | smoke / 1 | `bash tests/run-tests.sh --smoke` | 2026-07-17T22:32:14Z | 2026-07-17T22:32:26Z | 11.35秒 | 0 | 14 | 343 | 0 / 0 | 0 / N/A |
| baseline | 2 | unit / 1 | `bash tests/run-tests.sh --unit` | 2026-07-17T22:32:40Z | 2026-07-17T22:34:22Z | 101.82秒 | 0 | 212 | 2,998 | 0 / 0 | 0 / N/A |
| baseline | 3 | integration / 1 | `bash tests/run-tests.sh --integration` | 2026-07-17T22:34:39Z | 2026-07-17T22:38:18Z | 218.73秒 | 2 | 148 | 1,943 | 2 / 5 | 24 / N/A |
| baseline | 4 | e2e / 1 | `bash tests/run-tests.sh --e2e` | 2026-07-17T22:38:36Z | 2026-07-17T22:39:21Z | 45.01秒 | 0 | 69 | 146 | 0 / 0 | 33 / N/A |
| additional | 1 | smoke / 2 | `bash tests/run-tests.sh --smoke` | 2026-07-17T22:50:22Z | 2026-07-17T22:50:38Z | 16.10秒 | 0 | 14 | 343 | 0 / 0 | 0 / N/A |
| additional | 2 | unit / 2 | `bash tests/run-tests.sh --unit` | 2026-07-17T22:51:03Z | 2026-07-17T22:52:42Z | 99.19秒 | 0 | 212 | 2,998 | 0 / 0 | 0 / N/A |
| additional | 3 | smoke / 3 | `bash tests/run-tests.sh --smoke` | 2026-07-17T22:53:05Z | 2026-07-17T22:53:20Z | 14.81秒 | 0 | 14 | 343 | 0 / 0 | 0 / N/A |
| additional | 4 | unit / 3 | `bash tests/run-tests.sh --unit` | 2026-07-17T22:53:43Z | 2026-07-17T22:55:19Z | 96.91秒 | 0 | 212 | 2,998 | 0 / 0 | 0 / N/A |

assertion単位のskip数はrunnerが公開しないため`N/A`であり、0へ変換しない。

integrationの失敗は次の2 files / 5 assertionsである。

| file | failed assertions | 観測概要 |
| --- | ---: | --- |
| `t-team-up-codex-resume.test.ts` | 3 | alpha stdout空、beta `active-run` ENOENT、default `active-run` ENOENT |
| `t-team-up-msg-backend.test.ts` | 2 | `current-run` ENOENT、legacy resumeが`--claude`または`--codex`を要求 |

この2ファイルは上記7件のtracked test driftには含まれないが、因果関係がないとは断定しない。integration 24 filesとe2e 33 filesのskip理由は全件`Claude substrate unavailable; derived live mechanism`である。integrationをPASSへ、e2eを完全観測へ縮退させない。

### Evidence integrity

| manifest | entries | manifest SHA-256 | `shasum -c` |
| --- | ---: | --- | --- |
| `raw-output-hashes.sha256` | 28 | `fc70c39d6dfc98ec5cdfb777058766b4f021c35a99df49871f8b7697f3aefce8` | PASS |
| `evidence-manifest.sha256` | 53 | `dab2c6baf433700aae992e4a13968d48074c3e7e9aa0b6c30e80aeb25c333262` | PASS |
| `additional-trials-raw-hashes.sha256` | 36 | `1bd2f672f0da065aef4987f612a7fc53367e2e216cb59d053e03eedadc782842` | PASS |
| `additional-trials-manifest.sha256` | 42 | `b9035ec293499b52ef841637b3c9cdfa27396796ff697b65c00efb9b4a8d7be0` | PASS |

| tier / trial | stdout SHA-256 | stderr SHA-256 |
| --- | --- | --- |
| smoke / 1 | `eacf35ea00b746e43c5fb0b8fb47749c623d80121af25a26a21ce6d789d54335` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| unit / 1 | `b60a1efdae61175301baf38b5bfac20b75951a36f56e0ae6f55af613bfaff938` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| integration / 1 | `04f15b3e26c18b98f124efb8b00325d32b224bf43a6e3d7e16838dd792effe50` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| e2e / 1 | `31063b4a7ba570d38811b65ff8a883ad5b5075e6245d9418c104ad06ad4faa94` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| smoke / 2 | `297349277cdfa5da6a16c4f2e8d6eceacac53563fc9dde22010a9122c2fb5bf8` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| unit / 2 | `ce0bd5affe10d393f5f64d9afff4c109c535b0d7c52739c65431a4d575084b22` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| smoke / 3 | `e4c3da8d8ba13c285c2af6754555ecf18d293e7177b1d3211a15a1969b5740a0` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| unit / 3 | `92559f2cb8aa3e87a70f35ea1966d6c261862814b7eed834dde55107fdd56219` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

全stderrは0 byteである。baseline/追加はそれぞれ4つのdistinct wrapper processで、wrapper PIDはbaseline=`89426,89999,5564,27269`、追加=`61962,63277,71428,72865`。各command、started、finished、banner、summaryは各1回で、integration/e2e追加実行、warmup、retry、未承認trialは0件だった。追加測定前後でbaseline raw/evidence manifestは同一であり、各実行前後のHEAD、host、cleanも一致した。

## 実行時間budget

Q2で承認したfail-closed条件は、tier内の3観測すべてが同じfiles/assertions、exit 0、failed 0、explicit skipped files 0である場合だけ`ceil(max(wall_seconds) × 1.25)`を候補とする。outlier除外・retryはしない。

| budget key | 入力と式 | 人間承認後の正式状態 |
| --- | --- | --- |
| `TIME_BUDGET_SMOKE_SECONDS` | `ceil(max(11.35, 16.10, 14.81) × 1.25) = ceil(20.125)` | **21秒** |
| `TIME_BUDGET_UNIT_SECONDS` | `ceil(max(101.82, 99.19, 96.91) × 1.25) = ceil(127.275)` | **128秒** |
| `TIME_BUDGET_INTEGRATION_SECONDS` | baselineがexit 2、failed 2 files / 5 assertions、skip 24 files。追加測定なし | **`PENDING`** |
| `TIME_BUDGET_E2E_SECONDS` | baselineがskip 33 files。追加測定なし | **`PENDING`** |

`PENDING`は0秒、無制限、N/A、PASSではなく、数値budgetを未確定のままfail-closedに保持する状態である。母集団、runner、host条件が変わった場合、またはintegration/e2eを閉包する場合は、同じ個別commandで再測定し、別の人間承認を要する。

## 現行purity ratchetとの差と収束方針

現行`tests/unit/t-test-size-drift.test.ts`にはtier×size purity ratchetが存在するため、「tier-aware判定が全面的に存在しない」とは扱わない。一方、target契約を達成済みとも扱わない。

- 現行はrepository FS/sourceを再走査し、private `MAX_SIZE_BY_SCOPE`とallowlistを使う。
- 現行smokeは`null`で除外するが、targetは`smoke → medium`である。
- 現行unknown tierは`other`としてskipするが、targetはregistry外をindeterminateにする。
- 現行はstructured result、observed ref、auxiliary/indeterminate count、閉じたdiagnosticsを持たない。
- 将来実装は現行ratchet assertion、unit non-small allowlistの縮小性、CI到達性を維持しつつ、U1 ledgerと単一shared policyのconsumerへ収束させる。
- 並行する第2 policy・第2 gate・第2 FS scanを恒久追加しない。
- declared-vs-measured gateは直交する既存契約として非破壊温存する。

本intentでは現行test、allowlist、runner、CI、公開docsを変更しない。policy/evaluationの実装、serialization、exit code、CI配線、落ちる実証は別intentの明示範囲である。

## FR / ACトレーサビリティ

User Stories stageはSKIPのため、`unit-of-work-story-map.md`のU2「是正基準の確立」をユーザー価値の正本とする。

| 要求 | 本recordの証拠 |
| --- | --- |
| FR-2 / AC-2a | 50/45/5のnamed ratio guideline表 |
| FR-2 / AC-2b | U1 ref限定の60/379/3、13.6%/85.7%/0.68%とgap |
| FR-2 / AC-2c | ratioをverdict、exit code、CI、定数コードへ接続しない |
| FR-3 / AC-3a | 4行policy、Named/auxiliary/invalid分離、smoke=`medium` |
| FR-3 / AC-3b | strict比較、3 result、3 reject reason、3 diagnostic kind、不変条件、実装/CI Out |
| FR-3 / AC-3c | smokeをintegration相当のmedium上限として明記 |
| FR-5 / AC-5a | clean detached測定、8 invocation、式、ソロモードでの人間直接承認、21/128/PENDING/PENDING |
| FR-5 / AC-5b | 4 budget状態をguidelineだけに限定 |
| FR-7 / HANDOFF | executable deltaなし、既存dirty worktreeを測定面から除外、#1157未接触 |

## Files created / modified

本U2 code-generation作業が直接扱うrecordは次の3ファイルだけである。

| path | action |
| --- | --- |
| `construction/U2-layer-spec-gate/code-generation/code-generation-plan.md` | plan進捗、実測・承認証拠を更新 |
| `construction/U2-layer-spec-gate/code-generation/code-generation-questions.md` | Q1/Q1a/Q2/Q3と測定証拠を記録 |
| `construction/U2-layer-spec-gate/code-generation/code-summary.md` | 本正式recordを作成 |

質問回答とartifact writeに伴うaudit appendはframework-owned eventであり、auditを直接編集・巻き戻していない。`amadeus-state.md`、`memory.md`も直接編集していない。既存dirty変更を本作業の成果として数えない。

## Test coverage summary

本ユニットにはexecutable deltaがないため、新規unit/integration/e2e test coverageはN/Aである。これはPASSやBuild and Testへの先送りではない。既存runner実行はbudget observationであり、実装coverageの主張には使わない。

- smokeの3観測はすべて14 files / 343 assertions、exit 0、failed 0、explicit skip 0。
- unitの3観測はすべて212 files / 2,998 assertions、exit 0、failed 0、explicit skip 0。
- integration baselineは148 files / 1,943 assertions、exit 2、failed 2 files / 5 assertions、explicit skip 24 files。
- e2e baselineは69 files / 146 assertions、exit 0、failed 0、explicit skip 33 files。
- assertion-level skipはrunner非公開のため全tierでN/A。

したがって「full suite green」「integration PASS」「e2e完全観測」は主張しない。

## Deviations from plan

未承認の逸脱はない。[PR #1183](https://github.com/amadeus-dlc/amadeus/pull/1183) mergeというchange eventに対し、Q1aで人間確認後にU2 runtime subjectを更新した。追加試行数・順序・式・余裕率はQ2、人間が採用するbudget状態はQ3でそれぞれ事前承認され、未承認trial、retry、outlier除外を行っていない。

generic code/test必須項目は、承認済みFR-7とU2 unit境界が設計recordだけを要求するためN/Aとした。application codeやtestを捏造せず、設計契約、実測、再現可能な証拠に閉じた。

## Scope / diff guard

- application code、`tests/`、`tests/run-tests.sh`、`tests/run-tests.ts`、collector、CI、repository docs、package、`dist/`へ本作業由来の直接変更なし。
- tier-aware gate、ratio/budget強制化、serialization、exit code、失敗注入、CI配線を実装していない。
- 実テスト移設・retier、新分類器、#683配線へ着手していない。
- #1157へ着手していない。
- 現在worktreeのdirtyなt115/t118やorchestrator変更を測定に使わず、本U2成果へ帰属させていない。
- command、時刻、wall、count、exit、skip、raw hash、runner hash、manifest、environment、clean、exactly-onceを本recordへ永続化した後、subject ref・clean・manifestを再確認して一時detached worktree登録を解除した。直接削除は安全ポリシーにより行われず、evidenceは復元可能な`/Users/j5ik2o/.Trash/amadeus-u2-rebased-baseline.KXl1Ip-20260717T231331Z`へ移動した。旧中断baseline `/tmp/amadeus-u2-baseline.dKQLzy`は保持した。

## 未決事項

- `TIME_BUDGET_INTEGRATION_SECONDS`と`TIME_BUDGET_E2E_SECONDS`は`PENDING`。将来の再測定protocolと数値は未決であり、本recordは推測しない。
- target policy/evaluation resultの具体的exported型名、配置、serialization、stderr、exit code、CI配線、既存ratchet収束実装は別intentで決める。
- 上記以外にU2 code-generation内の人間判断待ちはない。

## Review

**Verdict:** READY  
**Reviewer:** `amadeus-architecture-reviewer-agent`  
**Date (UTC):** 2026-07-17T23:13:31Z  
**Iteration:** 1

### Findings

blocking findingはない。

### Validation evidence

| 検証項目 | 結果 |
| --- | --- |
| U1/U2 ref分離 | PASS — U1分類正本は`3917a283...`、U2 runtime subjectは`244a196...`と明確に分離されている。[PR #1183](https://github.com/amadeus-dlc/amadeus/pull/1183)後の追加2・変更5、計7 test filesもGit objectと一致した。 |
| 論理result契約 | PASS — `admission-rejected / complete / indeterminate`の3 result、3 reject reason、3 diagnostic kindがNFR設計と一致する。 |
| count invariants | PASS — 全行の排他的分類、size count総和、diagnostics件数、complete/indeterminate別の`violationCount`、authoritative report抑止条件が矛盾なく閉じている。 |
| runtime evidence | PASS — detached HEAD、clean状態、runner hash/blob、8 invocationの順序・件数・成否・時刻が保存済みevidenceと一致した。追加test実行は行っていない。 |
| evidence integrity | PASS — 28/53/36/42 entryの4 manifestは記載digestと一致し、`shasum -c`も全件成功した。stdout/stderr hashも一致し、全stderrは0 byteだった。 |
| budget計算 | PASS — smokeは`ceil(16.10 × 1.25)=21`、unitは`ceil(101.82 × 1.25)=128`。Q2/Q3の人間回答と一致する。 |
| PENDING | PASS — integrationはexit 2・2 files/5 assertions失敗・24 skip、e2eは33 skipのため、いずれも数値化せず`PENDING`としている。PASS・0秒・無制限へ縮退していない。 |
| executable scope | PASS — U2成果物は3つのrecord markdownに限定され、application code、test、runner、CI、`dist/`、#1157を成果へ帰属させていない。既存dirty worktreeを測定に使わず、clean detached worktreeへ分離している。 |
| 現行ratchetとの関係 | PASS — 現行FS scan/private policy/allowlist、`smoke:null`、unknown tier skipを達成済みtargetと誤認せず、将来は単一policy・単一scanへ収束するとしている。並行する第2 gate/policyを要求していない。 |
| mandatory 4 sections | PASS — `Key implementation decisions`、`Files created / modified`、`Test coverage summary`、`Deviations from plan`がすべて存在する。 |

### Summary

U2成果物は承認済みのrecord-only境界を守りつつ、U1分類oracleとU2 runtime observationを混同せず、論理判定契約・実測証拠・予算状態・現行ratchetからの移行境界を再現可能な形で閉じている。blocking findingはなく、architecture reviewはREADYである。

## Review — Iteration 2

**Verdict:** READY  
**Reviewer:** `amadeus-architecture-reviewer-agent`  
**Date (UTC):** 2026-07-17T23:17:02Z  
**Iteration:** 2

### Findings

新規blocking findingはない。Iteration 1のREADY判定に回帰はない。

### Validation evidence

| 検証項目 | 結果 |
| --- | --- |
| detached worktree cleanup | PASS — `/private/tmp/amadeus-u2-rebased-baseline.KXl1Ip/tree`は`git worktree list --porcelain`に存在せず、旧`/tmp/.../tree` pathも消滅している。 |
| evidence移動 | PASS — evidenceは`/Users/j5ik2o/.Trash/amadeus-u2-rebased-baseline.KXl1Ip-20260717T231331Z/evidence`に97 filesを保ったまま存在し、読み取り・復元可能である。 |
| 移動後のintegrity | PASS — 28/53/36/42 entryの4 manifestはIteration 1と同じdigestを保持し、移動先での`shasum -c`も全件成功した。 |
| 旧中断baseline | PASS — `/tmp/amadeus-u2-baseline.dKQLzy`の`tree/`と`evidence/`は保持され、Git worktree登録も`/private/tmp/amadeus-u2-baseline.dKQLzy/tree`として残っている。 |
| cleanup記録 | PASS — `Scope / diff guard`は、一時worktree登録解除、Trashへの復元可能な移動、旧中断baseline保持を実態と一致する形で記録している。実行時pathは歴史的観測値として維持されている。 |
| 契約本文の回帰 | PASS — U1/U2 ref分離、4 NamedTier policy、3 result・3 reject reason・3 diagnostic kind、count invariants、21/128/PENDING/PENDING、現行ratchetとの非二重化、executable deltaなし、mandatory 4 sectionsの各anchorは維持されている。 |
| Review履歴 | PASS — Iteration 1本文は改変されず、検証結果とREADY判定が保持されている。 |
| 追加実行・変更 | PASS — test・runner・sensor・engineは実行せず、repo/audit/stateを変更していない。検証はworktree登録、保存ファイル、hashのread-only照合に限定した。 |

### Summary

Step 8 cleanupは、正式recordへ再現情報を残したうえで一時worktreeだけを解除し、raw evidenceを復元可能なTrashへ保全している。移動後も4 manifestは完全に検証可能で、旧中断baselineも保持されている。Iteration 1で確認した設計契約・予算・scope境界に回帰はなく、U2 code-generation成果物はREADYである。

## Sensor verification

ゲート報告前にmanual fireし、終了コードではなくauditのterminal rowをverdict根拠とした。

| sensor | manual fire / audit verdict | 判定 |
| --- | --- | --- |
| `answer-evidence` | fire id `f5da0a46`、2026-07-17T23:18:03Z、audit `SENSOR_PASSED` | PASS |
| `linter` | manifest `matches: **/*.{ts,js}`。U2 outputに該当code fileなし | N/A |
| `type-check` | manifest `matches: **/*.{ts,tsx}`。U2 outputに該当code fileなし | N/A |

無関係な既存dirty TypeScriptへcode sensorを誤適用しておらず、今回のmanual fireに対応する`SENSOR_FAILED`はない。
