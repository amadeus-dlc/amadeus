# Construction Notes

## 実行方針

B001 は source skill と昇格先 skill の両方へ同じ guidance を追加する。
親 skill では検証観点に追加し、内部 skill では traceability finalization の手順へ追加する。

## 対象タスク

- B001/T001。
- B001/T002。

## 実装メモ

- `Construction からの追跡` は完了済み Construction の証拠追跡表として扱う。
- `Task Generation からの追跡` は Task 生成追跡として残し、完了時表の代替にしない。
- 必須列は validator の既存契約に合わせ、`ボルト`、`タスク`、`証拠`、`状態` とする。

## 未確認事項

なし。
