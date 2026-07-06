# 動向メモ — GitHub Projects 周辺（260705-github-kanban-sync）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

本 Intent は内部開発ツールであり、市場規模の推定は不要である。
ここでは、intent-statement.md の方式（Projects v2 ミラー + hook 起動 sync）の前提が近い将来崩れないかという観点だけを扱う。

## 関連する動向

- Projects v2 は GitHub の現行世代の board であり、built-in workflows の拡充要望が継続的に議論されている（[Enhancing Workflows in Projects](https://github.com/orgs/community/discussions/53973)）。built-in workflows が拡充されても、トリガーは GitHub 側イベントに限られる見込みであり、「ローカル実況の push」という本 Intent の固有部分は置き換えられない。
- `gh project` サブコマンドは純正 CLI に統合済みで、GraphQL（`gh api graphql`）と併用する運用が安定している（[gh project item-edit](https://cli.github.com/manual/gh_project_item-edit)）。
- Actions からの Projects 操作は `GITHUB_TOKEN` では不可（repo スコープ）という制約が続いており、PAT または GitHub App が前提である（[Automating Projects using Actions](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions)）。ローカル hook 方式なら Maintainer 個人の `gh` 認証（`project` scope 付与）だけで済む。

## 本 Intent への含意

- Projects v2 と GraphQL API は当面安定した土台として扱える。
- 後続候補 ④（GitHub Actions による merge 後の整合回復）を実施する場合は、PAT / GitHub App の管理が追加コストになる。ローカル hook 方式を主とする本 Intent の判断は、この認証コストの観点でも妥当である。
