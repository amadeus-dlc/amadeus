# Frontend Components — U1 tie-choice-resolution

上流入力(consumes 全数): requirements.md、components.md、component-methods.md、services.md、unit-of-work.md、unit-of-work-story-map.md — UI レス CLI のため出力契約(ui-less-mockups-as-output-contract 準拠)を requirements.md FR-1/FR-3 の文言・component-methods.md のエラー様式・services.md の利用者影響から確定。record 描画行は unit-of-work-story-map.md の閲覧ステップ、SKILL 3面の対象は components.md の docs 行に対応。検証工程は unit-of-work.md U1 の完成条件へ引き渡す。

## 出力契約(CLI = UI 相当面)

| 場面 | 出力(verbatim 契約) | exit |
| --- | --- | --- |
| tie へ有効 choice | (既存成功系と同一 — 状態遷移 stdout JSON) | 0 |
| tie へ二値/不正 | `invalid-transition: resolution "<入力>" is not valid for hold reason "tie" (valid: choice:1/choice:2)` (2択選挙の例) | 1 |
| record.md 裁定行(tie choice 裁定) | `裁定: <choice label>(choice <n> — tie 裁定)` | — |
| record.md 裁定行(他 reason 二値) | `裁定: 採用` / `裁定: 不採用`(無変更) | — |
| trail 行 | `- hold 裁定履歴: tie → choice:<n>(<at>、復帰先 tallied)`(election.ts:403 の生成式 `- hold 裁定履歴: ${r.reason} → ${r.resolution}(${r.at}、復帰先 ${r.resumedTo})` の tie 具体形 — 生成式は無変更、resolution 値の transparent 表示) | — |

## 様式整合

エラー様式は既存 fail 経路(invalid-transition + valid ヒント)の既習様式に揃え、新規発明しない。これらの文言がテスト assert の導出元になる(FR-4)。
