# D002: template trace table

## 背景

traceability template は `Task Generation からの追跡` と `Deployment Unit からの追跡` を持つが、完了済み Construction に必要な `Construction からの追跡` を持っていなかった。

## 判断

標準 traceability template に `Construction からの追跡` を追加する。
列は `ボルト`、`タスク`、`証拠`、`状態` とする。

## 理由

新規 Construction 成果物の標準構造から完了時表を読み取れるようにするため。
また、template eval の期待見出しと skill guidance を揃えるため。

## 影響

source template と昇格先 template を同じ内容に更新する。
template eval は `Construction からの追跡` を期待見出しに含める。
