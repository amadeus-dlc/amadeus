# Scope Document — Intent Mirror の GitHub Project Status 同期(lifecycle フェーズ写像)

上流入力(consumes 全数): intent-statement, feasibility-assessment, constraint-register

スコープ境界は intent-statement の Initial Scope Signal(Issue #1560 全体・段階分割なし)を正とし、feasibility-assessment の実測(GO 判定、mutation のみ未実測、期待選択肢の不存在)と constraint-register の制約(C-T1〜C-E2)を境界条件として反映する。

> 2026-07-27 改訂(revision 1): ユーザー訂正により、写像対象を作業進行状態(Backlog/In Progress/Review/Done)から **AI-DLC lifecycle フェーズ**へ変更。Issue #1560 本文改訂と同期。
>
> 2026-07-27 改訂(仕様変更 B): **Project への item 追加を Amadeus が行う**。auto-add workflow 非依存(ユーザーが無効化)。mirror create チェーン内で設定済み対象 Project へ追加し、現在フェーズ Status を即設定。追加は冪等。非対象から「自動追加」を撤回(削除・アーカイブは非対象のまま)。

## 状態マッピング(既定)

| Amadeus lifecycle | GitHub Project Status |
|---|---|
| `IDEATION` | `Ideation` |
| `INCEPTION` | `Inception` |
| `CONSTRUCTION` | `Construction` |
| `OPERATION` | `Operation` |
| Intent `Completed` | `Done`(終端 — completion 時のみ) |
| `parked` | 変更しない(park 前の Status を維持) |

Project ごとに各フェーズの選択肢名を上書き可能(写像の意味は不変)。

## In Scope(対象)

Issue #1560(2026-07-27 改訂版)の受入条件17項目すべて(Q1 裁定: 全項目 Must):

1. Project 未所属の Mirror Issue では既存挙動不変(no-op)
2. `IDEATION` の Intent が `Ideation` へ同期される
3. `INCEPTION` への遷移が `Inception` へ同期される
4. `CONSTRUCTION` への遷移が `Construction` へ同期される
5. `OPERATION` への遷移が `Operation` へ同期される
6. 複数 Project 所属時、権限のある全 Project が同期される
7. Completed Intent の final sync で全対象 Project `Done` 後にのみ Issue close
8. parked では現在の Project Status が維持される
9. Project 別に各フェーズの Status 選択肢名を上書きできる
10. Status 選択肢未解決時は safety-blocked+completion close 阻止
11. 一時障害・部分成功の pending 永続化と次回冪等収束
12. `repair status` の Project Status drift read-only 検出(期待 Status は現在フェーズから導出)
13. Project 所属の追加・削除・アーカイブを行わない(不変条件)
14. daemon・polling・GitHub Actions 不要(不変条件)
15. `project` scope 等の認証要件ドキュメント化
16. Gateway / executor / state codec/reducer / lifecycle / CLI 診断の unit・integration テスト
17. 全ハーネス projection 再生成+distribution drift guard 通過
18. (仕様変更 B)設定済み対象 Project への mirror Issue の追加 — create チェーン内・冪等(既所属スキップ)・追加直後に現在フェーズ Status を設定。対象 Project の設定面(置き場所・形式)は requirements/design で固定。追加失敗は Status 更新失敗と同じ失敗セマンティクス(pending / safety-blocked / reconcile)に従う

## Out of Scope(Won't — 非対象)

Issue #1560(改訂版)非対象欄のとおり:

- `Backlog / In Progress / Review` を用いた一般的な作業進行状態の同期
- Project からの Mirror Issue の削除・アーカイブ(追加は仕様変更 B で In Scope 化 — In Scope 18)
- Project 固有 workflow / GitHub Actions の作成
- Pull Request・release・deploy の Status 管理
- 双方向同期(Project → Intent record の書き戻し)

## 優先度分類(MoSCoW)

- **Must**: 上記 In Scope 18項目すべて(17項目+仕様変更 B の追加1項)。公開契約を完結させる能力に中間分類を置かない(cid:scope-definition:c2 先例)。
- **Should / Could**: なし。
- **Won't**: 上記 Out of Scope 5群(自動追加の撤回を反映済み)。

## シーケンス方針(Q2 裁定: risk-first — 改訂後も不変)

feasibility-assessment の R-3(`updateProjectV2ItemFieldValue` mutation 未実測 = live risk)を最初に潰す:

1. **Walking skeleton(最初の Bolt)**: 単一の設定済み Project・既定フェーズマッピングで「(未所属なら)item 追加 → Status フィールド/選択肢解決 → 現在フェーズ対応 Status への mutation → receipt 記録」の最小 end-to-end を実証。追加(addProjectV2ItemById)と更新(updateProjectV2ItemFieldValue)両 mutation の成立(および落ちる実証)をここで確定する。前提: 実 Project #5 の選択肢再構成または上書き設定(R-2 — 解決不能の間は safety-blocked が正しい挙動であり、その観測自体も skeleton の検証面)。
2. **幅の拡張**: phase boundary での遷移同期(全フェーズ)、複数 Project 独立同期、Status 名上書き設定、pending/safety-blocked の収束セマンティクス。
3. **診断と仕上げ**: repair status 拡張(現在フェーズから期待 Status 導出)、認証ドキュメント、テスト完備、dist 再生成。

ハード期限なし(ソロ運用 — intent-statement の Target Customer 節より)。
