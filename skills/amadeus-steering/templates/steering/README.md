# Steering Layer テンプレート

## 基本方針

このディレクトリは、Amadeus steering layer の標準テンプレートである。

`.amadeus/settings/templates/steering/` がある場合は、プロジェクト固有の上書きを優先する。
存在しない場合は、この標準テンプレートを使う。

テンプレート内の `<...>` は、確認済みの値または `未確認` に置き換える。

## テンプレート一覧

| 成果物 | 役割 |
|---|---|
| `steering.md` | steering layer の責務境界を扱う。 |
| `steering/objective.md` | システム化の目的を扱う。 |
| `steering/product.md` | プロダクトの能力、利用場面、価値仮説を扱う。 |
| `steering/tech.md` | 技術判断、開発標準、実行環境を扱う。 |
| `steering/structure.md` | ディレクトリ編成、命名、依存関係、コード構成の原則を扱う。 |
| `steering/actors.md` | 要求の根拠や相互作用に登場する人の役割を扱う。 |
| `steering/external-systems.md` | システム外部の連携先を扱う。 |
| `glossary.md` | 確定済み用語と避ける語を扱う。 |
| `steering/knowledge.md` | 背景、前提、未確認事項を扱う。 |
| `steering/knowledge/` | 詳細な知識記録を扱う。 |
| `steering/policies.md` | 方針、禁止事項、判断基準を扱う。 |
| `steering/policies/` | 詳細な方針記録を扱う。 |
| `domain-map.md` | 採用済みまたは廃止済みの Subdomain と Bounded Context を扱う。 |
| `context-map.md` | 採用済みまたは廃止済みのコンテキスト間依存を扱う。 |
| `intents.md` | Intent 一覧と依存関係を扱う。 |
