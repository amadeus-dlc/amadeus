# 競合分析 — 既存代替の比較（260705-github-kanban-sync）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

intent-statement.md の要件は「未 push の worktree で進む作業の実況を、ローカル hook から GitHub 上の kanban へ一方向反映する」ことである。
調査範囲は market-research-questions.md Q1 = B（GitHub 純正 + gh CLI 拡張 / OSS）に従う。
外部 SaaS は Q2 = A により候補から除外した。

## GitHub 純正機能

| 機能 | できること | 本 Intent の要件に対する不足 |
|---|---|---|
| Projects v2 built-in workflows | Issue / PR のクローズやマージで Status を自動遷移。フィルタ一致で auto-add。自動アーカイブ | トリガーが GitHub 側イベント限定。ローカルの `aidlc-state.md` の変化（stage 進捗、承認待ち、担当エージェント）を検知できない |
| Actions 連携（actions/add-to-project 等） | push / issue イベント起点で board へ項目追加・フィールド更新 | 起点が push 後に限られ、未 push worktree の実況が取れない。Actions の `GITHUB_TOKEN` は repo スコープで Projects にアクセスできず、PAT または GitHub App が別途必要 |
| `gh project` サブコマンド（純正 CLI） | project / item / field の CRUD（`item-add`、`item-edit`、`field-list` など） | 1 回の呼び出しで更新できるフィールドは 1 個。多数フィールドの冪等反映には `gh api graphql` での batch が現実的 |

参照: [Automating your project（GitHub Docs）](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project)、[Using the built-in automations](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-built-in-automations)、[Automating Projects using Actions](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions)、[gh project item-edit](https://cli.github.com/manual/gh_project_item-edit)

## gh CLI 拡張と OSS 同期ツール

| 種別 | 例 | 評価 |
|---|---|---|
| Actions marketplace | [project-beta-automations](https://github.com/marketplace/actions/project-beta-automations) | GitHub 側イベント起点であり、純正 Actions 連携と同じ不足を持つ |
| コミュニティ CLI ツール | [GitHub Projects CLI Tool（gist）](https://gist.github.com/ruvnet/ac1ec98a770d57571afe077b21676a1d) など | Python + gql などの依存を持ち込む。Q3 = A（gh CLI だけ）の方針に反する。機能も project CRUD 汎用であり、`aidlc-state.md` のスキャンという固有部分は結局自作になる |

## 結論

「ローカル成果物（正）をスキャンして board へ冪等反映する」部分を担う既存ツールは存在しない。
固有部分（`intents.json` と `aidlc-state.md` の解釈）が本質であり、汎用ツールを挟んでも固有部分の実装は消えない。
GitHub 側の表示と操作 UI（board、列、フィールド、フィルタ）は Projects v2 純正をそのまま使い、書き込みは `gh api graphql` で自作するのが、依存方針（Q3 = A）とも整合する。
