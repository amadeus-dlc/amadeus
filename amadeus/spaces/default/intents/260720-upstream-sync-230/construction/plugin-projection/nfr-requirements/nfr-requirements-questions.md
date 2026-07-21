# NFR Requirements Questions — plugin-projection

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。
>
> 対象: U09 `plugin-projection`。E-OC1承認/再裁定、BR-U09-01〜21、C5 projection/drift契約をNFRへ機械導出する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T23:32:51Z`。

## 質問不要の根拠

- Performance/scalability: build-time batchでplugin/artifact/harness/driftをcanonical sortし、既存6 harnessを同一source snapshotから生成する。新service SLOやdynamic scalingはない。
- Security/supply chain: `plugins/<name>/`だけをsourceとし、C1全件validation後にbuildする。unsafe path、duplicate identity、collisionはwrite前rejectし、network fetch/credential/runtime dependencyを追加しない。
- Reliability: temp root全生成後のgenerator ownership内commit、部分harness update禁止、check mode write 0、plugin 0件の既存6 harness/CLI bytes不変が既決である。
- Compatibility/capacity: packageは6面、self-installはclosed 4面。`buildSelfInstallProjection`は内部helperで、public seamは正準4関数だけである。
- Observability: `MISSING | DIFFERS | ORPHAN | UNREFERENCED`をcanonical sortした既存check出力へ投影し、新eventや保持期間を追加しない。

新しいpublic seam、validation type、self-install対象、commit/atomicity、drift分類、failure policyを選ぶ余地はない。新たなownership/error/partial-write判断が必要なら停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-20T23:32:51Z`）。承認範囲はBR-U09-01〜21、C5、Requirements NFR-1〜8、E-OC1再裁定A、technology-stackの機械導出に限定する。正準4 public seam、内部self-install helper、6 package/4 self-install、validation-before-build、canonical projection/drift、zero-plugin bytes不変、既存Bun/TypeScript/packaging stackを維持する。新ownership、error、partial-write、atomicity、public API、validation type、self-install対象、drift分類、dependency、network、credential、database、service、UI、保持期間、SLOは追加しない。
