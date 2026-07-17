# Delivery Planning — 明確化質問(260717-standing-delegation-gran)

<!-- E-OC1 判定証跡(eoc1-evidence-in-questions-header):
判定: 全2問 選挙不要(既決導出)— 各問の根拠種別は下記1問1行。
申告: e4 → leader(agmsg 送信 2026-07-17T04:1xZ — agmsg 一次記録)
leader 承認: 2026-07-17T04:09:53Z(agmsg 一次記録 — agmsg-git-evidence-split に基づく出典明示)
回答の記入は leader 承認受領後にのみ行う。 -->

上流入力(consumes 全数): `../units-generation/unit-of-work.md`(単一 Unit standing-grant)、`../units-generation/unit-of-work-dependency.md`(edge block・bolt_dag 非 null 実測済み)、`../units-generation/unit-of-work-story-map.md`(FR トレース)、`../application-design/components.md`(C-1〜C-6)、`../requirements-analysis/requirements.md`(FR-1〜8)、`../practices-discovery/team-practices.md`(変更 0 件 — practices 制約なしの確認)

## PQ1: Bolt 構成は?

- A: 単一 Bolt = standing-grant(1:1、UG 単一 Unit の機械導出)
- B: 分割
- X: その他

[Answer]: A — 既決導出(leader 承認 2026-07-17T04:09:53Z)
根拠種別: 既決導出 — UG 裁定(単一 Unit)+bolt_dag 実測(standing-grant 単独)

## PQ2: walking skeleton は?

- A: なし(amadeus スコープ incremental+ユーザー標準指示(4)+org 既定の greenfield 列挙に非該当)
- B: あり
- X: その他

[Answer]: A — 既決導出(leader 承認 2026-07-17T04:09:53Z)
根拠種別: 既決導出 — org.md Walking Skeleton 節+標準指示の転記
