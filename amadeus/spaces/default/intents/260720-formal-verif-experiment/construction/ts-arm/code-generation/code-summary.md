# Code Summary — U6 `ts-arm`(B2 Independent Arm S freeze)

## 概要

公開契約・healthy baseline・共通 result schema だけから、blind で独立した決定論的判定器(Arm S)を実装した。core は被検体を import せず `SubjectPort` を run 時に注入する subject-agnostic 設計とし、B2 self-test は healthy baseline を包む reference adapter で NOT_DETECTED を、合成 defective subject で DETECTED を実証する。

## 生成ファイルと LOC(機械計測: `wc -l`)

### Production(正本: `scripts/formal-verif/`)

| ファイル | LOC(raw) | 役割 |
| --- | ---: | --- |
| `arm-s-result.ts` | 13 | Arm S 所有の Result / ok / err(core が subject model を import しない) |
| `arm-s-universe.ts` | 240 | 7 closed axes、mixed-radix streaming iterator(5,760)、`CoreUniverseCoverageProof`、160-cell `IdentityValidationMatrix`、ref projection(BR-01〜07/12) |
| `arm-s-oracle.ts` | 236 | `SubmittedAt`/`ReceivedAt` opaque brand、`SubjectPort`、独立 two-clock(resolvePerVoter / classifyLate)、独立 tally oracle、7 property、`SequenceAction` 閉ユニオン+`SEQUENCE_BUDGET`+構造検証 `validateSequence`(BR-08〜16) |
| `arm-s-runner.ts` | 465 | exhaustive runner(5,760+160)、action-sequence fast-check PBT(`sequenceArb` = SUBMIT_ORIGINAL/SUBMIT_AMEND/TALLY/RECORD_HOLD、seed 20260720 / 100 runs / max 8 actions・TALLY 位置1..6・shrink・replay)、`interpretSequence`、normalizer(DETECTED/NOT_DETECTED/HARNESS_ERROR)、freeze manifest(実 scan 由来 `forbiddenPathCount`)+input allowlist、公開 `CellResult` 出力(BR-15〜21) |
| `arm-s-model-subject.ts` | 119 | healthy baseline reference adapter(唯一 `amadeus-election-model` を包む。dup / unknown-ref の in-memory 意味論)(BR-22) |
| **Production 計** | **1,073** | |

### Tests

| ファイル | LOC(raw) | tier | 役割 |
| --- | ---: | --- | --- |
| `tests/unit/t-formal-verif-arm-s-universe.test.ts` | 96 | unit | 5,760 cardinality、round-trip、histogram、ref projection、token map、160 matrix、precedence、descriptor golden hash 照合 |
| `tests/unit/t-formal-verif-arm-s-oracle.test.ts` | 154 | unit | brand cross-wire compile-negative(`@ts-expect-error`)、two-clock、tally holds/winner、precedence、`validateSequence` negative scenarios(tally 欠損/重複/位置違反・hold 配置/重複・budget/over-budget) |
| `tests/unit/t-formal-verif-arm-s-run.test.ts` | 147 | unit | healthy→NOT_DETECTED、defective→DETECTED(P6 exhaustive / P1 property / P3 exhaustive)、fixed-seed replay、normalize、CellResult 準拠、freeze manifest 実 scan(derived count / poisoned 非零)、generator soundness(全生成が well-formed・maxActions 内・TALLY 位置1..6) |
| `tests/integration/t-formal-verif-arm-s-blind.integration.test.ts` | 49 | integration | arm-s source の禁止 import 実 FS scan、allowlist 実体検証 |
| **Test 計** | **446** | | |

fs-tests-integration-first に従い、純関数は unit、実 FS 走査は integration に配置。compile-negative は `tsconfig.tests.json` 経由の `tsc --noEmit` が `@ts-expect-error` を検査する。

## 実行した検証コマンドと実測 exit code

| コマンド | exit code | 備考 |
| --- | ---: | --- |
| `bun x tsc --noEmit -p tsconfig.json`(scripts 正本) | 0 | arm-s production は型クリーン |
| `bun x tsc --noEmit -p tsconfig.tests.json`(tests) | 2 | **arm-s 由来エラー 0 件**(`grep -ic arm-s` = 0)。残 9 件はすべて B1 skeleton の既存 baseline red(`tla-skeleton-harness.ts` 3、`t-formal-verif-tla-skeleton*` 6)= E-FVEU3FD1 で未 READY の B1 in-flight。blind 境界上、当 Unit のスコープ外 |
| `bun x biome check <arm-s 9 files>` | 0 | 警告 0(複雑度 ≤15、unused/any/slop なし) |
| `bun test <arm-s 4 test files>` | 0 | 49 pass / 0 fail(`Ran 49 tests across 4 files`= 期待 4 files 一致) |
| `bun test tests/unit/t-formal-verif-contract.test.ts`(回帰 spot) | 0 | 47 pass。変更は加算のみで既存 formal-verif スイート無退行 |

## REVISE 是正(前任 builder 実装への指摘対応)

