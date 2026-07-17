# Intent Backlog — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`。

## バックログ(直列3段 — 見積り S〜M に内包)

| # | 項目 | 依存 | 対応 In |
|---|---|---|---|
| B-1 | 語彙実測(工程0): @opencode-ai/plugin 一次ソース直読+イベント×hooks 写像表確定(HUMAN_TURN 相当の在否含む) | なし | In 1・3 |
| B-2 | 配線プラグイン実装+manifest+regen+テスト(B-1 で確定した配線分のみ) | B-1 | In 2・3 |
| B-3 | docs 機能単位表の更新(解消 or 根拠付き維持) | B-1(B-2 と並行可) | In 4 |

## 後続 intent 候補(本 intent 外)

- 写像不能と確定した面の将来再訪(opencode 側のイベント追加・payload 文書化の時点で) — 発見時に Issue 起票(Way of Working)
