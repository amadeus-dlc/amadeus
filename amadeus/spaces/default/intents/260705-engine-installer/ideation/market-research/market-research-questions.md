# Market Research 質問（260705-engine-installer）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

導入形態は grilling 確定 4（リポジトリ内 TS スクリプト。bunx / npm 公開、dist 生成物方式は不採用）で確定済みである。この質問票は確定判断の適用確認だけを扱い、回答は上流（grilling 転記コメント、Issue #451、リポジトリの実構成）から転記する。新規のピア協議は行わない。

---

## Q1. 導入形態はどれを採用しますか？

A. リポジトリ内 TS スクリプト（`bun run <script> --target <workspace>`。clone した本リポジトリを配布元とする）
B. bunx / npm レジストリ公開
C. 上流方式の dist 生成物
D. 手順書のみ
X. Other (please specify)

[Answer]: A（出典: grilling 確定 4。B・C は未リリースのため範囲外、将来 bunx 化する場合も本スクリプトを中核に再利用する）

## Q2. 外部ツール（dotfiles 管理・汎用インストーラ）を流用しますか？

A. 流用しない（固有規則 = settings.json hooks 冪等マージ、aidlc/ 不可侵は結局自作になり、依存だけが増える）
B. symlink 配線だけ外部ツールに任せる
X. Other (please specify)

[Answer]: A（出典: build-vs-buy.md の判断。オフライン・cold cache 前提（#441）とも整合し、外部依存を持ち込まない）
