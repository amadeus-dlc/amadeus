# Security Test Instructions

Unit: persist-cid-metamain（Test Strategy: Minimal）

## 適用判断

限定適用とする。本 Intent の変更は認証・入力境界・秘密情報に触れないが、learnings persist は steering（memory/{project,team}.md）への書き込み経路であるため、その完全性の観点だけ確認した。

## 検査

- 旧形式 marker の不改稿（追記型資産の完全性、org.md の記録不改変と整合）は FR-1.3 の eval 検査で担保される。
- activeIntent 解決不能時は loud fail し、曖昧な出所の marker が steering に書かれない。
- 認証情報・API キー・シークレットのハードコードはない（変更はエンジンツール・eval・宣言ファイルのみ）。
