# Security Test Instructions — 260814-priority-bug-batch

## 判定: 適用可能な NFR が存在しない(セキュリティテストは生成しない)

- 根拠: 本バッチの変更面(テストアサーション削減、fixture プローブ、subprocess 読み取りリトライ、spawn error 検査、driver 状態遷移)は認証・認可・入力境界・秘密情報のいずれにも触れない。requirements.md にセキュリティ NFR の宣言なし
- 継続する既定の担保: CI の control-byte gate / source-only 境界検査 / lint は本 PR にも適用される(blocking 集合)
- この判定を覆す条件: 変更が外部入力の解析面・認可判定・秘密情報の取り扱いへ拡張されたとき
