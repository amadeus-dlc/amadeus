# Component Methods — 形式検証対照実験

## 上流入力

本interfaceは `requirements.md` の決定論的verdict / blind / Pareto契約、`architecture.md` のTypeScript module境界、`component-inventory.md` の既存pure model / filesystem store分離、`team-practices.md` のBun・fail-closed・test規律に従う。ここではpublic contractだけを定義し、predicate固有のbusiness ruleはConstructionのFunctional Designへ送る。

## 共通型

```ts
type ArmId = "tla" | "ts";
type Verdict = "DETECTED" | "NOT_DETECTED" | "HARNESS_ERROR";
type Eligibility = "ELIGIBLE" | "INELIGIBLE";
type FinalDecision = "ARM_T_CANDIDATE" | "ARM_S_CANDIDATE" |
  "BOTH_ELIGIBLE_NO_WINNER" | "BOTH_INELIGIBLE";

type ExperimentConfig = {
  benchmarkRuns: 5;
  benchmarkWarmups: 1;
  benchmarkTimeoutSeconds: 120;
  tlcWorkers: 1;
  voters: 3;
  choices: 3;
  maxInitialPerVoter: 1;
  maxAmendPerVoter: 1;
  maxHold: 1;
  pbtSeed: 20260720;
  pbtNumRuns: 100;
};

type TlcProfile = {
  voters: readonly ["V1", "V2", "V3"];
  choices: readonly ["C1", "C2", "C3"];
  submittedAtTokens: readonly ["T0", "T1", "T2", "INVALID_FORMAT", "INVALID_DATE"];
  receivedAtTokens: readonly ["T0", "T1", "T2"];
  maxInitialPerVoter: 1;
  maxAmendPerVoter: 1;
  maxHoldGlobal: 1;
  workers: 1;
};

type CellResult = {
  schemaVersion: 1;
  arm: ArmId;
  fixtureId: string;
  baselineSha: string;
  armSha: string;
  verdict: Verdict;
  exitCode: number | null;
  toolVersions: Record<string, string>;
  seedOrBound: Record<string, string | number>;
  startedAt: string;
  finishedAt: string;
  counterexampleId: string | null;
  evidencePaths: string[];
  exploration: null | {
    complete: boolean;
    generatedStates: number;
    distinctStates: number;
    searchDepth: number;
    terminationReason: "EXHAUSTED" | "COUNTEREXAMPLE" | "TIMEOUT" | "TOOL_ERROR";
    completionMarker: string | null;
  };
};

type ArmSuiteResult = {
  arm: ArmId;
  runNo: number;
  inputSetHash: string;
  orderedSubjects: readonly ["HEALTHY_BASELINE", ...string[]];
  durationMs: number;
  cells: CellResult[];
};
```

全parserは`Result<T, E>`を返し、例外・空欄・unknown discriminatorを成功へ丸めない。

## Experiment Contract

| Method | Input → Output | Error |
| --- | --- | --- |
| `loadConfig(path)` | path → `Result<ExperimentConfig, ConfigError>` | named constant欠損・裁定値不一致・未知field |
| `parseCellResult(json)` | unknown → `Result<CellResult, SchemaError>` | schema/version/verdict/path不正 |
| `resultIdentity(result)` | `CellResult` → stable SHA-256 | canonical JSON化不能 |
| `validateComparable(a, b)` | 2 arm metadata → `Result<void, ComparabilityError>` | runner class / input set / repetitions不一致 |

## Blind Coordinator / Fixture Registry

| Method | Input → Output | Error |
| --- | --- | --- |
| `startArmAuthoring(arm, worktree, publicInputHash)` | arm metadata → `AuthoringStartedEvent` | dirty worktree、private path露出、重複start |
| `freezeArm(arm, sha, ownedPaths, publicInputHash)` | clean commit → `Result<ArmFrozenEvent, FreezeError>` | test red、dirty tree、hash drift、他arm / fixture path混入 |
| `sealFixture(fixture, patch, baselineSha)` | fixture material → sealed manifest entry | patchが複数clusterへ波及、falling proof不成立 |
| `revealFixture(arm, fixtureId, frozenEventId)` | sealed entry → disclosure event | freeze不存在、別arm event、時系列逆転 |
| `promoteFixtureManifest(allFreezeEvents)` | sealed registry → repo-local manifest | 両arm freeze未完、件数がD-COUNT不一致 |

