# NFR Requirements Questions — reference-plugin-and-guides

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。
>
> 対象: U11 `reference-plugin-and-guides`。BR-U11-01〜12、FR-6 items 21–22、Requirements NFR-1〜8をNFRへ機械導出する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T23:49:35Z`。

## 質問不要の根拠

- Performance/scalability: 必要最小の`plugins/test-pro/` source一件と単一lifecycle E2Eを既存U01/U09/U10 seamへ通すだけであり、新SLO、parallelism、fixture分割、第二implementationを決める余地はない。
- Security/integrity: 宣言成果物だけを生成・検出・除去し、success/failure後のtracked tree一時物0とunrelated host bytes不変を既存no-clobber/atomic/drop契約で検証する。
- Reliability: authoring source→6 harness projection→temp host compose→compile/sensor→doctor→record-owned drop→再compile/doctorを一つのE2Eで閉じ、6 package面と4 self-install面を混同しないことが既決である。
- Documentation: Amadeus path/namespace、supported/deferred面、no-clobber、failure不変、検証手順、6/4差が必須であり、具体slug、表示文言、fixture pathは公開contractにしない。
- Technology: Bun/TypeScript、既存package/compiler/sensor/doctor/test/docs stackを維持し、新runtime API/dependency、service、database、network、UIを追加しない。

新runtime API、fixture ownership、no-clobber/drop意味論、具体test-pro identifier、cleanup failure policyを選ぶ余地はない。成果物化中に新たなfixture ownership、cleanup、failure、compatibility判断が必要になった場合は確定前に停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-20T23:49:35Z`）。承認範囲はBR-U11-01〜12、FR-6 items 21–22、Requirements NFR-1〜8、`plugins/test-pro/` authoring正本、U01/U09/U10 seam、単一lifecycle E2E、6 package/4 self-install、guide必須面、具体slug/文言/pathの非契約化、Bun/TypeScriptと既存stackの機械導出に限定する。新fixture ownership、cleanup、failure、compatibility、runtime API、dependency、service、database、network、UI、保持期間、SLOは追加しない。
