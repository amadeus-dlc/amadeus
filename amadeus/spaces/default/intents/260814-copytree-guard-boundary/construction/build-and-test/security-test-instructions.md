# Security Test Instructions — 260814-copytree-guard-boundary

## 判定: 適用可能な security NFR は存在しない

- テストハーネス内のコピー堅牢化であり、認可・入力検証・秘匿情報の境界に触れない(requirements.md に security NFR なし)。cid:build-and-test:c2-no-test-theatre-for-absent-nfr に従い生成しない
- 関連する安全性確認: guard の remove は mkdtemp 配下の dest-fresh 面のみに適用(seed 済み dest の merge 面は帰属コメント付きで除外 — データ破壊経路なし)

## 将来この判定を覆す条件

- fixture が外部入力由来のパスを dest に取る変更が入った場合
