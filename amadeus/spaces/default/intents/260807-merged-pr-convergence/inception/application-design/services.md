# Services — 260807-merged-pr-convergence

上流入力(consumes 全数): `requirements`(FR の外部境界要件)、`architecture`(codekb — plugin/core/GitHub の境界)、`component-inventory`(codekb — 既存サービス面)。

## 外部サービス境界

| 境界 | 利用 | 本 intent での変化 |
|---|---|---|
| GitHub GraphQL(`gh api graphql` 経由) | PR メタデータ観測 | クエリフィールド追加のみ(state/mergedAt/mergeCommit — 公開メタデータ)。認証・レート面は既存 gh 委譲のまま(GhError 分類 :64-71 無変更) |
| ローカル FS(record) | report 書込 | landed report が同一パス様式(`reportPathFor`)で増える |
| audit shards | override の HUMAN_TURN 検証・emit | landed は HUMAN_TURN を読まない(RA Q2=A)。audit emit を伴う場合のみ既存順序(emit → write)を踏襲 |

## 常駐サービス

なし(単発 CLI — cid:nfr-design:c1 のとおり cache/scaling/circuit breaker は適用外。決定的 file 境界と fail-closed 契約で構成)。
