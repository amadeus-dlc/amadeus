# Code Summary：Inception stage skills 英語化

## 目的

RU004 として、Inception phase の 8 skill の `SKILL.md` を英語化し、Construction の入力成果物を作る phase の語彙をそろえた。

## 変更したファイル

| ファイル | 変更内容 |
|---|---|
| `skills/amadeus-inception-reverse-engineering/SKILL.md` | 本文と frontmatter description を英語化した。 |
| `skills/amadeus-inception-practices-discovery/SKILL.md` | 本文と frontmatter description を英語化した。 |
| `skills/amadeus-inception-requirements-analysis/SKILL.md` | 本文と frontmatter description を英語化した。 |
| `skills/amadeus-inception-user-stories/SKILL.md` | 本文と frontmatter description を英語化した。 |
| `skills/amadeus-inception-refined-mockups/SKILL.md` | 本文と frontmatter description を英語化した。 |
| `skills/amadeus-inception-application-design/SKILL.md` | 本文と frontmatter description を英語化した。 |
| `skills/amadeus-inception-units-generation/SKILL.md` | 本文と frontmatter description を英語化した。トポロジ境界の契約文を契約 needle と同一の英文で保持した。 |
| `skills/amadeus-inception-delivery-planning/SKILL.md` | 本文と frontmatter description を英語化した。walking skeleton 優先の順序付け規則を一対一で保持した。 |
| `.agents/skills/amadeus-inception-*/SKILL.md` | `promote-skill.ts --replace` で昇格反映した。 |
| `dev-scripts/evals/amadeus-templates/check.ts` | `amadeus-inception-units-generation` の textContract needle を英語本文と整合させた（RED を確認してから更新した）。 |
| `examples/skill-provenance.json` | Inception 8 skill の全 snapshot entry に staleReason を追記した。md5 は書き換えていない。 |

残存する日本語は、`未確認` と `該当なし` の成果物向けリテラルだけである。

## 対応した要求

| 要求 | 対応 |
|---|---|
| R005 | RU004 を実行し、#399 の完了境界（全面英語化）へ前進した。 |
| R006 | 翻訳のみで意味を変えず、templates と生成成果物の日本語維持対象を変更していない。 |

## 検証

Build and Test で実行する。

Code Generation ではテスト実行結果を記録しない。

## 未完了

- B008 の Build and Test（統合実行として記録）。
- PR #417 merge による完了確定。
