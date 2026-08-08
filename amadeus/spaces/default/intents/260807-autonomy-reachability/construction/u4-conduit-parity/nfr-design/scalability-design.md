# Scalability Design — u4-conduit-parity

上流入力(consumes 全数): business-logic-model.md(面集合の discover 構造)。nfr-requirements 系5成果物は SKIP により未生成(設計どおりの不在)。

## 規模特性

- 面集合は glob discover(count-free、BR-U4-4)— ハーネス追加時に検査対象が自動拡張し、テスト改修不要(スケールの吸収を設計自体が担う)
- 固定4面(help/README/docs 対訳/stage-protocol)はカタログ拡張と独立
- 常駐サービス機構は適用外(cid:nfr-design:c1)

## 将来条件

新ハーネスの SKILL.md/commands 面は glob パターン(`harness/*/skills/amadeus/SKILL.md` + `harness/*/commands/amadeus.md`)に自動包含。パターン外の新形態(第3の配置)が出た場合のみテスト改修が要る — その検出は空集合 fail-closed(BR-U4-5)ではなく人間の設計判断(パターン追加)に委ねる旨を明記。
