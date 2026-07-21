# Reliability Design — execution-evidence

## 上流と failure model

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、cell evidence の exactly-once logical publish と crash recovery を設計する。availability SLA は扱わない。

## EvidenceTransaction

`EvidenceTransaction` は transaction identity、5 payload、index envelope、runner/store ledger entries、expected heads を同一 filesystem staging directory に作る。各 file flush と staging directory sync、全 hash 再検証後、`StoreWriterLock` を取得して expected heads を再確認する。lock は complete owner record（random nonce、host identity、pid、process-start identity、acquired monotonic/UTC、operation identity）を unique staging directory へ write / file flush / directory sync してから、staging directory 全体を nonexistent lock name へ exclusive atomic renameし、parent directory sync後に取得済みとする。したがってownerless visible lockを作らない。owner process の終了を同じ host/pid/process-start identity で否定できた場合だけ、stale lock directory を nonce 付き quarantine name へ exclusive rename して再取得できる。liveness を証明できない remote/unknown owner は奪取せず deadline failure とする。head が一致し、nonexistent successor slot である場合だけ transaction directory 全体を exclusive atomic rename する。

rename を logical visibility point とし、store parent directory sync 完了後だけ `DurablePublishReceipt` を返す。lock release は owner nonce 一致を再確認して directory を quarantine rename し、parent sync 後に除去する。rename 前の crash は旧 chain のみ、rename 後・ack 前の crash は transaction lookup と全 hash/chain 検証により同一 receipt へ収束する。head conflict、既存 identity の bytes 不一致、sync failure、lock owner 不明は成功へ丸めない。

## Recovery と failure separation

`StoreRecovery.scan()` は complete successor transaction だけを候補にし、staging orphan、partial file、unknown role、片 ledger を chain に接続しない。同一 successor への exclusive create と single writer により branch を禁止する。既存 transaction の idempotent retry は全 bytes 一致時だけ許す。

timeout、spawn、exit、decode は cell execution finding、store I/O、head conflict、lock、corruption は evidence failure として別 discriminator を持つ。`HARNESS_ERROR` cell は正式 bundle にできるが、missing key や store failure を `HARNESS_ERROR` に変換しない。

## Crash verification

payload write、file flush、staging sync、transaction rename、parent sync、ack、lock owner staging write / sync / rename、lock保持中、lock release rename の各境界へ crash injection を置く。owner staging orphanはlockとして扱わず、visible lockは常にcomplete ownerを持つこと、live owner/同pid別start/unknown host の lock を奪取しないこと、dead owner のみ安全に quarantine して再開できることを検証する。合否はownerless visible lock=0、永久 lock=0、二重 writer=0、valid old/new chain のいずれか1つ、ack 前消失は lookup で収束、ack 済み消失=0、partial 採用=0、branch=0、同一 transaction の異 receipt=0である。各 receipt から invocation、process、manifest、両 ledger、transaction を双方向に追跡できることも検証する。
