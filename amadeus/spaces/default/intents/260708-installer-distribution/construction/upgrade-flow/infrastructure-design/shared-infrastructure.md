# Shared Infrastructure — upgrade-flow

> ステージ: infrastructure-design (3.4) / 作成: 2026-07-08
> 出典: U2 shared-infrastructure.md、`../nfr-design/logical-components.md`(修正3箇所の目録 — 共有実装の消費形態)、`../functional-design/business-logic-model.md`(runUpgrade が消費する共有部品の一覧)

## 消費のみの宣言

U3 は共有面の提供者ではなく消費者(U1 のポート群、U2 のテストヘルパー・本番実装)。新規提供物はフィクスチャ後処理ヘルパー(manual-or-unknown/partial 導出)のみで、これは U3 のテストコードに閉じる。
