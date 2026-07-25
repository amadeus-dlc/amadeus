# Scalability Design: grant-authorization-domain

## Inputs and Capacity

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`に基づく。100 intent、100,000 event、intent当たり32 shard、10,000 grantをlocal filesystem scanで処理する。

## Partition and Enumeration

space registryをintent partitionの単一列挙元とし、各intent配下のaudit shardを既存parserで読む。iteration orderは結果へ使わず、candidate comparatorとreceipt cardinalityだけで決定する。registry外directory、symlink、別spaceはscan対象にしない。

## Concurrency

- route receipt append: workspace outer lock → route owner intent inner lock → unlocked audit append。
- grant-backed commit: workspace outer lock → receipt owner intent inner lock。
- revoke:対象owner intent lock。
- lock取得順はworkspace → ownerだけを許し、innerからouterを取得しない。

同一Route Id collision routeはouter lock内でappend前にfatal、事前duplicate fixtureのcommitはtyped fallbackとする。異なるRoute Idは共存し、latest/consumed inferenceを行わない。

commitはspace-wide receipt lookup passでownerを確定し、owner inner lock取得後にowner shardだけをrevalidation passとして再読する。総scan量は`E + E_owner`以下とし、space全体の2回目scanは行わない。

routeと同じowner intentへissue/revoke/通常audit writerが同時appendするbarrier fixtureを用意する。routeはworkspace→ownerの両lock取得後だけraw appendし、競合writerはowner lock解放まで待機する。最終auditは両eventをexactly once保持し、block破損・欠落を0とする。

## Growth Strategy

target超過まではderived index、cache、compactionを追加しない。将来indexを検討する場合もappend-only auditを正本とし、index欠落時にfail-openしない別intentとする。

## Capacity Verification

fixture generatorがintent/shard/event/grant dimensionを独立に増加させ、exact owner、candidate完全順序、permutation不変、lock終端を検証する。
