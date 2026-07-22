# Code Generation Plan — U6 `ts-arm`(B2 Independent Arm S freeze)

## 上流入力(consumes 全数)

本計画は次の当Unit設計成果物に依拠する: `functional-design/business-logic-model.md`、`functional-design/business-rules.md`(BR-01〜23)、`functional-design/domain-entities.md`、`nfr-design/performance-design.md`、`nfr-design/security-design.md`、`nfr-design/reliability-design.md`、`nfr-design/scalability-design.md`、`nfr-design/logical-components.md`、`inception/units-generation/unit-of-work.md`(§ts-arm)、`inception/requirements-analysis/requirements.md`(FR-3/FR-4・NFR-1/NFR-4)、`inception/delivery-planning/bolt-plan.md`(§B2)。

## Input allowlist(BLIND freeze 入力 — 公開契約と healthy baseline のみ)

Arm S は blind 比較実験の第2アーム(Arm S)であり、公開契約・healthy baseline・共通 result schema だけから独立起草する。実際に開いた入力を全数列挙する:

| 種別 | ファイル | 許可根拠 |
| --- | --- | --- |
| 公開 result schema(U1) | `scripts/formal-verif/contract.ts` | U1 experiment-contract-provenance の公開 CellResult / Verdict / Result schema。ts-arm FD 明示許可 |
| 公開 canonical hash(U1) | `scripts/formal-verif/canonical.ts` | U1 公開 canonical identity。proof identity 用 |
| healthy baseline(subject) | `scripts/amadeus-election-model.ts` | reuse inventory「TS arm で再利用」。healthy 選挙契約=被検体の公開 model。healthy main 版のみ参照、注入 branch は非参照 |
| healthy baseline store 意味論 | `scripts/amadeus-election-store.ts` | reuse inventory「公開契約の事実だけ再利用」。unknown-ref / amend 受理の healthy 意味論。import せず意味論のみ採取 |
| 依存 version | `package.json` / `bun.lock` | fast-check 4.9.0 の既存 lockfile 確認(新規依存追加なし) |
| lint / type 設定 | `biome.json` / `tsconfig.json` / `tsconfig.tests.json` | 既決 code style / type 検査境界 |

**禁止 path 0 件の宣言**: 次を一切開いていない — `tla-arm.ts`、`tlc-toolchain.ts`、`fs-tlc-toolchain.ts`、`tla-skeleton.ts`、`tla-skeleton-contract.ts`、`tla-skeleton-outcome.ts`、`fixture-*`、`fixture-registry*`、`fixture-scan`、`fixture-proof`、`fs-fixture-registry`、`execution-*`、`evidence-*`、`fs-evidence-store`、`provenance*`、`fs-provenance-store`、`index.ts`(barrel)、`proof-policy`/`execution-policy`/`receipt`/`repository-path-policy`、および B1 各 unit の record 配下 code-summary / code-generation-plan、sealed fixture 封印内容、TLC 実行証拠 / skeleton evidence。Arm S source は上記禁止 module を import せず、`tests/integration` の blind scan で機械確認する。

## 実装方針

Arm S は subject-agnostic な独立判定器である。core(universe / oracle / runner / normalizer)は被検体を import せず、`SubjectPort` を run 時に注入する(FD「subject alias は Coordinator から初めて渡される」)。B2 self-test は healthy baseline を包む reference adapter で NOT_DETECTED を実証し、defective subject の合成で DETECTED を実証する。oracle 述語は被検体の出力を独立計算した期待と照合し、自己参照比較(x===x 検証劇場)を避ける。

## Steps(story: S-2/S-3/S-5/S-6/S-8 → FR-3/FR-4・NFR-1/NFR-4)

