# Domain Entities — advisory-retirement(U3 / #3187)

上流入力: `business-logic-model.md` / `business-rules.md` / `component-methods.md`(C4 撤去対象)/ `unit-of-work.md` U3 / `unit-of-work-story-map.md`(#3187 クローズ条件)。本 unit は新規エンティティを導入しない — 退役エンティティの台帳として書く。

## 退役するエンティティ(完全削除)

| エンティティ | 所在 | 退役後 |
|---|---|---|
| `GovernedSubjects` 型 | `tla-authoring.ts` | 削除(型・parse・consumer すべて) |
| `authoring-subjects.json`(宣言ファイル契約) | `defaultSubjectsPath` が解決するパス契約 | 契約ごと消滅(ファイルは元々 0 件実在 — #3187 実測) |
| `authoring-hold` advisory 宣言 | `plugin.json` advisories[] | 削除(spec-change は残存) |
| failure kind `governed-subjects-unreadable` | `tla-authoring.ts` | 削除(発火点ごと) |
| verb `advisory hold` / `subjects declare` | CLI dispatch + USAGE | 削除(未知 verb の既存拒否に合流) |

## 存続するエンティティ(非接触の確認)

- `spec-change` advisory(同 plugin)— 宣言・evaluator・handoff とも不変
- engine の汎用 advisory 機構(`advisoryReportHoldReason` 経路)— 不変
- terminal-route receipt(#3262)・applicability 判定(U4 が別途変更)— 本 unit は非接触

## ライフサイクル

退役は1コミット(1 PR)で原子的に行う — 宣言だけ先に消す・コードだけ先に消す等の中間状態を main に置かない(FR-RET-1 の同一変更要求)。
