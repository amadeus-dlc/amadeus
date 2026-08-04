# Delivery Planning Questions — ハーネス横断 live E2E

参照入力: `requirements`、`components`、`component-methods`、`services`、`component-dependency`、`decisions`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`、`team-practices`。

> **E-OC1 既決照合:** Q1のvertical walking-skeleton Unit化とQ2のPhase証跡バリア追加は、各decision後の回答確認でユーザーが明示承認済みである。Issue #1717と承認済みUnits Generationから確定できる事項は再質問していない。
>
> **leader 承認:** 2026-08-03T13:20:53Z

## 質問選定基準

Issue #1717、承認済みRequirements/Application Design/Units Generationで確定済みのPhase順序、transport範囲、依存DAG、完了条件、外部依存、並行可能性は再質問しない。質問対象は、上位practiceと承認済みUnit分割を同時に満たせない実矛盾だけに限定する。

## Q1. 最初のwalking-skeleton Boltと「1 Unit / 1 PR」規律の矛盾をどう解消しますか？

`project.md`はself-featureの最初のConstruction Boltをwalking skeletonにすることを`ALWAYS`要求し、`team.md`は最大リスクをend-to-endで通す最小Boltを最初に置くよう要求しています。現在の承認済みDAGでは、そのend-to-end経路がU01 `live-contract-policy-registry` → U02 `live-lifecycle-evidence` → U03 `codex-exec-live`の3 Unitに分かれています。一方、`team.md`は複数Unitを単一PRへ束ねることを禁止しています。

A. Units Generationを再開し、最小の共通contract/lifecycleとCodex adapter/journeyを1つのvertical walking-skeleton Unitへ再分割する。残る共通hardeningと他transportを後続Unitにする（推奨）
B. U01+U02+U03を最初の1 Bolt / 1 PRへ束ねる例外を今回だけ明示承認し、承認済みUnit分割は維持する
C. U01、U02、U03を別々のBolt/PRで順次実装し、U03完了時をwalking-skeleton gateとみなす
D. U01だけをwalking skeletonとみなし、end-to-end transport検証は後続Boltへ送る
E. walking-skeleton要件を今回だけ免除し、通常の1 Unit / 1 Boltで進める
X. Other (please specify)

[Answer]: A — Units Generationを再開し、最小の共通contract/lifecycleとCodex adapter/journeyを1つのvertical walking-skeleton Unitへ再分割する。残る共通hardeningと他transportは後続Unitとする。（ユーザー回答: `1`）

## 回答確認

A. 上記の回答内容で確定する
B. 回答内容を修正する
X. Other (please specify)

[Answer]: A — 上記の回答内容で確定する。（ユーザー回答: `1`）

## Artifact Re-use — Phase証跡バリア再承認後

A. 既存の質問・回答を維持し、承認済み6 batch DAGへ参照を更新してDelivery Planningを続行する
B. 既存成果物を破棄し、ゼロから再作成する
C. 既存成果物を変更せず維持する
X. Other (please specify)

[Answer]: A — 既存の質問・回答を維持し、承認済み6 batch DAGへ参照を更新して続行する。（ユーザー回答: `1`）

## §13 Learnings — 追加確認

`amadeus-learnings.ts surface --slug delivery-planning`の結果は、候補0件・parked open question 0件である。

A. 追加なし
B. 次回へ残す観察を追加する
X. Other (please specify)

[Answer]: A — 追加なし。（ユーザー回答: `1`）

## Artifact Re-use — Units Generation再承認後

A. 既存質問と回答を維持し、11 Unit DAGへ参照を更新してDelivery Planningを続行する
B. 既存質問成果物を破棄し、ゼロから再作成する
C. 既存質問成果物を変更せず維持する
X. Other (please specify)

[Answer]: A — 既存質問と回答を維持し、11 Unit DAGへ参照を更新してDelivery Planningを続行する。（ユーザー回答: `１`）

## Q2. IssueのPhase 1→2→3順序をmachine-readable batchへどう反映しますか？

現行DAGをengineがtopological batchへコンパイルすると、U02後のU03（Phase 1）、U06〜U09（Phase 2）、U10/U11（Phase 3）が同一batchに入る。Delivery Planningの文章上の順序はruntimeへ入力されないため、このままではIssue #1717の段階展開を実行時に保証できない。

A. Units Generationを再開し、Phase 2 UnitsへU04/U05のPhase 1 closure evidence依存、Phase 3 UnitsへU06〜U09のPhase 2 closure evidence依存を追加する（推奨）
B. 現行のtechnical DAGを維持し、Phase 1〜3が実行時に混在することを許容する
C. Delivery Planningのeconomic batchを機械可読化するengine改修を、このIntentへ追加する
X. Other (please specify)

[Answer]: A — Units Generationを再開し、Phase 2 UnitsへPhase 1完了証跡依存、Phase 3 UnitsへPhase 2完了証跡依存を追加する。（ユーザー回答: `1`）

## Q2 回答確認

次の変更内容で確定する。

- U06〜U09は、U04/U05がcleanup barrierとledger commitを経て`closure-committed`となるか、受入条件付きIssueで閉じたPhase 1完了証跡へ依存する。
- U10/U11は、U06〜U09が同じ終端契約で閉じたPhase 2完了証跡へ依存する。
- 想定batchは `U01` → `U02` → `U03` → `U04/U05` → `U06〜U09` → `U10/U11` とする。
- 依存は架空のコード依存ではなく、Issue #1717が要求する段階展開の検証証跡依存として定義する。

A. 上記の回答内容で確定する
B. 回答内容を修正する
X. Other (please specify)

[Answer]: A — 上記の回答内容で確定する。（ユーザー回答: `1`）
