# Performance Test Instructions — 260814-t99-copytree-race

## 判定: 適用可能な performance NFR は存在しない

- requirements.md に合否数値目標を宣言する performance NFR はない(attempt 毎再コピーのコスト評価は Assumptions の定性記述であり合否閾値ではない)。承認済み NFR へ trace できない性能検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)

## 将来この判定を覆す条件

- fixture コピーの実行時間に合否閾値を課す NFR が要件へ宣言された場合
