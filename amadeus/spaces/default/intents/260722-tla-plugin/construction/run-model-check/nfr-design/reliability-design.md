# Reliability Design — U3 run-model-check

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Terminal manifest

- schema `amadeus.model-check-manifest.v1`、runId、outcome、exitCode、startedAt、finishedAt、expectedArtifacts、artifactsを必須とする。
- terminal manifestはcommit recordであり、自身を`artifacts`やdigest対象へ含めない。各列挙artifactはrelative path、SHA-256、byte sizeを持つ。consumerはmanifestを最後に読み、全digest/sizeと共通runId一致後だけpublish完了と判定する。

## Failure

- NOT_DETECTEDはEnvReceipt/stdout/stderr/completion markerを必須、DETECTEDはEnvReceipt/stdout/stderr/counterexampleを必須とする。HARNESS_ERRORはEnvReceiptと生成済みstreamをallowed集合としてmanifestに明示し、未生成artifactをexpectedへ含めず、`partial: true`を要求する。
- DETECTEDはcounterexampleIdentity必須、NOT_DETECTEDはcompletion marker必須、HARNESS_ERRORは固定errorCode必須とする。tempを完成後にatomic renameする。
- 予約前のrealpath等の例外はterminal stderrのHARNESS_ERROR/exit 2へ閉じる。予約後のcache mkdir、toolchain factory、planner、TLC、publisher例外は単一failure/publish境界で捕捉し、可能な限りrun固有failure directoryへEnvReceiptとterminal manifestを最後に公開する。failure publish自体が不可能な場合だけpublishedDirectoryをnullとし、それでもprocess exitを1へ漏らさず2とする。
