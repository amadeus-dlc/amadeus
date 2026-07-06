# Intent Backlog（260705-github-kanban-sync）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[constraint-register.md](../feasibility/constraint-register.md)

proto-Unit の一覧である。優先順位は依存順（dependency-first）とする。①がスキーマ、②が読み書きの本体、③が自動化であり、逆順には作れない。

## Backlog

| # | proto-Unit | 内容 | MoSCoW | 依存 | PR |
|---|---|---|---|---|---|
| P1 | registry-issues-field | `intents.json` へ任意フィールド `issues` を追加し、既存 entry を遡及補完する。読み手の互換確認（エンジン、validator） | Must | なし | PR 1 |
| P2 | kanban-sync-manual | `dev-scripts/kanban-sync.ts`（Bun + TS、TDD）。スキャン → org project へ冪等反映。scope 不足の明示検知。board 初期構築（列、フィールド）を含む | Must | P1、人間操作（`gh auth refresh -s project`、org project 作成権限の確認） | PR 2 |
| P3 | kanban-hook-flush | PostToolUse キュー書き込み + Stop / SessionEnd flush のリポジトリローカル hook 結線。drop 記録（hooks-health 形式） | Must | P2 | PR 3 |
| P4 | board-auto-archive | completed の auto-archive 設定（Projects 側の built-in 設定） | Should | P2 | PR 2 に同乗可（設定作業のみ） |

## 除外（Won't）

確認時間短縮の計測、通知系、統計、リトライ戦略の作り込み（暫定機構、C07）。

## 人間操作の前提

- `gh auth refresh -s project`（P2 の前）。
- amadeus-dlc org での project 作成権限の確認（P2 の前。feasibility open question）。
- 各 PR の merge（全段階）。
