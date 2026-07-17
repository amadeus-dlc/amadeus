# Units Generation — 明確化質問とDecomposition Plan(Issue #1129)

上流入力(consumes全数): `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。

## 選挙不要判定(E-OC1 3段順序)

判定: 全5論点を選挙不要(0問)とする。2026-07-17T20:08Z頃にconductor e1かleaderへ申告し、leaderが2026-07-17T20:08:22Zに常任グラント `de2842f3` を根拠として承認した(agmsg出典)。回答の先取り記入はなく、本承認後にこの証跡を作成した。

| 論点 | 判定 | 既決の所在 |
|---|---|---|
| Unit boundary | 既決 | 単一自然Unit `U001-codekb-hygiene-verification-handoff`。既存CodeKB 2ファイルのref付き検証、version-controlled record、human handoff境界を扱う |
| Granularity | 既決 | complexity=S。source / API / AWS / UI変更と独立deploy / test境界がなく、分割は人工的 |
| Dependency topology | 既決 | 1 Unit、`depends_on=[]`、cycle 0、parallel opportunityなし |
| Integration contract | 既決 | API / event / shared mutable dataなし。git SHA、件数、CI、起票者以外の独立した2名のreview、sensor / gate証拠のみhandoff |
| Deployment model | 既決 | embedded / non-deploying record。main landingとIssue closeはhuman-owned external handoff |

user-stories stageはSKIPのため、story mapはFR-1〜FR-5とNFR-1〜NFR-4のcoverage mapとする。未決のArchitect / Delivery判断はない。

## 質問

なし(0問)。

## Decomposition Plan Approval

承認済み。Unit数=1、complexity=S、DAG=`U001-codekb-hygiene-verification-handoff -> []`、deployment=embedded / non-deploying。Constructionの各stageはこのUnitのverification / handoff specificationを扱う。

leader裁定の修正に従い、sequencing、critical path、exit conditionsはこの2.7で確定せず、Delivery Planning 2.8へdeferする。2.8では単一Unitのcritical pathとhuman-owned landing / Issue closeのexternal handoffを計画化する。

## §13選定

persist 0件。surface確定値は `memory_entries_total=4`、`candidates=[c1,c2,c3,c4]`、`open_questions=[]`。c1 / c2は当Intent planとcompiled scopeの適用、c3はIssue #1129固有の単一Unit境界、c4はstage定義済みのtopology(2.7)とeconomic sequencing(2.8)分離の機械適用である。新規の再利用可能学習・未解決論点がないため重複学習を作らない。leaderが2026-07-17T20:14:25Zに常任グラント `de2842f3` に基づき承認した(agmsg出典)。