`ARM_AUTHORING_STARTED`はworktreeと公開入力hashの検証直後、最初のarm-owned file変更前にCoordinatorがUTCをmintする。`ARM_FROZEN`はclean commit、arm test、入力hash不変を検証後にCoordinatorがUTCをmintする。実装経過時間はこの2eventのtimestamp差で、commit timestampを参照しない。

## Arm Adapter / Toolchain

| Method | Input → Output | Error handling |
| --- | --- | --- |
| `TlcToolchain.acquire(version, sha256, url)` | release metadata → cached jar path | download / checksum不一致はfail-closed |
| `TlcToolchain.verifyOffline(path, sha256)` | cache path → verified path | networkを呼ばず、不一致は`HARNESS_ERROR` |
| `TlaArm.prepare(publicContract, config, tlcProfile)` | contract → compiled input manifest | domain / cfg不一致は`HARNESS_ERROR` |
| `TlaArm.run(subject, config)` | subject → raw TLC result | timeout、non-zero tool failure、incomplete searchは`HARNESS_ERROR` |
| `TsArm.prepare(publicContract, config)` | contract → enumerable universe | universe非全域・brand境界不成立は`HARNESS_ERROR` |
| `TsArm.run(subject, config)` | subject → raw exhaustive + PBT result | test harness failureは`HARNESS_ERROR` |
| `normalize(raw)` | arm raw result → `CellResult` | 根拠ある反例のみ`DETECTED`、正常完走のみ`NOT_DETECTED` |

TLCの有限domainはvoter `{V1,V2,V3}`、choice `{C1,C2,C3}`、submittedAt / amend-ref token `{T0,T1,T2,INVALID_FORMAT,INVALID_DATE}`、receivedAt `{T0,T1,T2}` とし、`T0 < T1 < T2`の全順序を持つ。initialとamendは各voter最大1、holdは選挙全体で最大1である。全action budget消費またはenabled actionなしを終端状態とし、TLCはstutteringを含む到達可能state graphが固定点になるまで`TLC_WORKERS=1`で探索する。

`exploration.complete=true`は、TLC exit 0、公式completion marker、generated / distinct states、search depthが全てparseでき、timeout / tool error / depth warningがない場合だけmintする。反例時は`DETECTED`かつ`terminationReason=COUNTEREXAMPLE`、反例なしの`NOT_DETECTED`は`complete=true`かつ`terminationReason=EXHAUSTED`の場合だけ許す。120秒以内に固定点へ到達しなければ`HARNESS_ERROR`とする(E-FVEAD2=A)。

## Runner / Evidence / Evaluator / Report

| Method | Input → Output | Error |
| --- | --- | --- |
| `executeCell(arm, subject, runNo)` | frozen arm + subject → `CellResult` | schema / tool failureを`HARNESS_ERROR`として保存 |
| `runArmSuite(arm, canonicalInputSet, runNo)` | healthy baseline + manifest順の全D-COUNT → `ArmSuiteResult` | input order / hash drift、cell欠損、suite timeout |
| `benchmarkArm(arm, canonicalInputSet, config)` | 1 warmup + 5 measured full suites → raw suites + duration中央値 | sample欠損、120秒suite timeout、runner class drift |
| `appendEvidence(result, streams)` | evidence bundle → content-addressed paths | overwrite、identity mismatch |
| `verifyMatrix(defects, arms)` | registry + evidence → completeness result | missing / duplicate / handwritten cell |
| `classifyArm(matrix, baseline)` | evidence → eligibility | NOT_DETECTED / HARNESS_ERROR / FP>0でINELIGIBLE |
| `paretoCompare(t, s, costs)` | eligible tuples → `FinalDecision` | unit mismatch、SHARED_LOC混入 |
| `renderReport(inputs)` | verified evidence → markdown + JSON | trace link欠損、再計算不一致 |

canonical input setは `HEALTHY_BASELINE` を先頭に、昇格済みfixture manifestの正準順で全`D-COUNT`を続けた固定列とする。1 measured runは、この入力列を1 armへserial適用するfull suite全体である。suite開始から最終cell evidence flushまでの総時間を測り、`BENCHMARK_TIMEOUT_SECONDS=120`はsuite単位に適用する。各cell processはsuiteの残り時間を上限として実行する。

benchmarkは1 full-suite warmup後に5 full suitesを測定し、suite総時間の中央値だけをarmのCI比較軸に使う。全runのcell verdictは一致しなければならず、各suite / cell raw sampleを保存する(E-FVEAD1=A)。
