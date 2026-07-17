# Frontend Components — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../../../inception/units-generation/unit-of-work.md`、`../../../inception/units-generation/unit-of-work-story-map.md`、`../../../inception/requirements-analysis/requirements.md`、`../../../inception/application-design/components.md`、`../../../inception/application-design/component-methods.md`、`../../../inception/application-design/services.md`。

## 対象(UI レス CLI — 出力契約が frontend の代替、PM4-2 既決様式)

GUI コンポーネントは存在しない。ユーザー可視面は CLI 出力の 3 契約(refined-mockups で文字列確定済み):

| 契約 | 所在 | 変更 |
|---|---|---|
| usage(renderHelp)| reporter.ts:19-27(usage 2本 = :24-25)| ハーネス列挙を 6 値表記へ(確定文字列 exact) |
| invalid エラー | reporter.ts:137 | 6値列挙の置換文言(exit 2 — 挙動保存) |
| wizard 選択肢 | HarnessName.all 駆動(wizard :17)| 無改修で 6 値表示に自動追随 |

## インタラクションフロー

- `install --harness <name> --yes`: 非対話 — 出力は既存 ACTION_LABELS 経路(FR-3 AC-3b、文言の新規発明なし)
- wizard(引数なし): 選択肢が 6 値になる以外、対話フロー・入力検証(membership)とも不変
- フォームバリデーション相当: `HarnessName.parse` のみ(business-rules.md BR-3)

## 状態・props 相当

なし — CLI は stateless。README 導線(FR-5)は静的文書で、本ファイルの出力契約と同一の 6 値表記に同期する。
