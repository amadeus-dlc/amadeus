# provenance 記録の生成と検証の機械化

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | provenance 記録を手書き Markdown から機械可読 JSON の生成と照合へ置き換える技術目標である。 |
| scope | infra | `provenance:generate` と `provenance:check` の dev-scripts 追加と CI 組み込みを整備する Intent である。 |
| labels | provenance, dev-scripts, ci, machine-readable-evidence, self-development, issue-296 | provenance、dev-scripts、ci、機械可読な証拠記録、自己開発、Issue #296 を表す。 |

## 目的

provenance 記録を手書き Markdown から機械可読 JSON の生成と照合へ置き換え、もっともらしく間違った値（md5、commit）が検証を pass する状態をなくす。

この Intent は [Issue #296](https://github.com/amadeus-dlc/amadeus/issues/296) と [Discovery 20260702-evidence-record-and-evaluation](../discoveries/20260702-evidence-record-and-evaluation.md) の recommended 候補（GD001）を根拠にする。

## 成功条件

- `provenance:generate` の出力だけで policies.md の最低記録項目を満たせる。
- `provenance:check` が、記録と実測のずれ（md5 不一致、commit 不一致、参照先欠落）を検出して CI を fail にできる。
- eval が実装前に失敗することを確認してから実装している（TDD 記録が PR にある）。
- `npm run test:all` が pass する。

## 範囲

含めるもの:

- `provenance:generate` と `provenance:check` の dev-scripts（Bun + TypeScript）の追加。
- eval の先行追加（dev-scripts ルールの TDD）。
- `provenance:check` の `npm run test:all` chain への組み込み。
- `.amadeus/steering/policies.md` の provenance 記録方法の生成スクリプト前提への更新。
- `.amadeus/development.md` の stage と workspace 対応記録の表の更新。

含めないもの:

- 証拠内容の意味評価（#240 evaluator の対象）。
- steering knowledge の契約変更（#297 の対象）。
- LLM による意味評価。
- `examples/skill-provenance.json` の置き換え（関係整理は未確定事項として Inception へ引き継ぐ）。

## 現在の phase

Ideation を開始する。

Inception では、provenance 記録の置き場所、JSON スキーマの項目構成、既存 Intent への遡及適用の要否と範囲、amadeus-validator との連携範囲、`examples/skill-provenance.json` との関係整理を具体化する。
