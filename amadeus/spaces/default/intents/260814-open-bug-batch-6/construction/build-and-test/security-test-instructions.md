# Security Test Instructions — intent 260814-open-bug-batch-6

## 判定: 適用可能な NFR が存在しない(検査は生成しない)

- 根拠: security NFR の宣言なし。認証・認可・外部入力境界に非接触(gh 経由の操作は既存の gh-scripts-boundary ノルム下)
- ノルム: cid:build-and-test:c2-no-test-theatre-for-absent-nfr。覆す条件: security NFR が要件へ宣言された場合
