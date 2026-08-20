# Business Rules — advisory-retirement(U3 / #3187)

上流入力: `business-logic-model.md`(撤去手順)/ `requirements.md` FR-RET-1〜4 / `unit-of-work.md` U3 / `unit-of-work-story-map.md`(#3187 クローズ条件)/ `components.md` C4。

## 不変条件(撤去後に成立していなければならない規則)

- **BR-1(互換ゼロ)**: 後方互換レイヤー・フォールバック分岐・deprecation シム・「旧 verb を呼んだら警告」の類を一切残さない。`advisory hold` / `subjects declare` を呼ぶと USAGE エラー(未知 verb の既存挙動)になる — 専用のエラーメッセージも作らない(それ自体が互換面になる)。
- **BR-2(同名別物の非接触)**: `amadeus-orchestrate.ts:5675,6606,6639` の `advisoryHold`(汎用 advisory 機構のローカル変数)と `spec-change` advisory の経路は 1 バイトも変更しない。エンジン側の diff は 0 行。
- **BR-3(spec-change の生存)**: 退役後も `plugin.json` の advisories は `spec-change` 1件を持ち、t444/t445 系の期待値は「宣言集合 = {spec-change}」へ更新される(空集合ではない)。
- **BR-4(grid 経路の非接触)**: tla-authoring の実効起動経路(scope-binding による stage grid — 25/25 実測)は本 unit の変更で一切影響を受けない。U3 の diff は applicability 判定ロジックに触れない(それは U4 の面)。
- **BR-5(census の再実行可能性)**: 受け入れ census は述語・対象・除外を business-logic-model.md の確定形どおりに実行し、結果(キーごとの hit 数と exit code、対照リテラルの非ゼロ)を code-summary へ転記する。
- **BR-6(対訳同期)**: docs/RFC の変更は en/ja を同一コミットで同期。
- **BR-7(TDD の適用形)**: 削除中心のため「失敗テスト先行」は逆向きに適用 — 退役対象テスト(t528/t524)が現に green であること(削除前 baseline)を確認してから削除し、期待値更新するテストは更新後に green を実測。振る舞い不変のリファクタではなく振る舞いの削除なので、削除後の不在テスト(退役 verb が USAGE エラーになる)を1本だけ追加する(既存 t 系の期待値更新に相乗りできる場合は新設不要)。

## エラー処理

- 削除により新設されるエラー経路はない(BR-1)。既存の未知 verb 拒否(USAGE)がそのまま働く。
- census が除外帰属外の hit を返した場合は削除漏れ — ゲートで停止し、hit の帰属を判定してから続行(fail-closed)。
