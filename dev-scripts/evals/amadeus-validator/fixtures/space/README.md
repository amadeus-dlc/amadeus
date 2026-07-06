# Space テンプレート

## 基本方針

このディレクトリは、Amadeus Space（`amadeus/spaces/<space>/`）の標準テンプレートである。

`amadeus/spaces/<space>/memory/templates/space/` がある場合は、プロジェクト固有の上書きを優先する。
存在しない場合は、この標準テンプレートを使う。

テンプレート内の `<...>` は、確認済みの値または `未確認` に置き換える。

## テンプレート一覧

| 成果物 | 役割 |
|---|---|
| `memory/org.md` | Amadeus DLC の組織既定を扱う。 |
| `memory/team.md` | チームの働き方を扱う。org.md を上書きする。 |
| `memory/project.md` | プロジェクト固有の目的、能力、技術、構造を扱う。 |
| `knowledge/glossary.md` | 確定済み用語と避ける語を扱う。 |
| `knowledge/actors.md` | 要求の根拠や相互作用に登場する人の役割を扱う。 |
| `knowledge/external-systems.md` | システム外部の連携先を扱う。 |
| `knowledge/background.md` | 背景、前提、未確認事項を扱う。 |
| `knowledge/domain-map.md` | 採用済みまたは廃止済みの Subdomain と Bounded Context を扱う。 |
| `knowledge/context-map.md` | 採用済みまたは廃止済みのコンテキスト間依存を扱う。 |
| `intents/intents.json` | Intent registry の初期値（空配列）を扱う。 |
| `intents/intents.md` | Intent 一覧と依存関係の索引を扱う。 |
