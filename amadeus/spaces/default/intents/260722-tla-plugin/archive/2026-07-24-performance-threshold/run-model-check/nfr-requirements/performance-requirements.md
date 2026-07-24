# Performance Requirements — U3 run-model-check

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 時間予算

- 単発TLC spawnのdeadlineは120秒とし、timeoutは HARNESS_ERROR へ写像する。
- CLI全体は環境取得、checksum、TLC、normalizeを含めCIの30分job timeout内で完了する。
- GitHub `ubuntu-latest` 2 vCPU/7GiB相当、Docker amd64、固定image/jar、cold pullを除外したwarm cacheでwarm-up 1回後に FormalElection を5回計測し、各回 exit 0かつ最大TLC spawn時間120秒未満を受入基準とする。全CLI時間も各回180秒未満とする。

## 資源制約

- stdout/stderrは既存16MB上限を維持し、超過はtruncate成功ではなく HARNESS_ERROR とする。
- 1 CLI invocation は1モデルだけを実行し、無制限並列やsuiteを導入しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T15:15:32Z
- **Iteration:** 1
- **Scope decision:** none

実行環境の固定値、成果物の失敗時整合性、並行実行契約が未確定です。

### Findings

- Critical: Docker/TLC供給物の固定値と受渡しが未定義。
- Major: out directoryのatomic publishと再実行契約が未定義。
- Major: 並行実行隔離と120秒計測条件が不足。
- Major: exit/output schemaが揺れている。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T15:20:55Z
- **Iteration:** 2
- **Scope decision:** none

供給固定値・実行予算・並行隔離・atomic publishは閉包したが、EnvReceiptと終局証跡の機械検証契約が未確定のため、前回の観測可能性／検証劇場防止の指摘が残る。

### Findings

- Major — EnvReceipt の検査結果schemaが未定義で、固定inspection ID、状態列挙、期待値・観測値・根拠、schema version、必須検査集合が不足しています。
- Major — manifest/stream/receipt間の終局整合性契約に、manifest必須schema、artifact digest/size、期待artifact集合、failure時許容artifact、publish完了判定規則が不足しています。
- Minor — stderr JSONにDETECTED時のcounterexampleIdentityとoutcome別必須field/errorCode taxonomyが不足しています。
