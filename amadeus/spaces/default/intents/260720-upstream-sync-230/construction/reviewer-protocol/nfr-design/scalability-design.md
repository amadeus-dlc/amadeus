# Scalability Design — reviewer-protocol

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。runtime trafficではなく、review scopeとprojectionのclosed setを決定的に拡張する。

## Closed capacity matrix

| Axis | Closed set | Design |
|---|---|---|
| package projection | 現行6 harness | authored sourceから既存generatorで全数導出 |
| self-install | 既存4面 | closed listを既存promote/checkで全数検査 |
| default declared scope | `stage_file`、current Unitの実在`produces`、present consumes。Q&Aは`directive.consumes`明示時だけ | `reviewerReadScope`でauthoritative setを決定的に構築 |
| spot-check expansion | `check-read`で4条件成立時の単一owner file | 当該invocationだけに1 path追加 |
| Review record | Verdict、Reviewer、Date、Iteration | `runtimeReviewIdentity`で4 fieldを一体生成 |

6 harness、4 self-install、単一file、4 fieldは承認済みclosed contractであり、需要予測値ではない。harnessやschemaを増やす場合は正本とscopeの再承認を必要とし、本Unitから動的発見しない。

## Deterministic projection

authored coreのreviewer persona、reviewing knowledge、stage protocolと、harness別orchestrator skillの契約を正本側で更新し、既存package generatorで6面へ投影する。同一source/manifestから同一bytesを得て、source/projection drift、欠落、重複を非0にする。generated treeやdistを第二正本にしない。

reviewer invocationはengineが渡したauthoritative declared path集合だけを使い、record rootや`construction/*/`を走査するrequestを受理しない。sibling Unitが増えてもdefault request数を増やさず、owner不明・複数時はscopeを拡大せずcontract findingへ閉じる。

## Capacity fixture

table-driven fixtureで6 harness、4 self-install、current Unit scope、単一file carve-out、4-field Reviewを全数検査する。directory、複数file、次iteration継承、sibling browse、transcript bypass/tamperがaccepted resultに0件であることをnegative fixtureで固定する。parallel worker、cache、queue、load balancer、autoscaling、AWS infrastructureは追加しない。

## トレーサビリティ

本設計は`scalability-requirements.md`のSCALE-U08-01〜04、`performance-requirements.md`の有界実行、`security-requirements.md`のscope固定、`reliability-requirements.md`のprojection drift、`tech-stack-decisions.md`の6/4配布境界、`business-logic-model.md`のProjection flowへ対応する。
