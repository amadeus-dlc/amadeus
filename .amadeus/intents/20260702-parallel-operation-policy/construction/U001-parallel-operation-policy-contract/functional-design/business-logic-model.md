# Business Logic Model

## 目的

並行運用の都度判断を、steering policy の判断基準を参照する判断へ置き換えられるようにする。

## 対象 Unit

U001 並行運用ポリシー契約。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | 候補 Issue の変更対象（skill、ファイル群、promote 単位）と進行中 Intent の変更対象を突き合わせ、接触面の有無から並行可否を導く。 | 候補 Issue、進行中 Intent の実装対象と Bolt | 並行可否の判断 | R001, UC001 |
| BL002 | 並行を worktree 単位（Intent 単位）で割り当て、同一 worktree 内の Bolt と検証は直列に実行する。 | 並行可否の判断 | worktree 割り当てと実行順序 | R004, UC001 |
| BL003 | マージ後は `origin/main` の追従、共有インデックスの再生成、標準検証の順で共有成果物を整合させる。 | マージイベント | 整合した共有成果物 | R002, UC002 |
| BL004 | 承認待ちキュー一覧で承認待ちを一望し、複数件はまとめて承認処理する。承認のたびに承認判断を decision に記録し、承認 evidence を `state.json` に追加する。 | 承認待ちキュー一覧の出力 | 承認済み gate 状態と承認記録 | R003, UC003 |
| BL005 | 実装やマージが先行して承認記録が取り残された場合は、遡及承認として承認判断を decision に記録し、`state.json` を補正してから finalization へ進む。 | 承認記録のない完了作業 | 補正済みの承認記録と state | R003, UC003 |
| BL006 | 参照したい判断が単一 branch の lifecycle なら Git Branching Policy、複数 worktree の並行判断なら並行運用ポリシーを選ぶ。 | 判断の種類 | 参照先 policy | R005, UC004 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| 候補 Issue と進行中 Intent の変更対象 | 実装対象（repository、path）、Bolt、PR から読む接触面の判断材料。 | R001 |
| 承認待ちキュー一覧の出力 | `GateQueueList.ts` による承認待ちの Intent、phase、ゲート、待ち理由。 | R003 |
| マージイベント | 並行 branch の統合契機。 | R002 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| policy を根拠にした並行判断 | Intent 成果物、PR 説明、decision から policy を参照できる状態。 | Maintainer、Agent、Reviewer |
| 整合した共有成果物 | 追従、再生成、検証を経た `intents.md` などの共有成果物。 | Agent、validator |
| 承認記録 | 承認判断の decision と `state.json` の approval evidence。 | Maintainer、validator |

## 未確認事項

なし。
