# Unit Test Instructions

Unit: readme-refresh（Test Strategy: Minimal）

## 検証対象と手順

本 Intent の「単体検証」に相当するのは、README 2 ファイルの記載が実体と一致することの機械検査である（[code-summary.md](../readme-refresh/code-generation/code-summary.md) の検証方法）。

| 対象 | 手順 | 期待結果 |
|---|---|---|
| 退役語の残存 | `grep -n "examples/\|validate:all\|amadeus-steering\|amadeus-event-storming\|amadeus-domain-grilling\|amadeus-ideation-\|intents/intents\.md\|skill-forge\|22 stages\|22 ステージ\|mock-based" README.md README.ja.md` | 0 件（exit 1） |
| リンク解決 | scratchpad の一時スクリプトで相対パス・アンカーの解決可能性を検査（コミットしない） | broken 0 件 |
| record 構造 | `bun .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-readme-refresh` | pass |

## 結果

全件 pass。詳細は [build-test-results.md](build-test-results.md) を参照する。
