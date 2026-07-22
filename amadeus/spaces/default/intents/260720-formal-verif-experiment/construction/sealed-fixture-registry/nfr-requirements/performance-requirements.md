# Performance Requirements — sealed-fixture-registry

## 上流境界

`business-logic-model.md` のproof / scan / seal / reveal / promotion、`business-rules.md` のD-COUNT 7/5とmanifest bijection、`requirements.md` のFR-1〜FR-3、`technology-stack.md` のBun / TypeScript / Gitを前提とする。arm executionと120秒suite timerは所有しない。

## Bounded workload

- 1 universe revisionはcandidate rows最大7、falling proofs最大7、sealed fixtures 7または5、promotion 1に閉じる。
- proofは1 candidateにつきbaseline 1 run + injected 1 runをserialに実行し、non-target testsを同じreceiptへ含める。同じcandidateのblind retryを禁止する。
- Git commandは1 invocation 30秒、scannerは1 fixture 30秒、baseline / injected proof commandは各120秒をdeadlineとする。超過時はterminate要求後5秒、未終了ならkill後5秒まで待ち、exit / signal / partial stream identityを保存してtyped timeoutにする。
- scan entry数は`SealedPayloadManifest` entry数とexact equalityを要求する。1 fixtureはlogical entries最大64、patch最大8 MiB、metadata / disclosure / synthetic各1 MiB、sealed payload合計16 MiBを上限とする。
- hash / scanは各entry bytesを1回stream readし、hashと分類scannerへ同じchunkを渡す。全payloadの二重heap copyを作らない。

## Latency and resource acceptance

wall-clock SLAはGit / test runner / disk差のため採否に使わず、proof command / scan / publishのraw durationを保存する。operation countはcandidate / manifest entry / bytesに線形とし、proof run count `<=2×candidateCount`、scan entry count `==manifestEntryCount`、hash byte reads `<=payloadBytes`、promotion validation rows `==D-COUNT`を要求する。

上限超過、named deadline超過、terminate / kill失敗、Git command failureはseal / promotionを開始せずtyped failureにする。partial patchやscan prefixをzero findingとして採用しない。timeout fixturesはdeadline-1 / exact / +1、terminate応答 / kill必要 / kill失敗を含む。

## Storage budget

universe開始前にworst-case `7 × 16 MiB` + proof / transaction metadata 64 MiB + safety reserve 1 GiBのfree spaceをRegistry lock下でreservationする。revision完了 / 明示failureでreservationを解放し、sealed immutable records自体は削除しない。
