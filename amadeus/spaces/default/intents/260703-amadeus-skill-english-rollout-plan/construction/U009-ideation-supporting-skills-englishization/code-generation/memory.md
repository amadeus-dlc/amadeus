# Code Generation Memory：Ideation and supporting skills 英語化

## 解釈

- 補助分析・review 系 skill には、ユーザーへ日本語で提示する固定文言（domain-grilling の候補確認文、event-storming の初回質問文、domain-modeling の対話例）が含まれる。これらは「ユーザー向け文言は日本語」の方針に従い、埋め込みブロックごと保持した。
- `amadeus-grilling` の `# Grillings` ブロックは生成される Grilling Decision Trail の構造定義であり、見出し、表ヘッダ、記録項目名を日本語のまま保持した。
- `Event Storming のモジュールファイル` という見出しは、生成ファイル名でも成果物内見出しでもない説明句のため、英語へ翻訳した。

## 逸脱と対処

- domain-grilling の契約 needle「the target Intent's `inception/traceability.md`」が 80 桁折返しで分断されたため、折返し位置を調整して 1 行に収めた。
- audit.md の末尾に余分な空行が入り `git diff --check` 相当の検査に失敗したため、末尾空行を除去した。

## トレードオフ

- なし。

## 未解決の問題

- なし。
