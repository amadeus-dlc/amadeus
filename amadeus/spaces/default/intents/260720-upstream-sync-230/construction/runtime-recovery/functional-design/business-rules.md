# Business Rules — runtime-recovery

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Bolt DAG invariants

| ID | ルール | 失敗時 |
|---|---|---|
| BR-U02-01 | Unit DAGの正本は`unit-of-work-dependency.md`であり、runtime graphはcacheである。 | 正本を優先 |
| BR-U02-02 | cache非空・well-formedかつcanonical batchesと一致する場合だけcache hitとする。 | canonicalへ回復 |
| BR-U02-03 | cache欠落、空、malformed、Unit欠落/余剰、batch不一致はstaleとする。 | `healed: true` |
| BR-U02-04 | dependency artifactなしだけをgenuine zero-unitとしてsingle-iterationへdegradeする。 | 既存互換経路 |
| BR-U02-05 | artifact実在時のread/parse/graph validation失敗をUnit 0へ変換しない。 | loud error |
| BR-U02-06 | read-side recoveryはruntime graph、state、auditを書き換えない。 | mutation 0 |
| BR-U02-07 | per-unit loop、coverage guard、swarm selectionは同一resolution resultを使う。 | divergent fallback禁止 |
| BR-U02-08 | healed diagnosticは原因、batch数、runtime compile修復導線を示す。 | silent heal禁止 |
| BR-U02-09 | 同一inputの再評価は同じcanonical batchesを返す。 | nondeterminism拒否 |

## Gate revision evidence invariants

| ID | ルール | 失敗時 |
|---|---|---|
| BR-U02-10 | cross-shardでTimestampが衝突したevidence setはchronology不明としてfail-closedにする。衝突がない場合だけTimestamp順、同一shard・同一Timestampはshard-local buffer position順で全関連eventをinterleaveし、filenameやshard indexをtie-breakにしない。 | 推測順序によるbackfill禁止 |
| BR-U02-11 | anchorは最後のorganic gate-open、またはより新しい/唯一のstage-start。Recovered gate-openは除外する。 | false negative防止 |
| BR-U02-12 | anchor後のrecorded rejectが1件でもあればbackfillしない。 | 二重reject禁止 |
| BR-U02-13 | 最初のpost-anchor HUMAN_TURN後のdeclared produces writeだけをrevision証拠にする。 | reviewer append誤認禁止 |
| BR-U02-14 | stage-start fallbackはhuman turn前のdeclared produces writeも必須とする。 | coaching誤認禁止 |
| BR-U02-15 | non-produces、他stage/Unit、memory、questions、codekb特殊layoutを証拠にしない。 | false positive禁止 |
| BR-U02-16 | ledger/anchor/human/write証拠不足時はfalseを返す。 | 推測backfill禁止 |

## Approve recovery invariants

| ID | ルール | 失敗時 |
|---|---|---|
| BR-U02-17 | backstopはapprove transaction内、通常approval audit/state write前に実行する。 | ordering違反 |
| BR-U02-18 | autonomous Constructionと明示off-switchではbackstopを実行しない。 | human不在で補完禁止 |
| BR-U02-19 | 条件成立時はRevision Countをちょうど1増やす。 | count drift拒否 |
| BR-U02-20 | recovered 3 blockを全てRecovered=trueとし、通常approval 2 blockと合わせた順序固定の5 blockをappend前に全数生成・検証する。 | provenance/完全性不足 |
| BR-U02-21 | recovered rows後も人間が既に与えたapprovalをhonorし、通常approveを続行する。 | retroactive refusal禁止 |
| BR-U02-22 | 中間`[R]`/`[?]`をdiskへ書かず、最終`[x]`だけを一度writeする。 | partial state禁止 |
| BR-U02-23 | 検証済み5 blockを既存audit lock内の単一atomic commitで適用し、生成・検証・commit失敗時はaudit/stateを呼出前bytesに保つ。1行emitの5回呼出やpartial write可能なappend 1回は禁止する。 | audit transaction拒否 |
| BR-U02-24 | batch成功後のstate write失敗をtransaction identityと完全batchで検出し、再実行はauditを重複せず同じ最終stateへ収束する。 | idempotency違反 |

## Decision tables

### DAG resolution

| Cache | Canonical artifact | Result |
|---|---|---|
| valid/equal | valid | ok, healed=false |
| missing/empty/malformed/different | valid | ok, canonical batches, healed=true |
| any | absent | none, single-iteration degrade |
| unusable | unreadable/malformed/cyclic | malformed, loud error |

### Revision backstop

| Evidence | Backfill |
|---|---|
| organic gate→human→produces update、rejectなし | yes |
| stage-start→initial produces→human→produces update、rejectなし | yes |
| reviewer append→human、以後revisionなし | no |
| recorded rejectあり | no |
| human前にproducesなしのstage-start fallback | no |
| non-produces updateのみ | no |
| autonomous / off-switch | no |
| anchorなし / incomplete ledger | no |

## Verification rules

- DAG recoveryはpure parserの既存fixtureを再利用し、consumerごとにUnit集合の同一性をassertする。
- gate backstopはaudit blockの件数だけでなく、chronological order、transaction identity、Recovered field、Revision Count、最終checkbox、state byte差を検査する。
- multi-shard fixtureはlexical filename順とtimestamp順を意図的に反転し、timestamp sortのload-bearing性を固定する。cross-shard同一Timestamp fixtureはfilename順を両方向に入れ替えてもbackfillしないことを固定する。
- 5 blockの各生成・検証境界とatomic commit失敗ではaudit/stateとも呼出前bytesとの差分0を検査する。
- batch成功後のstate write failure injectionでは、second runが完全batchを再利用してaudit追加0のまま最終stateへ収束することを検査する。
- second runはheal result決定性と、成功済みbackfillのno-opも検査する。
- runtime dependency、network、database、UIを追加せず、既存Bun/TypeScript/audit lockだけを使う。
