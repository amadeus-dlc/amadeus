# Code Summary：Construction stage skills 英語化

## 目的

RU003 として、代表 skill と同じ Construction phase の 6 skill の `SKILL.md` を英語化した。

## 変更したファイル

| ファイル | 変更内容 |
|---|---|
| `skills/amadeus-construction-nfr-requirements/SKILL.md` | 本文と frontmatter description を英語化した。 |
| `skills/amadeus-construction-nfr-design/SKILL.md` | 本文と frontmatter description を英語化した。 |
| `skills/amadeus-construction-infrastructure-design/SKILL.md` | 本文と frontmatter description を英語化した。 |
| `skills/amadeus-construction-code-generation/SKILL.md` | 本文と frontmatter description を英語化した。 |
| `skills/amadeus-construction-build-and-test/SKILL.md` | 本文と frontmatter description を英語化した。失敗時の halt-and-ask 挙動は一対一で保持した。 |
| `skills/amadeus-construction-ci-pipeline/SKILL.md` | 本文と frontmatter description を英語化した。 |
| `.agents/skills/amadeus-construction-*/SKILL.md` | `promote-skill.ts --replace` で昇格反映した。 |
| `examples/skill-provenance.json` | `skills/amadeus-construction-code-generation/SKILL.md` の entry に staleReason を追記した。md5 は書き換えていない。 |

残存する日本語は、各ファイルの `未確認` リテラル 1 行だけである。

## 対応した要求

| 要求 | 対応 |
|---|---|
| R005 | RU003 を実行し、#399 の完了境界（全面英語化）へ前進した。 |
| R006 | 翻訳のみで意味を変えず、templates と生成成果物の日本語維持対象を変更していない。 |

## 検証

Build and Test で実行する。

Code Generation ではテスト実行結果を記録しない。

## 未完了

- B007 の Build and Test（統合実行として記録）。
- PR #417 merge による完了確定。
