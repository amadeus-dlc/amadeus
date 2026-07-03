# Questions：Feasibility

| # | 確認したいこと | 推奨回答 | 回答 |
|---|---|---|---|
| 1 | 上流コピーが含む hook 配線と、既存 .claude/ 開発環境（kiro skill 群など）の共存方針 | 共存を交渉不能制約とし、aidlc-* 名前空間で既存 settings.json へマージ | 共存を制約化（推奨案を採用） |
| 2 | 移行中の PR 粒度と main の健全性 | main は常に test:all green、Bolt 単位 PR、粒度制約は例外記録で運用 | green 維持 + Bolt 分割（推奨案を採用） |
| 3 | 本家追従の基準管理 | 基準 commit を固定して記録し、更新は明示的な Issue または Intent で行う | commit 固定 + 明示更新（推奨案を採用） |

補足として、質問の前に次の 2 件の不確実性を調査で解消した。

- `dist/claude/` の内部構造: `.claude/` 配下に tools 26 個、hooks 11 個、sensors 4 個、aidlc-common（conductor、stage 定義 31 個、protocols）、agents、knowledge、rules、scopes、skills 38 個、settings.json、CLAUDE.md を含む（基準 commit fde1e1af）。
- 3.6 の実ファイル名の矛盾: 上流の stage 定義自身が produces（build-test-results）と outputs 散文（test-results.md）で不一致であり、実名はエンジンの成果物解決に従う。
