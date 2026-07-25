# Logical Components — harness-provenance

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## Component inventory

business-logic-model.mdのflowを、tech-stack-decisions.mdの既存2module内へ配置する。performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.mdを満たすための新規service/infra componentは追加しない。

| Logical responsibility | Physical owner | Failure domain |
|---|---|---|
| Harness Type Parser | `amadeus-lib.ts` | invalid入力はunknown |
| Harness Dir Resolver | `amadeus-lib.ts` private | dir不明はfallback provenance |
| Harness Dir Compatibility Facade | `amadeus-lib.ts` public `harnessDir(): string` | resolverのdirだけを公開し既存callerを保護 |
| Harness Detector | `amadeus-lib.ts` export | 常に7値を返す |
| Harness Recorder | `amadeus-utility.ts`既存birth handler | state writeの既存I/O境界 |
| Verification Fixtures | `tests/unit` / `tests/integration` | production非関与 |
| Distribution Projection | existing manifests/package/promote | drift checkで隔離 |

## Dependency direction

```
Harness Recorder
  -> Harness Detector
       -> Type Parser
       -> Harness Dir Resolver
       -> Canonical Mapping

Existing Callers
  -> harnessDir() Compatibility Facade
       -> Harness Dir Resolver
```

`amadeus-utility.ts → amadeus-lib.ts`の一方向だけを許可する。resolverやDetectorからRecorderを参照せず、循環を作らない。

Compatibility Facadeは`resolveHarnessDir().dir`だけを返し、string signature、call-time env優先、非env resolution cache、fallback公開文字列`.claude`を保存する。Detectorはresolution全体を使うため、facadeを経由してprovenanceを再び失わない。両consumerは同じprivate resolverへ一方向に依存する。

## Isolation and blast radius

Harness検出失敗は新規intentのHarness fieldが`unknown`になる範囲に限定する。既存intent、既存`harnessDir()` caller、authentication、audit schema、memory template、外部systemへ波及しない。shared resourceはprocess.envとnon-env resolution cache 1件だけである。

## Infrastructure handoff

AWS、network、database、container、secret store、load balancerは不要である。Infrastructure Designでは「新規infrastructureなし」と、このlogical inventoryが既存local CLI/distribution boundaryに閉じることだけを確認する。
