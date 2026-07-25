# Deployment Architecture — harness-provenance

上流入力(consumes 全数): performance-design.md, security-design.md, scalability-design.md, reliability-design.md, logical-components.md, components.md, services.md, business-logic-model.md

## Architecture

components.mdとservices.mdが定めるlocal同期CLIを維持し、business-logic-model.mdの処理を既存Bun processへembedded配置する。logical-components.mdの責務は同一process内に閉じる。performance-design.md、security-design.md、scalability-design.md、reliability-design.mdの要件にcloud resourceは不要である。

## Deployment flow

```
packages/framework/core/tools
  -> scripts/package.ts
  -> 6 harness distribution trees
  -> promote-self
  -> project-local self-install trees
```

computeは利用者の既存Bun process、storageは既存repositoryとMarkdown state、networkはなし。dev/staging/prod環境は新設せず、正本→dist→self-installをpromotion tierとして扱う。

## Sizing and IaC

新規VM、container、serverless、VPC、DNS、database、IaCは0。resource sizing/region/data residencyは非該当。

rollbackは正本commitのrevert後にpackage/promoteを再実行し、drift checkで収束を確認する。既に生成されたHarness付きV7 stateからfieldを削除・移行しない。`Harness`は`STATE_V7_FIELDS`へ追加しないoptional scalarであり、本変更で編集しない既存validator/readerが未知の追加fieldを無視してstateを読めることをrollback compatibility testで固定する。

rollback gateでは、feature版で生成したHarness付きV7 fixtureを、変更対象外の既存`validateStateFields`/state read/`getField`以外の通常intent操作へ渡し、validationと読込が成功することを確認する。これが赤ならcode rollbackを安全とみなさず、state field削除ではなく互換修正を先に行う。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T22:58:30Z
- **Iteration:** 1
- **Scope decision:** none

新規cloud infrastructureを追加しない判断、local Bun processと既存Markdown storageへの配置、正本→dist→self-installのpromotion tier、外部monitoring・secret・shared infrastructureの非該当判断は上流設計と整合しています。必須セクションと全上流参照の構造検証も通過しました。ただし、CI/CDへの性能合否条件の写像と、永続化済みstateを含むrollback設計が不足しています。

### Findings

- [Major] cicd-pipeline.md:5-20 はperformance-design.mdのgateを写像すると宣言していますが、Unitの対象はparser/mapping/cache/public facadeだけで、性能合否に必要な「intent birthあたりdetectHarnessType() 1回」「existsSync最大5回」「追加network/subprocess/file I/O 0」が明示されていません。また、wall-clock比較を合否に使わないことと、既存timeoutを延長・緩和しない条件もpipeline gateへ引き継がれていません。このままではCIがgreenでもPERF構造上限を退行できます。各構造制約を具体的なunit/static/integration gateへ割り当て、wall-clockは診断のみ、既存timeout内完了を合否条件として明記してください。
- [Major] deployment-architecture.md:21-23 と cicd-pipeline.md:22-24 のrollbackは、正本commitのrevertとdist/self-install再生成しか扱っていません。本変更は既に生成されたMarkdown stateへHarness fieldを永続化するため、rollback後の旧coreがHarness付きV7 stateを読めるのか、既存stateを移行・削除する必要があるのかが未定義です。コード成果物だけ戻して永続stateが互換でなければintent操作のblast radiusが残ります。旧versionによるHarness付きstateの読込・validation互換をrollback gateで実証してfieldを保持するか、安全なstate rollback手順と非破壊条件を定義してください。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T23:00:04Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の2件のMajorは解消済みです。CI/CDにはdetectHarnessType()の1回呼出、固定5probe、追加network・subprocess・file I/O 0、non-env cache、call-time env bypassが具体的なgateとして割り当てられ、wall-clockは診断限定、既存timeout・retryの非緩和も明記されました。rollbackはHarness付きV7 stateを非破壊で保持し、変更対象外の既存reader・validatorによる互換検証を必須化し、赤の場合はrollbackを停止してreader互換修正を先行するfail-closed手順になっています。新規infraなし、promotion tier、Observability、secrets、logical handoffを含む全体整合も維持され、必須セクションと全上流参照の構造検証を通過しています。

### Findings

- None
