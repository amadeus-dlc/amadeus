# Performance Requirements — experiment-contract-provenance

## 上流境界

`business-logic-model.md` のstrict parse / canonical hash / ledger fold / single dispatch、`business-rules.md` のfixed constantsとno chained execution、`requirements.md` の120秒suite timeout、`technology-stack.md` のBun 1.3.13 / TypeScript ESMを前提とする。U1はTLC、TS oracle、filesystem store、CIの実行時間を所有しないため、新しいnetwork latency SLAは設けない。

## Bounded execution requirements

- parser / canonicalizerは入力byte数に線形、ledger foldはevent数に線形で、全組合せ探索や再帰的retryを行わない。
- 1 CLI invocationはexactly one commandをparseし、exactly one handlerを最大1回呼ぶ。成功後の自動chainは0件とする。
- fixed configはvoters=3、choices=3、warmup=1、measured=5、timeout=120秒、PBT runs=100を超えて拡張しない。
- coordinatorはdownstreamから受領した120秒deadline identityを変更せずhandlerへ渡し、自身のretryやsleepで延長しない。実消費時間の計測はU3/U7 runnerが所有する。
- canonical bytesとSHA-256は1 domain valueにつき各1回生成し、同一command内の重複serialize / hashを禁止する。

## Measurement and acceptance

provenance ledgerは成功経路の`T_START / T_FREEZE / SKELETON_REVEAL / SKELETON_PASS / S_START / S_FREEZE`の最大6 eventsに閉じる。1 parsed command / event payloadはUTF-8 1 MiB以下とし、超過をparse前に拒否する。

instrumented unit benchmarkはevent数`n={0,1,3,6}`、payload bytes`b={1 KiB,64 KiB,1 MiB}`を固定する。`foldTransitionCount == n`、handler call count `<=1`、payload byte scan count `<=2b`（parse 1回 + hash 1回）、schema node visits `<=2v+32`（`v`はparsed JSON node数）を要求する。object field数はclosed schema定数なのでkey sortのfield comparison countもfixtureごとのschema上限以内とする。wall-clock値はmachine差が大きいため採否SLAにせずraw valueとして保存する。

合否は上記全counter bound、handler call count 1以下、deadline identity変更0、unbounded retry / network call 0、canonical serialization / hash重複0であることとする。性能回帰を検出した場合もverdictを`DETECTED`へ変換せずtyped operational failureとして扱う。

## Resource constraints

contract moduleは最大6-event ledgerと1 MiB command payload以外のcacheを持たず、retained bytesは`canonical input bytes + event envelope bytes + 64 KiB`以下とする。process-global mutable state、worker pool、daemon、database connectionを作らない。artifact / evidence bytesはport越しのidentity参照とし、U1がraw stdout / stderrやfixture payloadを複製保持しない。heap fixtureでcommand完了後のreachable buffer identityを数え、入力 / envelope以外の保持0件を検査する。
