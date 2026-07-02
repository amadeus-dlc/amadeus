# Domain Entities

## 目的

Bolt wave 実行契約で扱う概念を、文書作成と検証で同じ名前で参照できるようにする。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Wave | 依存がすべて前の wave までに完了する、並行実行できる Bolt の集合を表す。`bolts.md` の依存表から導出され、`state.json` に保存されない順序判断である。 | BL001, BR002, BR007 |
| DE002 | Wave Derivation | 依存表からのトポロジカルレベル導出と、循環時に補修へ戻す扱いを表す。 | BL001, BR002 |
| DE003 | Wave Execution | worktree 分離での並行実行と、同一 worktree での直列維持を表す。 | BL004, BR004 |
| DE004 | Wave Integration | wave 完了時の並行 branch の統合、共有成果物の整合、標準検証、次の wave への進行条件を表す。 | BL005, BR005 |
| DE005 | Wave Batch Approval | wave 単位の Bolt 実行準備のまとめと、Bolt ごとの Task Generation Gate 契約を維持したまとめ承認を表す。 | BL003, BR006 |

## 関係

- DE002 Wave Derivation が DE001 Wave を導出し、DE003 Wave Execution と DE005 Wave Batch Approval は DE001 を単位に動く。
- DE004 Wave Integration は DE003 の完了を受けて実行され、次の DE001 Wave の実行準備の前提になる。
- DE005 Wave Batch Approval は、Task Generation Gate 契約（Intent 20260702-phase-gate-approval-contract の所有）を変更せず運用として重ねる。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | Domain Map | 反映候補なし。BC001 自己開発運用の既存境界内の Construction 実行契約の追加である。 | 反映しない | [D003](../../../inception/decisions/D003-single-unit-exception.md) |

## 未確認事項

なし。
