# Performance Test Instructions — 260814-copytree-guard-boundary

## 判定: 適用可能な performance NFR は存在しない

- requirements.md に合否数値目標を宣言する performance NFR はない。承認済み NFR へ trace できない性能検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)
- 参考: guard 適用による fixture セットアップの追加コスト(count 走査)は既存 t-kiro-tui-live-gate 12/12 の緑で実用上の退行なしを確認

## 将来この判定を覆す条件

- fixture セットアップ時間に合否閾値を課す NFR が宣言された場合
