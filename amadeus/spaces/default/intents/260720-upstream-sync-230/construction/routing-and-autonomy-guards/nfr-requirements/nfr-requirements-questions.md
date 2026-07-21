# NFR Requirements Questions — routing-and-autonomy-guards

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。
>
> 対象: U04 `routing-and-autonomy-guards`。E-USSU04FD1=A、E-USSU04FD2=Aを含む既決help routing、compose marker、doctor、recompose guardをNFRへ機械導出する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T15:29:42Z`。

## 質問不要の根拠

- Performance/scalability: pure classifier、fake clock/stat/unlink、単一workspace marker、既存CLI process内の有界判定であり、新service SLOやdynamic scale判断はない。
- Security: reserved namespace、safe switch error、autonomous recomposeのmutation前reject、PATH/record creationの不正入力をfail-closedにする。
- Reliability: 24時間TTL、境界ちょうどfresh、1ms超過stale、future mtime age 0、non-autonomous stale janitor、autonomous marker未読/janitor N/A、doctor read-onlyが裁定済みである。
- Observability: Stop hook diagnosticとdoctor advisory/FAILの既存面を使い、新event・保持期間を追加しない。
- Technology: Bun/TypeScript、既存lock/filesystem/audit/generator/test stackを維持し、新dependency/network/database/UIを追加しない。

新しいTTL、janitor policy、autonomy priority、failure classification、public APIを選ぶ余地はない。新たな閾値・scope差が必要なら停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-20T15:29:42Z`）。承認範囲はE-USSU04FD1=A、E-USSU04FD2=A、BR-U04-01〜25、Requirements NFR-1〜8、technology-stackの機械導出に限定する。help routing/namespace guard、単一marker pathと24時間TTL、non-autonomous stale janitor、autonomous marker未読・janitor N/A・保持、doctor read-only、autonomous recompose mutation前rejectとbytes不変、Bun/TypeScript/既存stackを維持する。新TTL、janitor/autonomy priority、failure policy、public API、dependency、network、database、UI、保持期間、SLOは追加しない。新たな境界時刻・unlink失敗・autonomy優先判断が必要なら停止し再付議する。
