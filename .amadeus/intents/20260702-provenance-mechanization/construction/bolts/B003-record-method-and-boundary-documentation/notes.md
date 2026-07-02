# Construction ノート

## 実行方針

B001 と B002 の実装確定後に、記録方法の文書記述を実装内容へ整合させる。検査責務境界は Inception D001 で確定済みのため、再定義はせず参照の欠落を補うだけにする。

実装 PR は B001〜B003 をまとめる想定のため、B003 単独の実装 PR は作らない。

## 対象タスク

| タスク | 状態 | 方針 | 証拠 |
|---|---|---|---|
| T001 | 未着手 | `policies.md` の記録方法記述を `provenance:generate` 前提へ更新し、Inception D001 への参照を確認・補完する。 | 未登録 |
| T002 | 未着手 | `development.md` の stage と workspace 対応記録の表を新しい記録先と整合させる。 | 未登録 |

## 作業順序

1. T001 で `policies.md` を更新する。
2. T002 で `development.md` を更新する。

## 検証入口

- `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts .`（成果物構造の検証）。
- 更新箇所からのリンク実在確認（`provenance:generate` / `provenance:check` の実行入口、Inception D001 への参照）。

## 未確認事項

- なし。

## 実装判断

- `policies.md` の「provenance の最低記録項目」9項目の定義文（各項目の箇条書き）は変更せず、見出し直後に記録手段（`provenance:generate` の実行結果として記録する）と出力先（`provenance/Pnnn-<slug>.json`）を説明する1文を追加した。
- 検査責務境界への参照は、Inception D001（`inception/decisions/D001-inspection-boundary-adoption.md`）へのリンクを `policies.md` の「判断基準」に追加する形にした。境界の再定義はせず、参照だけを追加している。
- `development.md` の「stage と workspace 対応記録」表は、provenance の最低記録項目に対応する行（build workspace、host environment、target workspace、target artifacts、validator 結果）の記録先列を `provenance/Pnnn-<slug>.json` へ更新した。「標準検証結果」行は `provenance:check` が対象にしない標準検証（typecheck、diff:check など）を扱うため、記録先は変更していない。
- `examples/skill-provenance.json` との並立方針（Inception D003）とは矛盾しないことを確認した。`development.md` の更新は `provenance/` 配下の Intent 単位記録だけを対象にしており、example snapshot の鮮度管理契約には触れていない。
