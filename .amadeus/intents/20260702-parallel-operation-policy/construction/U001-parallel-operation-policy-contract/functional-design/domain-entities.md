# Domain Entities

## 目的

並行運用ポリシー契約で扱う概念を、文書作成と検証で同じ名前で参照できるようにする。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Parallel Operation Policy | 並行運用の判断基準（並行させる単位、共有成果物の統合、ゲート承認の運用、直列化）と根拠リンクを持つ steering policy を表す。 | BL001〜BL006, BR001 |
| DE002 | Contact Surface | 候補 Issue と進行中 Intent の変更対象の接触面（同一 skill、promote 単位、共有ファイルの同一行）を表す。並行可否の判断材料になる。 | BL001, BR004 |
| DE003 | Integration Procedure | マージ後の追従、再生成、検証の順序で共有成果物を整合させる手順を表す。 | BL003, BR005 |
| DE004 | Approval Queue Operation | 承認待ちキューの確認、まとめ承認、承認記録、遡及承認の運用を表す。 | BL004, BL005, BR006 |
| DE005 | Policy Boundary | Git Branching Policy（単一 branch の lifecycle）と並行運用ポリシー（複数 worktree の並行判断）の責務分担を表す。 | BL006, BR008 |

## 関係

- DE001 Parallel Operation Policy は、DE002 Contact Surface による並行判断、DE003 Integration Procedure、DE004 Approval Queue Operation、直列化の基準を判断基準の章として持つ。
- DE001 は DE005 Policy Boundary により Git Branching Policy と相互参照される。
- DE004 Approval Queue Operation は、承認待ちキュー一覧（Intent 20260702-gate-queue-visualization の成果物）を確認手段として参照する。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | Domain Map | 反映候補なし。BC001 自己開発運用の既存境界内の運用判断基準の追加である。 | 反映しない | [D003](../../../inception/decisions/D003-single-unit-exception.md) |

## 未確認事項

なし。
