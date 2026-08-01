# Scalability Design — u5-advisories-channel

上流入力(consumes 全数): requirements, business-logic-model, business-rules, domain-entities

## 適用範囲の判定

CLI の1呼出し内処理であり水平スケール対象なし(nfr-design:c1)。

## 規模面の設計

- advisories 配列は plugin 数×発火コード数が上限(現状 1 plugin×2 コード=最大2要素/呼出 — domain-entities.md E1 の型は複数 plugin を見込むが、現実の規模は composition record の plugin 数に比例)。
- ラッチファイル数は (plugin, code) の組数上限 — 同オーダー。無制限成長しない(run 境界でライフサイクル終了 — business-logic-model.md L4)。
