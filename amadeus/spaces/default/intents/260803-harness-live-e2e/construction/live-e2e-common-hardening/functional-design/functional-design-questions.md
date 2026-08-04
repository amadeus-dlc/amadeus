# Functional Design Questions — live-e2e-common-hardening

参照入力: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

> **E-OC1 既決照合:** U02の所有範囲、failure corpus、U01 API不変条件、Red→Green証拠、境界外transport詳細は上流成果物で一意に確定している。Issue #1717で分かる事項は再質問しない。
>
> **回答モード:** Functional Design stage groupで選択済みの `Guide me` を継続する。

## 質問選定基準

上流成果物間の矛盾、またはU02成果物を一意に作れない欠落だけを質問対象とする。照合結果として該当事項はないため、追加質問は0件とする。

## Functional Design Plan

U02はfrontend/UIを含まない`library`であり、`frontend-components.md`は生成しない。

- `business-logic-model.md`: transport非依存fixture、violation injection、oracle、ledger crash/recovery、Red→Green証拠の処理順序。
- `business-rules.md`: production API不変、決定性、秘密非流出、fault独立性、期待redの証明、coverage不変条件。
- `domain-entities.md`: fake adapter/journey、fault plan、trace、oracle、leak corpus、ledger crash fixture、evidence bundleの型と関係。

上流成果物間に、成果物生成を妨げる未解決の矛盾・欠落はない。
