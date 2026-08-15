# Security Test Instructions — intent 260815-per-unit-outcome

## 判定: 適用可能な NFR が存在しない(検査は生成しない)

- 根拠: requirements.md に security NFR は宣言されていない。本修正は認証・認可・外部入力境界に触れず、新イベントの入力は engine 自身が導出する内部値のみ(改竄行の fail-closed は integration 層で実測済み — invalid-unit-outcome-audit-row)
- ノルム: cid:build-and-test:c2-no-test-theatre-for-absent-nfr(体裁のための検査を作らない)
- 将来この判定を覆す条件: 監査イベントへ外部由来の値(ユーザー入力・リモート応答)を載せる拡張が入った場合
