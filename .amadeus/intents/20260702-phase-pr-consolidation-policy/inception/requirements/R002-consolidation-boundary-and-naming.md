# R002 統合単位と branch 命名

## 要求

統合単位は仕様側（Discovery〜Inception）と Construction 以降の 2 グループに限定され、統合 branch の命名が定義されている。

## 背景

仕様側（Discovery、Ideation、Inception）と実行側（Construction 実装）の間には Task Generation Gate の人間承認があり、ここで PR を分けると gate と PR 単位が自然に対応する（G001 GD001）。
finalization は merge イベントを挟むため統合できない（Issue #310 の対象外）。

## 受け入れ条件

- 統合できる範囲が仕様側（Discovery〜Inception）のグループに限られ、Construction 実装と finalization は従来どおり別 PR であることが policy から読める。
- 仕様側統合 branch の命名（`codex/issue-<n>-specification`）が、既存の branch 命名（`codex/issue-<n>-<phase>`）と並ぶ例として定義されている。

## 依存

- R001

## 対応する対象境界

- SC-IN-001

## 未確認事項

- なし。
