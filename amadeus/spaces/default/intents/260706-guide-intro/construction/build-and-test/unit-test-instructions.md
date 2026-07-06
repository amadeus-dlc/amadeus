# Unit Test Instructions

Unit: guide-intro（Test Strategy: Minimal）

## 検証対象と手順

本 Intent の「単体検証」に相当するのは、ガイドの実測駆動・対訳・参照解決の機械検査である（[code-summary.md](../guide-intro/code-generation/code-summary.md) の検証結果）。

| 対象 | 手順 | 期待結果 |
|---|---|---|
| 掲載出力の実測一致（NFR-1） | 全 code block を実測ログと byte 照合（省略「…」と <workspace> 置換のみ許容） | 全一致 |
| 丸コピー禁止（NFR-2） | stage reviewer が上流 3 章と文単位突き合わせ | 逐語一致 0 件 |
| 英語正本の日本語残存 / H2 対一致 | grep / 見出し数比較 | 0 件 / 4 対一致 |
| リンク解決（NFR-5、アンカー込み） | scratchpad の一時スクリプト（コミットしない） | broken 0 件 |
| record 構造 | `bun .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-guide-intro` | pass |

## 結果

全件 pass。詳細は [build-test-results.md](build-test-results.md) を参照する。