- [x] Step 1: `scripts/formal-verif/arm-s-universe.ts` — 7 closed axes descriptor、TimestampTokenMap、mixed-radix streaming iterator(5760)、`CoreUniverseCoverageProof`(cardinality / unique key / axis histograms / first-last key / rolling hash)、`IdentityValidationMatrix`(160 cells、error precedence)、ref projection class。(BR-01〜07、FR-3)
- [x] Step 2: `scripts/formal-verif/arm-s-oracle.ts` — `SubmittedAt` / `ReceivedAt` opaque brand(別 unique symbol、parser / mint)、`SubjectPort` interface、in-memory `Ledger`、独立 `resolvePerVoter`(submittedAt のみ)、`classifyLate`(receivedAt のみ)、7 property 述語、error precedence 期待、`SequenceAction` 閉ユニオン(`SUBMIT_ORIGINAL / SUBMIT_AMEND / TALLY / RECORD_HOLD`)+`SEQUENCE_BUDGET`+構造検証 `validateSequence`。(BR-08〜16、FR-3/FR-4)
- [x] Step 3: `scripts/formal-verif/arm-s-runner.ts` — `ExhaustiveRunner`(5760 tuples + 160 cells の observation / coverage proof)、action-sequence `PropertyRunner`(fast-check 4.9.0、seed 20260720、numRuns 100、`sequenceArb` が `SequenceAction[]` を生成 — TALLY exactly one・位置1..6・>=1 accepted 後、RECORD_HOLD は hold outcome 時 tally 後最大1、合計 ≤ maxActions=8、shrink/replay)、`interpretSequence`(ledger append-only・TALLY スナップショット・post-tally lateness)、`TsNormalizer`(CounterexampleProof→DETECTED / CompletionProof→NOT_DETECTED / HarnessFailureProof→HARNESS_ERROR)、freeze / run manifest(`forbiddenPathCount` は実 scan 由来)+input allowlist、公開 `CellResult` 出力形。(BR-15〜21、FR-4/NFR-1/NFR-2)
- [x] Step 4: `scripts/formal-verif/arm-s-model-subject.ts` — healthy baseline reference adapter。`amadeus-election-model` の `Ballot.parse` / `resolveBallots` / `tally` / `classifyLate` を包み、in-memory append(dup / unknown-ref 判定)を healthy 意味論で実装。(BR-22、NFR-4 の subject 分離)
- [x] Step 5: `tests/unit/t-formal-verif-arm-s-universe.test.ts` — 5760 cardinality、mixed-radix round-trip、axis histogram、ref projection duplicate visibility、token mapping drift、160 validation cardinality、unknown election/voter/choice precedence。
- [x] Step 6: `tests/unit/t-formal-verif-arm-s-oracle.test.ts` — brand 分離(compile-negative `@ts-expect-error` で cross-wire / received↔submitted swap)、two-clock 独立、resolve tie(later arrival)、GoA block/discussion/quorum/tie hold、winner argmax、amend budget、unknown-ref、error precedence。
- [x] Step 7: `tests/unit/t-formal-verif-arm-s-run.test.ts` — healthy → NOT_DETECTED(5760+160+100 green proof)、defective subject 合成 → DETECTED、fixed-seed replay 一致、shrink identity 再現、HARNESS_ERROR 非丸め、`CellResult` normalization、freeze manifest allowlist に禁止 path 0。
- [x] Step 8: `tests/integration/t-formal-verif-arm-s-blind.integration.test.ts` — arm-s core source の禁止 import 機械 scan(fs 走査 → integration)、input allowlist manifest 検証。
- [x] Step 9: 検証同期実行(`bun run typecheck` / `bun run lint` / 対象 test)、deslop、`code-summary.md` 生成。

## Test 戦略

Standard。純関数(universe / oracle / runner / brand / PBT replay)は `tests/unit`(fs-tests-integration-first: 実 FS 非接触)、禁止 import の実 FS scan は `tests/integration`。compile-negative は `tsconfig.tests.json` 経由の `tsc --noEmit` が `@ts-expect-error` を検査する。

## 完成条件(unit-of-work.md § ts-arm)

- fixed seed の replay、直積全域性(5760)、時刻概念混同の negative test。
- input allowlist に skeleton / Arm T path 0 件(機械 scan)。
- production LOC 予算 280–450(超過は分解漏れの兆候として停止)。
- fast-check は既存 lockfile 4.9.0、新規依存追加なし。
