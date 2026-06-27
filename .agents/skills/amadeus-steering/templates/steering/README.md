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
| `objective.md` | システム化の目的を扱う。 |
| `actors.md` | 要求の根拠や相互作用に登場する人の役割を扱う。 |
| `external-systems.md` | システム外部の連携先を扱う。 |
| `glossary.md` | 確定済み用語と避ける語を扱う。 |
| `knowledge.md` | 背景、前提、未確認事項を扱う。 |
| `policies.md` | 方針、禁止事項、判断基準を扱う。 |
| `domain/subdomains.md` | サブドメインを扱う。 |
| `domain/bounded-contexts.md` | 境界づけられたコンテキストを扱う。 |
| `discoveries.md` | Discovery 一覧と判定記録への入口を扱う。 |
| `intents.md` | Intent 一覧と依存関係を扱う。 |
