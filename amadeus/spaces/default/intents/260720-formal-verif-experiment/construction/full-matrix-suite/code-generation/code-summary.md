# Code Summary — full-matrix-suite (U7 / Bolt 3)

## 上流入力(consumes 全数)

- `construction/full-matrix-suite/functional-design/business-logic-model.md`
- `construction/full-matrix-suite/functional-design/business-rules.md`
- `construction/full-matrix-suite/functional-design/domain-entities.md`
- `construction/full-matrix-suite/nfr-design/logical-components.md`
- `construction/full-matrix-suite/nfr-design/performance-design.md`
- `construction/full-matrix-suite/nfr-design/reliability-design.md`
- `construction/full-matrix-suite/nfr-design/scalability-design.md`
- `construction/full-matrix-suite/nfr-design/security-design.md`
- `inception/units-generation/unit-of-work.md`(§ full-matrix-suite)
- `inception/requirements-analysis/requirements.md`(FR-4/FR-5/FR-9, NFR-1/NFR-2)
- `inception/delivery-planning/bolt-plan.md`(§ B3)

## 実装概要

U7 は昇格済み manifest から canonical input set を組み、hash 由来の固定 schedule で serial full suites を駆動し、matrix 完全性と raw cost(LOC / authoring elapsed / suite median)を導出する。manifest 生成 / promotion 判断、eligibility / winner 決定、report 表現は所有しない(U8 責務)。U3/U4/U5 が第三 review 未成立のため、`FullMatrixEvidence` は `MatrixIntegrationStatus = DESIGNED_BLOCKED_ON_U3_U4_U5_GATE` を保持し、benchmark 完了 / code-generation 可を主張しない(BR-22/BR-23)。

serial suite 実行そのものは既存 `runArmSuite` / `executeCell`(execution-evidence.ts)を `SuiteRunnerPort` として再利用し、U7 は schedule 発行・SuiteStartReceipt chain・matrix 検証・cost 導出だけを新設した。全 identity は既存 `canonicalIdentity` の content-address。

### 主な関数(functional-domain-modeling-ts: type + closed union + port)

| 関数 | 責務 | 対応 BR |
| --- | --- | --- |
| `compileInputSet` | baseline 先頭 + D-COUNT alias、8/6 subject 固定、件数 / baseline / 重複拒否、`InputSetIdentity` | BR-01/02/03 |
| `compileSchedule` | `SHA-256(inputSetIdentity‖"suite-order-v1")` 最下位 bit で firstArm、12 entry、warmup opposite→first、measured odd first→opposite / even 逆、3 対 2 偏り metadata | BR-04/05 |
| `runFullMatrix` | ordinal 昇順に SuiteStartReceipt(predecessor chain)を発行し port を駆動、`MeasuredSuite` / `IncompleteSuite` 分類 | BR-06/07/08/09/10 |
| `verifyFullMatrix` | cell key bijection、receipt chain(ordinal / predecessor)、5-run verdict 一致、`HARNESS_ERROR_CELL / SUITE_TIMEOUT / MISSING / DUPLICATE / IDENTITY_CORRUPTION / CHAIN_DRIFT / NON_DETERMINISTIC` の closed finding | BR-10/11/12/13 |
| `aggregateTiming` | complete measured 5 本のみ sort → index 2 median + source run、warmup / partial / timeout 除外、raw 全保存 | BR-17/18/19 |
| `buildMatrixEvidence` | raw ref と derived identity を content-address で結合、incomplete matrix からは生成拒否、BLOCKED status 保持 | BR-21/22/23 |
| `measureArmAuthoredLoc` | arm-owned numstat additions+deletions 合計、binary / rename / allowlist 外拒否、shared 別計上 | BR-14/15 |
| `measureAuthoringElapsed` | `ARM_AUTHORING_STARTED`→`ARM_FROZEN` の UTC 差、actor/worktree/publicInputHash 連続性・順序検証、負値 / 会話時刻拒否 | BR-16 |

### 既存 reuse(二重実装なし)

`runArmSuite` / `executeCell` / `SampleKey` / `SuiteRunResult`(execution-evidence.ts)、`canonicalIdentity`(canonical.ts)、`ArmId` / `Result` / `Verdict` / `CellResult` / `isUtcInstant`(contract.ts)、`PromotedFixtureManifest`(fixture-registry.ts)、`DCount`(fixture-registry-domain.ts)、`ProvenanceEvent`(provenance.ts)。

