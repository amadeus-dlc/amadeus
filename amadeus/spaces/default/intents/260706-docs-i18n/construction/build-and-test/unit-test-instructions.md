# Unit Test Instructions

Unit: docs-i18n（Test Strategy: Minimal）

## 検証対象と手順

本 Intent の「単体検証」に相当するのは、対訳対の構造・内容一致と参照解決の機械検査である（[code-summary.md](../docs-i18n/code-generation/code-summary.md) の検証結果）。

| 対象 | 手順 | 期待結果 |
|---|---|---|
| 英語正本の日本語残存 | `grep -P '[ぁ-んァ-ヶ一-龠]'` を 8 英語版へ | 0 件 |
| 対訳対の構成一致 | 各対の H2 数を比較 | 8 対すべて一致 |
| ja 版の移設忠実性 | 旧本文と `.ja.md` の diff | 意図した `.ja.md` リンク差し替え + 承認済み外科修正のみ |
| リンク解決 | scratchpad の一時スクリプトで対象 16 + 参照元 4 ファイルを検査（コミットしない） | broken 0 件 |
| record 構造 | `bun .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-docs-i18n` | pass |

## 結果

全件 pass。詳細は [build-test-results.md](build-test-results.md) を参照する。
