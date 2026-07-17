# Scalability Requirements — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../functional-design/business-logic-model.md`、`../functional-design/business-rules.md`、`../../../inception/requirements-analysis/requirements.md`、codekb technology-stack.md。

## 要求(規模の軸 = ハーネス数の成長)

- SC-1: 7値目以降の追加コストを一定に保つ — FR-4 AC-4b の将来条件チェックリスト(8サイト+テスト2本+README = 全数台帳)が追加手順の上限を固定する。台帳外の隠れ変更面を作らない(BR-4)
- SC-2: 汎用機構(wizard / verifier / plan / payload)は列挙数に対して無改修でスケールする(HarnessName.all 駆動・readdirSync 駆動 — F-3)— per-harness 分岐の追加はこの性質を壊すため禁止
- SC-3: 実行規模(ユーザー数・データ量)の軸は該当なし — installer は単発 CLI でサーバ・永続データを持たない(反証可能な N/A 根拠: technology-stack.md にランタイムサービス不存在)

## 将来条件(c4 チェックリストの再固定)

規模増 = SC-1 台帳 / クラッシュ耐性 = 既存アトミック性へ非接触(FR-4)/ 別 OS = 列挙は OS 非依存 / 消費側棚卸し = README 3箇所(FR-5)。
