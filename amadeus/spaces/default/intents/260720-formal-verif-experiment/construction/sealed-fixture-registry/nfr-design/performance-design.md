# Performance Design — sealed-fixture-registry

## 上流と budget

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。1 revision は候補最大7、proof run最大14、sealed fixture 7または5、promotion 1に閉じる。

## Bounded pipeline

`RegistryRevisionCoordinator` は候補を canonical 順に serial 実行する。Git command/scanner は30秒、baseline/injected proof command は120秒の absolute deadline を持ち、timeout後はterminate 5秒、kill 5秒で打ち切る。partial stream hash/length と exit/signal を保存し、timeoutやkill失敗では seal/promotion を開始しない。

`ManifestStreamPipeline` は各 entry を一度だけ読み、同じ chunk をSHA-256と3分類scannerへfan-outする。1 fixture は entries 64、patch 8 MiB、metadata/disclosure/synthetic 各1 MiB、total 16 MiBを上限とし、全payloadの二重heap copyを作らない。

## Capacity と計測

`RegistryCapacityReservation` は lock 下で worst-case 7×16 MiB + metadata 64 MiB + 1 GiB reserve を物理予約する。reservation identityで命名したbacking fileをunique staging内へ物理preallocateし、ACTIVE claim、revision/baseline/owner process-start identity、reserved bytes、backing hash/lengthを同じstaged successorへ束ねる。directory sync後のexclusive renameとparent syncを完了してから実行を許す。terminal close/abortはbacking release要求を含むsuccessorをappendし、release実行後のhash/length再読と`RELEASED` receiptがdurableになるまで容量を再利用しない。物理予約不能なら開始しない。

receipt は proof/scan/publish の raw duration と operation counts を保持する。合否は proof runs `<=2×candidateCount`、scan entries `==manifestEntries`、hash reads `<=payloadBytes`、promotion rows `==D-COUNT`、deadline超過success=0、未予約実行=0である。
