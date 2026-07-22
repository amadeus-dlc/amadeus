# Scalability Requirements — execution-evidence

## Closed capacity

`business-logic-model.md` のcell / suite evidence、`business-rules.md` のclosed key / payload、`requirements.md` の2 arms・5 measured + 1 warmup、`technology-stack.md` のsingle-process Bun実行に従う。D-COUNT=7なら96 cells、根拠ある縮約5なら72 cellsが1つの`revisionId + inputSetIdentity + scheduleId`における最大expected keysである。

## Scaling behavior

- revision内のkey index、bundle count、ledger entry countはstarted cell数に線形で、1 cellあたりbundle 1、runner entry 1、store entry 1を上限とする。別revisionは別namespaceでappend-only保持する。
- bundle payload role数はexactly 5で固定し、unknown roleやplugin payloadを増やさない。
- full matrix evidenceはcontent identitiesで参照し、raw bundle全量を単一aggregate JSONへ複製しない。
- same store rootのpublishはsingle writer、cell executionはsuite内serialとし、parallelismでtimeoutを回避しない。

## Growth policy

1 revisionあたり96 cells、2 arms、6 suites、5 payload rolesを超える要求は別contract decisionとする。旧revisionを保持した再実行は許し、store全体を97th cellで拒否しない。各revision開始前にworst-case budget（96または72 × 1 bundle上限）と1 GiB safety reserve以上のfree bytesを検証し、不足ならcellを1件もspawnせず`INSUFFICIENT_STORE_CAPACITY`を返す。自動削除 / sampling / silent truncationを行わない。horizontal store、database、object storage、distributed lockは現intentに追加しない。

## Verification

各revisionの72 / 96 expected keysでbundle / ledger entryのexact cardinalityと線形indexを検査し、同じrevisionの97th key、6th payload role、duplicate keyをrejectする。2 revision連続実行では旧raw evidence温存とnamespace分離を確認する。free-space境界はbudget + reserve -1 / exact / +1 byteを検査する。heap profileはraw bundle全量copy 0、identity index entryがactive revisionのstarted cell数以下、writer数1を合否とする。
