# Build vs Buy 判断（260705-github-kanban-sync）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

## 判断

**Build（表示は純正 Projects v2 を利用、sync 部分だけ自作）** とする。

| 選択肢 | 評価 | 判断 |
|---|---|---|
| Buy（外部 SaaS カンバン） | Intent record の状態を GitHub 以外へ送信することになり、Q2 = A の方針に反する | 却下 |
| 純正機能だけで構成（built-in workflows + Actions） | トリガーが GitHub 側イベント限定で、未 push worktree の実況（intent-statement.md の成功指標 1、4）を満たせない | 却下 |
| 汎用 OSS 同期ツールの採用 | 固有部分（`intents.json` と `aidlc-state.md` の解釈）は結局自作になり、Python / gql などの依存だけが増える（Q3 = A に反する） | 却下 |
| **Build（採用）** | 表示・操作 UI は Projects v2 純正を無償利用し、自作範囲を「ローカルスキャン + `gh api graphql` での冪等反映」に限定できる | 採用 |

## 自作範囲と流用範囲

- **流用**：board UI、列、カスタムフィールド、フィルタ（Projects v2 純正）。認証（`gh` の既存ログイン + `project` scope 追加）。
- **自作**：`dev-scripts/kanban-sync.ts`（全 Intent スキャン → GraphQL 冪等反映）、hook 結線（キュー書き込みと flush）。
- **実装先の限定**：自作部分はこのリポジトリ内だけで起動する開発ツール（`dev-scripts/` とリポジトリローカルの hook 設定）とする。Amadeus 本体の機能（`skills/amadeus*`、`.agents/amadeus/` エンジン、昇格先、parity 対象）としては実装しない（Maintainer 指示、2026-07-05）。
- **table-stakes**（market-research-questions.md Q4 = A、B、C、D）：カードと列表示、カードフィールド（担当エージェント、ホスト、worktree、scope、Issue）、Issue / PR リンク、最終更新時刻（鏡の鮮度）。鮮度表示は Projects v2 のカスタムフィールド（date または text）で満たす。

## リスクと緩和

| リスク | 緩和 |
|---|---|
| GraphQL スキーマ変更や rate limit | sync は冪等な全上書き設計のため、失敗時は次回 flush で回復する（intent-statement.md の受け入れ条件と同じ） |
| `gh` の `project` scope 未付与 | Construction 開始前に `gh auth refresh -s project` を人間が実施する（intent-capture の open question として記録済み） |
| 1 フィールド 1 呼び出しの CLI 制約 | `gh project item-edit` ではなく `gh api graphql` の mutation で batch する |
