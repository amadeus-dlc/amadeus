# Unit Test Instructions

Unit: agmsg-trial-docs（Test Strategy: Minimal — 要件 1 件につき検証 1 件以上）

## 要件と検証の対応

| 要件 | 検証 | 方法 |
|---|---|---|
| FR-1（定型文の 3 点セット） | 成果物節 2 の構成確認と実例の逐語一致（BR-2） | reviewer が received-messages.md と diff でバイト単位一致を確認済み。人間の gate 承認（15:16:03Z） |
| FR-2（実機確認の事実と制約） | 成果物節 3 の表が証跡列を持ち、未確認値が `未確認` と記載されること（BR-7） | reviewer が audit イベントと時刻突き合わせで確認済み |
| FR-3（適用条件の冒頭配置と引き継ぎ） | 成果物節 1 の位置と引き継ぎ 2 件（BR-10）の記載確認 | reviewer 確認済み + 人間の gate 承認 |
| FR-4（record 成果物限定） | git status の変更セットが Intent record と intents.json 追記だけであること | reviewer 確認済み + PR diff レビュー |
| NFR-2（H2 見出し 2 個以上） | 成果物 3 文書の見出し数確認 | reviewer 目視（code-generation は required-sections sensor を import しないため） |
| record 構造 | AmadeusValidator | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-agmsg-trial-docs` |

## 適用判断

コード単体テストは対象コードが存在しないため不適用。文書成果物の検証は上表のとおり reviewer・validator・人間 gate の 3 経路で担保する。

## 実行方法

一括実行は `npm run test:all`（repo 標準）と上記 validator コマンド。結果は [build-test-results.md](build-test-results.md) を参照。