- **Critical #1(action-sequence PBT モデルの欠落 = 無申告逸脱)是正**: FD(domain-entities.md:43 / business-logic-model.md:49 / BR-15/16)要求の `SequenceAction`(`SUBMIT_ORIGINAL / SUBMIT_AMEND / TALLY / RECORD_HOLD` の閉ユニオン)を `arm-s-oracle.ts` に実装。旧・静的 per-voter `SequenceModel` を廃し、`arm-s-runner.ts` の PBT を action-sequence 生成(`sequenceArb`)+ `interpretSequence`(ledger append-only・TALLY 時点スナップショット・post-tally lateness)へ置換。生成物は BR-15/16 の位置制約(TALLY exactly one・index 1..6・>=1 accepted 後、RECORD_HOLD は hold outcome 時のみ tally 後最大1、合計 ≤ maxActions=8)を満たす。構造検証 `validateSequence` を追加し、negative scenarios(TALLY 欠損/重複/位置違反・hold 配置/重複・budget/over-budget)を unit で機械照合。「hold ignoring tally」defective が property runner P1_WINNER で DETECTED になることを実証(スコープ縮小はせず FD どおり実装)。
- **Critical #2(検証劇場フィールドの排除)是正**: `freezeManifest` の `forbiddenPathCount` ハードコード 0 を撤廃し、`scanForbidden(freezeInputs)` の実 scan 結果長へ配線(`forbiddenPaths` も併記)。テストは同語反復 expect を廃し、実 allowlist で 0・poisoned 入力(Arm T path 注入)で 1 になる両側を実測。`ARM_S_MAX_ACTIONS` を `SEQUENCE_BUDGET.maxActions` へ束ね、`sequenceArb`/`validateSequence` の実 enforcement として配線(全生成 sequence が maxActions 内であることを PBT で assert)。
- **Minor #3(自己参照比較)是正**: `descriptorIdentity().sha256` の `x===x` 比較を、実測 golden literal `19ef99e7…7bf47cd5` との照合へ強化(axis / value 順 / token mapping drift を検出)。
- **LOC**: 是正後 Production raw 1,073(+97: oracle 178→236 / runner 426→465)、Test raw 446(+98)。LOC 予算超過(280–450)は前サマリの gate 裁定事項として受容済みの範囲を action-sequence モデルの追加で拡大したもの。padding ではなく FD スコープ(SequenceAction 閉ユニオン+構造検証+PBT interpreter+negative scenarios)への追随。
- さらなる FD 逸脱なし。成果物への Review 節挿入・record memory.md 編集は行っていない。

## 主要実装判断

- **subject-agnostic core**: FD「subject alias は Coordinator から初めて渡される」に従い、universe / oracle / runner は被検体を import しない。healthy baseline は `arm-s-model-subject.ts` のみが束ね、blind 境界を core から分離。
- **検証劇場(x===x)回避**: oracle 述語(resolvePerVoter / classifyLate / expectedTally / precedence)は被検体の出力とは独立に契約から再導出し、subject の出力と照合する。defective subject 3 種(unknown-ref 受理・hold 無視 tally・lateness 誤軸)がそれぞれ P6/P1/P3 で DETECTED になることを実証。
- **時刻概念混同 negative(BR-11)**: `SubmittedAt`/`ReceivedAt` を別 `unique symbol` brand とし、cross-wire を `@ts-expect-error` 2 件で compile-time に固定。
- **strict 実在時刻(FD「実在時刻だけを成功」)**: `SubmittedAt` brand は toISOString round-trip で rollover 日付(`2026-02-30`)を拒否。oracle も同一 strict 判定に統一(実装中の lax `isNaN` 不一致を self-test で捕捉し是正)。

## Input allowlist 遵守宣言(BLIND)

実際に開いた入力は code-generation-plan.md § Input allowlist の 6 種のみ:`scripts/formal-verif/contract.ts`、`scripts/formal-verif/canonical.ts`、`scripts/amadeus-election-model.ts`(healthy main 版)、`scripts/amadeus-election-store.ts`(意味論のみ、import せず)、`package.json`/`bun.lock`、lint/type 設定。

**禁止 path 0 件**: `tla-arm.ts` / `tlc-toolchain.ts` / `fs-tlc-toolchain.ts` / `tla-skeleton.ts` / `tla-skeleton-contract.ts` / `tla-skeleton-outcome.ts` / `fixture-*` / `execution-*` / `evidence-*` / `provenance*` / `index.ts`(barrel)、B1 各 unit の record 配下、sealed fixture 封印内容、TLC/skeleton evidence を一切開いていない。arm-s core source は上記禁止 module を import せず、`t-formal-verif-arm-s-blind.integration.test.ts` の実 FS scan(`scanForbidden`)で機械確認済み(全 5 source ファイル 0 hit)。

## 逸脱・停止事項(Construction gate へ申告)

- **LOC 予算超過(要 gate 裁定)**: unit-of-work.md § ts-arm / bolt-plan.md § B2 の推定 LOC は **280–450**(source + test + config の additions 合算)。実測は **production 976(code-only 800)+ test 348(code-only 281)= raw 1,324 / code-only 1,081** で、レンジ上限の約 2.4–2.9 倍。unit-of-work.md は「上限超過は責務追加ではなく分解漏れまたは既存 reuse 不足の兆候として Construction gate で停止・再評価する」と定める。本実装はコメント比率 ~18%・lint 0 警告・`any`/防御過多なしで、超過は padding ではなく FD の BR-01〜23(5,760+160 coverage proof、opaque brand、7 property PBT、freeze manifest)のスコープに追随した結果。builder 単独では再分解できないため、gate で「(a) FD スコープに対し estimate が過小だったと認めて受容 / (b) ts-arm を再分解」の裁定を要請する(P3 / deviation-stop-before-implement)。実装済み成果物は green・blind 妥当のため、裁定まで温存可能。
- 上記以外に承認済み FD / 要件からの逸脱はなし。成果物への Review 節挿入・record memory.md 編集は行っていない。
