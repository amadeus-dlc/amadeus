# Business Rules — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../../../inception/units-generation/unit-of-work.md`(U1)、`../../../inception/units-generation/unit-of-work-story-map.md`(FR→U1)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜5 の AC 群)、`../../../inception/application-design/components.md`(C1〜C5)、`../../../inception/application-design/component-methods.md`(契約)、`../../../inception/application-design/services.md`(統合境界)。2026-07-17。

## 不変条件(invariants)

| # | ルール | 由来 | 検証面 |
|---|---|---|---|
| R-1 | plugin はいかなる経路でも opencode の動作をブロックしない(返り値でのキャンセル・変更なし、例外は catch して stderr) | AC-2c / ADR-3 | C4 テスト+コードレビュー |
| R-2 | ToolNameMap 相当には実測確定値のみ登録 — 未登録語彙は **stderr 記録の上で** advisory reject(無音の握りつぶし禁止 — R-8 と対) | AC-2d | AC-3a テスト(未登録語彙系) |
| R-3 | payload 欠落フィールドは error(fail-closed)— 推測補完しない | component-methods reconstruct 契約 | AC-3a テスト(エッジ系) |
| R-4 | 写像表の各行は3値(配線/⚠/未対応)+根拠必須 — 空欄・推測 ✅ 禁止 | AC-1a/1b | 表の grep 検証 |
| R-5 | mint(HUMAN_TURN)配線は ADR-5 の2条件成立時のみ — 判別不能なら見送り(phantom HUMAN_TURN の構造的封鎖) | AC-3c / ADR-5 | 工程0 表+レビュー |
| R-6 | core hooks 11本は無改変 — 呼び出しは subprocess spawn のみ(env: process.env 明示) | AC-2b | diff 目録 grep |
| R-7 | dist は手編集せず regen のみ(`bun scripts/package.ts`) | AC-4a | dist:check / promote:self:check |
| R-8 | サイレント失敗禁止 — すべての失敗経路で stderr 記録 | services.md+AC-2c(**cursor からの意図的相違**: cursor defaultSpawn は stderr:"ignore"・exit code 未参照 — amadeus-cursor-lib.ts:218/:239-242 — であり、本則は同型踏襲でなく要件由来の強化。business-logic-model ワークフロー2 の明文照合参照) | C4 テスト |

## 検証ロジックの分類(error-classification 準拠)

- **回復可能(advisory 継続)**: 未配線イベント・未登録語彙・spawn 失敗・hook 非0 exit → stderr 記録して継続(R-1/R-2/R-8)
- **fail-closed(配線せず)**: payload 欠落(R-3)、mint 条件不成立(R-5)— 「満たせない場合は満たしていない状態を正直に維持する」(ADR-5)
- **禁止(存在しない分岐)**: opencode をブロックする経路(R-1)、推測に基づく配線(R-4)

## 条件付き挙動

- 配線 0 件の場合: plugin 実装は最小殻+表更新のみで Issue スコープ(1)(3)(4)充足(AC-5b)— 0 件は失敗ではなく正常系
- ⚠ 行の確定条件が実装時実測で不成立の場合: 該当行を未対応へ降格し docs 機能表へ根拠を転記(AC-5a、measurement-ref 付き)
