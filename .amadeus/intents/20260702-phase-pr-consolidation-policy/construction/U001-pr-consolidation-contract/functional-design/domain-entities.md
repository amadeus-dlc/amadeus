# Domain Entities

## 目的

phase PR 統合契約で扱う概念を、文書変更とレビューで同じ名前で参照できるようにする。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Consolidation Condition | 統合を許可する 3 条件を表す。すべて満たす場合だけ統合を選べる。 | BR001, BR002 |
| DE002 | Consolidation Boundary | 統合できる範囲（仕様側 Discovery〜Inception）と、統合しない範囲（Construction 実装、finalization）を表す。 | BR003 |
| DE003 | Consolidated PR Record | 統合 PR の説明に含める記録項目（phase 成果物の一覧、各 phase の gate 状態）を表す。 | BR005, BR006 |
| DE004 | Default PR Unit | 既定の phase ごとの PR 運用を表す。統合条件を満たさない場合の戻り先になる。 | BR001 |

## 関係

- DE001 Consolidation Condition をすべて満たす場合だけ、DE002 Consolidation Boundary の仕様側グループを 1 PR にできる。
- DE002 の統合を選んだ PR は、DE003 Consolidated PR Record を必ず持つ。
- DE001 を満たさない場合は、DE004 Default PR Unit に従う。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | Domain Map | 反映候補なし。BC001 自己開発運用の既存境界内の運用条件の追加である。 | 反映しない | [D002](../../../inception/decisions/D002-bc001-reference.md) |

## 未確認事項

なし。
