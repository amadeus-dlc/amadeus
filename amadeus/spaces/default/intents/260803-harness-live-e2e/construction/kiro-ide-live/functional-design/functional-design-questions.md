# Functional Design Questions — kiro-ide-live

参照入力: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

## 既決照合

Issue #1717、上流成果物、既存raw-CDP driver、ローカルKiro.app `0.12.333`のread-only bundle実測から、GUI transport、generated profile、machine auth、alternative closureの境界は確定している。矛盾・欠落はなく、追加質問は0件とする。

## Plan

`business-logic-model.md`、`business-rules.md`、`domain-entities.md`を生成する。library Unitのため`frontend-components.md`は生成しない。
