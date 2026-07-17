# Initiative Brief — 260717-state-mirror-fixes

上流入力(consumes 全数): intent-statement.md, scope-document.md, intent-backlog.md, feasibility-assessment.md, constraint-register.md

## Intent と問題(intent-statement.md 要約)

amadeus フレームワークの dogfooding で実測された2欠陥の fix バッチ:

- **#1170(P2/S3)**: 並行セッションの sync-statusline フックが古いスナップショットで共有 amadeus-state.md を巻き戻す(3回実測・書き手特定済み・機序コード裏付け済み。learnings gate 誤拒否の実害、手動修復を強いられる)
- **#1172(P3/S4)**: amadeus-mirror の状態行分母にスコープ SKIP ステージが混入(`approved 18/32` 誤表示。mirror #1179 でライブ再現中)

## 市場検証サマリ

N/A — 社内フレームワークの不具合修正であり市場調査は amadeus スコープの SKIP 対象(質問ファイル Q4)。需要の根拠は dogfooding 実測(同日3回再発)とユーザーの着手指示そのもの。

## 実現可能性とリスクのハイライト(feasibility-assessment.md 要約)

- 総合判定 **GO** — 両欠陥とも機序実測済み・修正案具体化済み・既存 Bun/TS スタック内で完結
- 主リスク: R1 過剰ガード(前進書き込みまで抑止)→ 設計段で判定基準明確化+両側実測 / R4 state 修復の実施単位 → 設計段確定(constraint-register T1-T6 の横断制約下)

## スコープ境界(scope-document.md 要約)

- In: B1 state-regression-guard(#1170)/ B2 mirror-skip-denominator(#1172)/ B3 mirror-issue-tool-state-repair(修復)の3 proto-Unit(intent-backlog.md)
- Out: state 書き込み機構の一般再設計、mirror 機能拡張、他 Issue 同乗
- 順序: priority-vs-dependency 既決適用(P2 先頭、P3 同乗、検証のみ B3 依存)

## コンセプトビジュアル

N/A — UI なしの内部修正(rough-mockups は SKIP。質問ファイル Q4)。

## チームプラン

現行 amadeus チーム(leader+e1〜e4)で追加リソース不要。Construction 時は builder/レビュアーの役割分担を既存ノルム(role-model・parallel-bolts 上限4)で運用。

## Go/No-Go 推奨

**Go(条件付き)** — Ideation 成果物は完備し実現可能性は GO。ただし本 intent は leader 割当により Ideation 完了で park し、**Construction 進入の実行判断はユーザー決定**(issue-selection-user-decides)に委ねる。推奨: 両 Issue ともクロスレビュー成立済み・修正案具体化済みのため、着手承認が得られ次第 Inception へ進む価値がある。
