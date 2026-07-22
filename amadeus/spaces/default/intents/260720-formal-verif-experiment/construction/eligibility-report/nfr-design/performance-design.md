# Performance Design — eligibility-report

## 上流と bounds

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。arms2、cells96/72、cost tuples2、Pareto axes3/comparison1、trace<=256に閉じる。

## EvaluationDeadline

`ReportPhaseSupervisor` はcommand total390秒のabsolute deadlineを持ち、evaluator/renderer/trace verifierをそれぞれisolated worker processで起動する。各workerへ`min(120秒,total remaining)`を渡し、deadline時はprocess group terminate 5秒、kill 5秒で強制停止して残りcleanup budgetへ移る。publisherは最大30秒で、任意worker timeoutではpublishせず30秒以内にstagingをquarantineする。event-loop協調停止へ依存しない。

matrix/traceをidentity rowsとしてstreamし、raw bundle bytesをheap/outputへ複製しない。structural/eligibility/Alloy/trace buildはrows線形、Paretoはboth eligible時1 comparisonだけとする。JSON/Markdown各16 MiB、trace256 entriesを超えたpartialを成功にしない。trusted publisherもrename前に各byte length、trace cardinality、closed roles/schemaを独立再検証する。

## Acceptance

72/96、eligibility4経路、dominance/tradeoff、Alloy、reversal mappings、deadline±1を検査する。raw execution calls=0、visits<=2×cells、weighted score=0、ack<=390秒、outputs<=16 MiBである。
