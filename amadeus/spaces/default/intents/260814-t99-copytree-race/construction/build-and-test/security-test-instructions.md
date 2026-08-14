# Security Test Instructions — 260814-t99-copytree-race

## 判定: 適用可能な security NFR は存在しない

- 本 intent はテストヘルパの収束性修正であり、認可・入力検証・秘匿情報の境界に触れない(requirements.md に security NFR なし)。承認済み NFR へ trace できない security 検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)
- 関連する安全性確認: `remove` は helper が所有する mkdtemp 配下 dest のみに適用(dest-fresh 契約)— 全6呼出サイトの実測は RE record 参照

## 将来この判定を覆す条件

- copyTreeWithRetry が repo 内パスや外部入力由来のパスを dest に取る変更が入った場合
