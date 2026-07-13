# 失効ルール履歴

このファイルは監査・再検討用の履歴であり、runtime の `rules_in_context` には読み込まれない。

## 2026-07-09〜2026-07-10 Codex / Claude 役割移行

- Codex メンバーをレビュー・調査中心に割り当てる規則、および後続の実装解禁規則は、all-claude-team への移行により失効した。自己実装の自己レビュー禁止だけを一般化して `team.md` に残した。
- Codex 0.144.0 の `code_mode_host` 回避、共有 app-server 再起動、turn mode 運用は当時の復旧知識として保持する。現在の恒久ルールではなく、再発時には現行バージョンで再検証する。

## 2026-07-09 bugs-only スコープ

- enhancement intent を凍結してバグ修正だけに限定した期限付き裁定は終了済みであり、常時適用される team rule から除外した。将来同様の制約が必要な場合は active intent の state またはスコープ成果物に記録する。

## 2026-07-07 intent 固有依存

- `packages/setup` を特定 intent の sibling dependency として扱う規則は、その intent に限定された判断だったため project rule から除外した。