命名衝突回避: 既存 `evidence-completeness.ts` の cell 完全性 `verifyMatrix` / `MatrixValidationResult`(データモデル `SuiteEvidence`)とは責務が異なるため、schedule / receipt-chain を所有する U7 側は `verifyFullMatrix` / `FullMatrixValidation` として区別した。

## 生成 / 変更ファイルと LOC(wc -l 実測)

| File | 区分 | LOC |
| --- | --- | --- |
| `scripts/formal-verif/full-matrix.ts` | 新規(production) | 231 |
| `scripts/formal-verif/full-matrix-cost.ts` | 新規(production) | 83 |
| `scripts/formal-verif/index.ts` | 変更(+2 export 行) | +2 |
| `tests/unit/t-formal-verif-full-matrix.test.ts` | 新規(test) | 177 |
| `tests/unit/t-formal-verif-full-matrix-cost.test.ts` | 新規(test) | 72 |

production 合計 = 231 + 83 + 2 = **316 LOC**。

## テスト(自 unit)

- `tests/unit/t-formal-verif-full-matrix.test.ts`(17 テスト): D-COUNT 7/5 subject count(8/6)・baseline-first・alias 順・件数外 / baseline / 重複拒否、hash-derived firstArm・warmup 順・measured odd/even 反転・3 対 2 偏り・entry identity 一意、96/72 cell 完全 matrix + receipt chain、SUITE_TIMEOUT → MISSING、HARNESS_ERROR_CELL 保存、5-run 非一致 → NON_DETERMINISTIC、complete 5-value median(index2 / source run)、不完全 suite で median 生成禁止、BLOCKED status 付き evidence、incomplete matrix からの evidence 生成拒否。
- `tests/unit/t-formal-verif-full-matrix-cost.test.ts`(10 テスト): arm-owned LOC 合計 + shared 別計上、binary / rename / allowlist 外 / 負値 / 非 SHA 拒否、authoring elapsed(event 差)、freeze 欠落 / 逆順 / 連続性破綻拒否。

実 FS 不使用(fake `SuiteRunnerPort` / `NumstatPort` / in-memory provenance events)のため unit 層に配置(fs-tests-integration-first に整合)。

## 検証コマンドと実測 exit code

| コマンド | Exit | 結果 |
| --- | --- | --- |
| `bun x tsc --noEmit -p tsconfig.json` | 0 | error 0 件 |
| `bun x tsc --noEmit -p tsconfig.tests.json` | 2 | total 9 件・全て B1 skeleton 既存 baseline(自 unit `full-matrix` 由来 0 件)。exit 2 は既存 red のスコープ外分 |
| `bun x biome check <変更5ファイル>` | 0 | clean |
| `bun test <自 unit 2 ファイル>` | 0 | `Ran 27 tests across 2 files`(27 pass / 0 fail) |
| `bun test tests/unit/t-formal-verif-contract.test.ts`(回帰 spot) | 0 | `Ran 47 tests across 1 file`(47 pass) |
| `bun test tests/unit/t-formal-verif-*.test.ts`(index 変更の波及確認) | 0 | `Ran 391 tests across 26 files`(391 pass) |

deslop: `$HOME/.agents/skills/deslop` の観点(不要コメント / 過剰防御 / any キャスト / 深いネスト / 周辺不整合)で自 diff を検分。any キャストなし、未使用 import なし(biome 確認済み)、深いネストは early-continue で回避済み。`expectedCellCount` を counter 変異から算術式へ簡素化(挙動不変)。編集後に全検証コマンドを再実行し上表を取得。

## 逸脱・申告

1. **LOC budget 上端超過(申告)**: production 316 LOC は unit-of-work 目安 180–300 を約 5%(16 行)超過する。責務追加ではなく、FD が U7 に列挙する 8 operation(input set / schedule / coordinator / matrix validator / LOC / elapsed / timing / evidence build)と closed finding/error taxonomy の内在サイズによる。既存インフラ(`runArmSuite` 等)は最大限 reuse 済みで、これ以上の削減は責務欠落を招く。unit-of-work の「超過は分解漏れまたは reuse 不足の兆候として Construction gate で停止・再評価」に従い、gate / reviewer の判断へ委ねる(実装前の停止は projected 320 と近接していたが未確定だったため実装を継続し、確定値をここで申告)。

2. FD / 要件からの機能的逸脱なし。BR-01〜BR-23 と domain-entities の port / error union に沿って実装した。
