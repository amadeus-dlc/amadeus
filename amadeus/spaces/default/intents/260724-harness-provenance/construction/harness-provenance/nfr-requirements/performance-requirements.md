# Performance Requirements — harness-provenance

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## 適用範囲

business-logic-model.mdのintent birth同期処理とbusiness-rules.mdのresolver規則を対象とする。requirements.mdの後方互換性を守り、technology-stack.mdのBun/TypeScript実行基盤を維持する。外部serviceやnetworkは対象外である。

## 構造的性能目標

| ID | 目標 | 検証 |
|---|---|---|
| PERF-1 | `detectHarnessType()`の計算量は入力サイズに依存しないO(1) | 分岐と固定mappingのレビュー |
| PERF-2 | network I/O、subprocess、追加file read/writeは0 | import/呼出差分の検査 |
| PERF-3 | CWD probeは既存5候補に対する最大5回の`existsSync` | 全候補不在caseのspy/fixture |
| PERF-4 | intent birthあたりtype判定は1回 | Recorderの呼出回数test |
| PERF-5 | 非env resolutionはprocessあたり1回だけ計算し、resolution全体をcache | 同一process複数call test |
| PERF-6 | env overrideはcacheより前にcall-time評価 | env変更前後の同一process test |

根拠未測定のミリ秒SLOは置かない。既存intent birthにはfilesystem scan等の変動要因があり、本変更だけのwall-clock値を分離できないためである。

## Regression基準

- 追加テストは既存runnerの期限内に完了し、timeoutを延長しない
- `bash tests/run-tests.sh --ci`のtimeout・retry設定を本変更のために緩和しない
- dist/self-install再生成物でも正本と同じ構造的上限を維持する

wall-clock所要時間には再現可能なbaseline・環境固定・閾値がないため、合否ゲートには使わない。既存`t144-harness-seam`系と新規birth統合testの所要時間は診断用に1回記録してもよいが、増減だけでPASS/FAILを決めない。性能合否はPERF-1〜PERF-6の構造的上限と、既存runnerが既存timeout内に終了するかだけで判定する。

## Resource制約

新規runtime dependency、常駐process、worker、timer、socket、database、cache serviceを導入しない。process内cacheは`HarnessDirResolution` 1件のみで、intent数に比例して増加しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T22:45:00Z
- **Iteration:** 1
- **Scope decision:** none

構造的な性能・安全・scale・reliability・stack要件は実装可能だが、性能退行判定が非測定的で、必須Observabilityカテゴリが未定義である。

### Findings

- [Major] performance-requirements.md:22-27 は変更前後の所要時間を比較し「明白な退行」があれば失敗とするが、測定回数、集計値、実行環境、baseline、合否条件がなく再現可能な判定にならない。根拠のない固定ミリ秒値を置かない方針は妥当なので、この比較を非ゲートの観測報告へ明示的に降格するか、実測baselineから導く判定方法と閾値を定義する必要がある。
- [Major] nfr-requirements.md:85-92 が必須評価対象とするObservability（monitoring/logging/alerting/tracing）が5成果物のいずれにも定義されていない。本機能ではstateのHarness fieldが一次観測面、memoryが人間可読の補助面であり、外部monitoring・alerting・tracingは非該当、raw overrideは非記録という境界を測定可能な要件と検証方法として明記しないと、観測責務と非該当判断が実装者依存になる。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T22:46:59Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の2件のMajorは解消済みです。壁時計時間は再現可能な基準がないため合否ゲートから明示的に除外され、性能判定は測定可能な構造制約と既存タイムアウトに限定されました。Observability要件には、stateを一次情報、memoryを補助情報とする境界、raw値の非記録、metrics・trace・外部alertingを適用外とする根拠、および各検証方法が定義されています。5成果物はいずれも必須セクション数を満たし、4件の上流参照も解決しています。開発者が追加のアーキテクチャ判断なしで実装・検証できる状態です。

### Findings

- None
