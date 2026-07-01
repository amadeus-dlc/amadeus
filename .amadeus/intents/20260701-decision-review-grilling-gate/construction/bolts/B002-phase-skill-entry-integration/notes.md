# Construction Notes

## 対象タスク

- B002/T001
- B002/T002

## 実行方針

- Ideation、Inception、Construction の公開 phase skill に同じ decision review 規則を追加する。
- source skill と昇格先 skill を同期する。
- `repair_only` は構造補修、`grill_required` は人間判断が必要な不明瞭ノードとして分ける。

## 対象外

- Discovery、Event Storming、Steering への初期一括適用はしない。
- evaluator の本格実装はしない。

## 実装判断

- Ideation、Inception、Construction の公開入口へ `Decision Review` 節を追加した。
- source skill と昇格先 skill に同じ文面を入れ、起動時に `amadeus-decision-review` の規則を参照する契約にした。
- Discovery、Event Storming、Steering への初期一括適用は対象外のまま維持した。

## 検証入口

- `npm run typecheck`
- `npm run diff:check`

## 未確認事項

なし。
