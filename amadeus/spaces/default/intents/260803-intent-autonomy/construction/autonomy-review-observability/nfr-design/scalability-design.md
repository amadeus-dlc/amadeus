# Scalability Design — autonomy-review-observability

## 入力とpartition

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。中央review serviceを追加せず、Intent audit partitionとreview extension chainを使う。

decision list / detail / review / statusはexplicit target Intent UUIDでpartitionする。completed reviewのsource human turnは別active source partitionに存在するが、target mutationはtarget review transactionだけで行う。

## Active / completed growth

active Intentは通常protected append、completed Intentはsealごとのextension chainへappendする。extension entryはprevious headとdense revisionへ束縛し、review数に比例してchainを成長させるがoriginal sealed historyを再hashしない。

source turn commitとtarget appendをcross-Intent distributed transactionにしない。source evidenceはtarget stateを変更しないため、target append失敗時に同じauthorizationでidempotent retryできる。terminal review後は再利用を拒否する。

## Cloneとpersistence

session / process / compaction / clone reloadはcanonical target revision、extension head、queue page、full terminal receiptsを再読する。同一review identityを畳み込み、同じprevious headへ異なるsuccessorがある場合は物理順で選ばず`CONFLICT`とする。

paginationはsnapshot revision / head / event-set digestへ束縛するため、clone mergeやreview appendがpage間に入った traversalを継続しない。旧cursorは明示的conflictとなり、新しいfirst pageから新snapshotを読む。これによりwriterをglobal lockで長時間止めず、successful traversalの一貫性を保つ。

## Harness growth

Claude Code、Codex、Cursor、OpenCode、Kimi Codeは同じCore list / detail / review / status / reload fixtureとcanonical byte vectorsを使う。native adapterは引数と表示だけを投影し、eligibility、seal validator、redaction、remediation分類を複製しない。

将来harnessはdescriptor registry row、adapter、同じfixture receiptの追加で閉じる。required cohortはregistry-derivedに移行可能なownerをM09に保ち、M05 / M07へharness分岐を追加しない。

## Verification

多数Intent、active / completed混在、長いextension chain、clone fork、4 persistence boundary、harness cohort追加をfixture化する。target partition isolation、same event setの同一queue / receipt / head、unknown / duplicate harnessのfail-closedを要求する。
