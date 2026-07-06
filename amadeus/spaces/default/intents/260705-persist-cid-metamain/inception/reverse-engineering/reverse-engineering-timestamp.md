# reverse-engineering-timestamp — 260705-persist-cid-metamain

## 実施記録

- 実施時刻: 2026-07-05T23:25:37Z（増分更新。フル再解析ではない）
- 新基準 commit: 616d063e（origin/main = eng3/issue-504-507-bugfix 分岐点）
- 正本: [codekb/amadeus/](../../../../codekb/amadeus/)（実施記録の本体は [codekb/amadeus/reverse-engineering-timestamp.md](../../../../codekb/amadeus/reverse-engineering-timestamp.md)、更新履歴の正は [codekb/amadeus/timestamp.md](../../../../codekb/amadeus/timestamp.md)）

## 判断

旧解析基準 3049eadf からの非 aidlc 差分が 39 ファイル（+2700/-56。PR #489 pdm scope、#505 ガード修正 3 件、#508 installer）と実質的なため、参照台帳 stub の据え置き採用ではなく正本の増分更新を選んだ。更新は差分の影響節に限定し（7 docs 更新、2 docs 据え置き）、更新内訳と根拠は正本の timestamp.md に記録した。
