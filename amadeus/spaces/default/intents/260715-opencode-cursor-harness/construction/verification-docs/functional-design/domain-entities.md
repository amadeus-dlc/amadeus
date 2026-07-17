# Domain Entities — U4 verification-docs

intent: `260715-opencode-cursor-harness` / Unit: U4
上流入力: application-design の component-methods.md(C4 契約)/ components.md / services.md(機能単位表の原型)、requirements.md(FR-5/FR-7)、unit-of-work.md / unit-of-work-story-map.md。

## エンティティ

新規型なし。smoke test の検査対象表(dist ファイル一覧)はテストファイル内のモジュールスコープ定数(`ReadonlyArray<string>`)とし、manifest から動的導出はしない — 理由: smoke の目的は「生成結果の期待固定」であり、manifest から導出すると manifest のバグと共変して偽 green になる(検証劇場回避。dist:check が byte 面、smoke が存在面という役割分担)。

| エンティティ | 型 | 不変条件 |
| --- | --- | --- |
| 期待ファイル表 | `ReadonlyArray<string>`(テスト内定数、per-harness) | manifest 非依存の独立宣言(共変偽 green の禁止) |
| 機能単位表(docs) | markdown 表 | 各行が Unit 実測に遡れる(R-U4-2) |

## 状態遷移

なし。

## frontend-components.md の不作成(CONDITIONAL 判定)

U4 も UI を含まない — 他 Unit と同一判定。
