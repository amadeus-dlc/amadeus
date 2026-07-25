# Reliability Design — harness-provenance

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## Failure handling

business-logic-model.mdの各不確実性を`unknown`へ畳み、reliability-requirements.mdのbirth継続を実現する。security-requirements.mdのraw非記録、performance-requirements.mdの同期固定処理、scalability-requirements.mdのprocess-local境界、tech-stack-decisions.mdの既存test/drift guardを維持する。

| Failure | Design |
|---|---|
| invalid/空override | unknown、no fallthrough |
| 未知dir/fallback | unknown、birth継続 |
| state write failure | 既存I/O errorをそのまま失敗として返す |
| Harnessなし既存V7 | optional fieldとして成功 |
| diary観測なし | synthetic entryなし |

circuit breaker、retry、failover、replication、backupは外部dependency・永続storeがないため非該当である。

## Public compatibility facade

既存`harnessDir(): string`を`amadeus-lib.ts`所有のpublic compatibility facadeとして維持する。内部実装は`resolveHarnessDir().dir`への射影だけとし、次の契約を保存する。

- signatureとstring戻り値を変えない
- truthyな`AMADEUS_HARNESS_DIR`を各callでcacheより先に評価する
- env結果はcacheせず、非env`HarnessDirResolution`だけをprocess内cacheする
- envなし・検出不能時の公開文字列は従来どおり`.claude`

依存方向は既存caller → `harnessDir()` → private resolverであり、resolverからcallerへ逆参照しない。同一processでenvを切り替える回帰testと、fresh subprocessでscript-path/CWD/fallbackの既存string結果を固定する。

## Observability

stateのexactly-one Harnessを一次面、通常memory entryを補助面とする。raw override、途中source、credentialはaudit/logへ追加しない。metric、trace、dashboard、external alertは追加しない。`unknown`自体を機械参照可能なdegradation signalとする。

## Verification

unit、`harnessDir()`互換回帰、fresh-process 6配布integration、state V7 regression、typecheck/lint/CI、dist/self-install drift checkを一つのrelease gateとして実行する。memoryは次の2 caseを両方gate化する。

1. 実観測entryあり: stateと同じ正規化済み`Harness=<type>`が存在し、raw override markerが存在しない
2. 実観測entryなし: synthetic entryを作らず、4見出しとfresh `total=0`を維持する
