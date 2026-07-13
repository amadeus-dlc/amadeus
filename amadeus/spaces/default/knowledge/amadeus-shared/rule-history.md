# 失効ルール履歴

このファイルは監査・再検討用の履歴であり、runtime の `rules_in_context` には読み込まれない。

ハーネス固有の失効した回避策・バージョン依存の運用知識は、現在のルールへ誤適用されないよう本ファイルへ複製しない。必要な場合は導入当時の Git 履歴と intent audit を参照し、現行ハーネスで再検証してから新しい knowledge として採用する。

## 2026-07-09 bugs-only スコープ

- enhancement intent を凍結してバグ修正だけに限定した期限付き裁定は終了済みであり、常時適用される team rule から除外した。将来同様の制約が必要な場合は active intent の state またはスコープ成果物に記録する。

## 2026-07-07 intent 固有依存

- `packages/setup` を特定 intent の sibling dependency として扱う規則は、その intent に限定された判断だったため project rule から除外した。
