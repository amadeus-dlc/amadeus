# Business Logic Model — U3-mirror-config(260719-mirror-productization)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## 処理フロー(resolve)

```
resolve(projectDir, space?, intentDir?)
  → 各層のパスを導出(global/space/intent — space・intent はカーソル解決 explicit arg > pointer の既存慣行に従う)
  → 各面を parse(component-methods C3 契約名): 不在→absent / JSON.parse 失敗→invalid / 未知キー・型不整合→invalid(全列挙)/ 合法→parsed
  → invalid が1面でも → ResolveOutcome{invalid}(全 invalid 層の errors を層名付きで列挙)
  → parsed 面を global→space→intent の順で後勝ちマージ
  → 欠落キーは default(autoMirror: false)
```

## 実装順序(story-map U3 順序の詳細化)

1. パーサ(parse 純関数 — 文字列入力・fs 非依存。契約名は component-methods C3 の parse に一致)+unit テスト(合法/未知キー/型不整合/構文破損/空 JSON)
2. 3層解決(resolve — fs 読取は薄い注入シーム、判定は純関数)+unit テスト(8組合せ: 3層の有無×優先 — 各ケースで勝つべき層に true・他の提示層に false を割り当てる fixture 制約(domain-entities 参照)で assert、invalid 混在、全不在 default)
3. 落ちる実証(invalid 注入で loud を実測 — 実行時消費行へ)

## テスト設計

- unit 層: parse/merge の純関数(文字列・オブジェクト注入 — 実 FS 非使用)
- integration 層: 実 FS の 3面 fixture で resolve 直駆動(fs-tests-integration-first — 実 FS 検証は最初から integration 層へ)
- 落ちる実証は実行時消費行へ(inject-runtime-consumed-lines): invalid 分岐の実行行に注入し赤を実測

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:38:44Z
- **Iteration:** 2
- **Scope decision:** none

i2 NOT-READY(Major: fixture 盲点 / Minor: readParse 残存)— 両者とも機械的訂正クラスとして reviewer が conductor 直接是正を妥当と判定。E-LSSADS13 機械検証可能クラスとして conductor 是正+grep/センサー機械閉包を実測(readParse 0 / 制約行 each 1 hit / センサー 6/6 PASSED)

### Findings

- fixture 値選定制約(勝つべき層に true)を domain-entities/business-logic-model へ明文化(是正済み・機械確認済み)
- readParse→parse 全数統一(grep 0 確認)
