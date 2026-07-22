# Reliability Design — full-matrix-suite

## 上流と complete boundary

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、全key/chain/identity/repeat一致時だけ比較を成立させる。

## Dual-store commit protocol

`BenchmarkControlStore` はclaim/start/terminalをsame-filesystem unique stagingへwrite/flushし、directory sync、nonexistent successorへのexclusive atomic rename、parent sync後だけackする。single-writer lockはdurable owner/nonce、dead-owner quarantine、normal releaseを持つ。response喪失はdeterministic transaction identityでlookupし、same identity/different bytesを拒否する。各ordinalはU7 start receipt後にU3 cellsを実行し、U3 `SuiteResultManifest`を先にdurable commitする。このmanifestはclosed unionで、`COMPLETE`は`ResourcePolicyIdentity`とpre/post telemetry identitiesを必須とし、`INCOMPLETE`は同policy identity、取得済みpre/post telemetry identities（0〜2件）、cause、および欠損時の`TELEMETRY_MISSING`または不一致時の`TELEMETRY_DRIFT` findingを必須とする。次にmanifest kind、resource/telemetry/finding identitiesとresult identityを参照するU7 terminalをexactly one commitし、両storeを再読してkind/identity/resource/telemetry/finding/predecessor一致後だけ次ordinalを開始する。

start後crashはcommitted cellsと取得済みtelemetryをlookupし、missing/causeと`TELEMETRY_MISSING` finding付きINCOMPLETE manifestへ収束する。U3 result後/U7 terminal前はresult lookupからterminalを再開する。terminal-only、same key/different bundle、両store未確認successorをcorruptionとして停止する。

## Derived recovery

matrix validatorはkey bijection、runner/input/freezeに加え、全`COMPLETE` suiteの`ResourcePolicyIdentity` exact equalityとpre/post telemetry存在・drift0、5-repeat agreementを再計算する。`INCOMPLETE`は取得済みtelemetryと明示findingの整合を検証するがcomplete/median入力へ含めない。全measured suiteが`COMPLETE`かつ検証greenでない限りmedianを生成しない。LOC/elapsed/medianはsource receiptsとalgorithm identityを持ち、raw evidenceを変更しない。

U7 lock/staging/rename/sync/ack、resource lease/capacity claim/resume/release、schedule claim/start、U3 result、U7 terminal、suite/cell、matrix/cost各境界へcrashを注入し、duplicate=0、resultなしterminal=0、resource/telemetry欠損complete=0、ordinal gap=0、不完全median=0を検証する。
