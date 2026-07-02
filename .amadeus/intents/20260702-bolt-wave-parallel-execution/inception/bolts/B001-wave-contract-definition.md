# B001 wave 実行契約の定義

## 概要

公開入口 `amadeus-construction` の SKILL.md へ、wave 実行契約（依存表からの wave 導出、worktree 分離での並行実行、wave 完了時の統合と検証、wave 単位のまとめ承認、直列実行の既定）を定義し、promote で昇格先を同期する。

## 対象ユニット

- U001

## 設計

- [design.md](../units/U001-bolt-wave-execution-contract/design.md)

## 完了条件

- wave の導出規則（依存がすべて前の wave までに完了した Bolt の集合、循環時は導出せず補修へ戻す）が SKILL.md から読める。
- wave 単位の並行実行（worktree 分離、同一 worktree は直列）、統合、検証、次の wave への進行が SKILL.md から読める。
- wave 内の複数 Bolt のまとめ承認の運用が SKILL.md から読める。
- wave 並行の適用条件と、条件を満たさない場合の直列実行の既定が SKILL.md から読める。
- 内部 skill の契約と Task Generation Gate の契約は変更されない。
- source skill と昇格先が promote 手順で同期されている。

## 依存

なし。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-construction/SKILL.md` と `.agents/skills/amadeus-construction/SKILL.md` | 未確認 | なし | 未確認 |

## 未確認事項

- 契約の文言と挿入位置は Construction Functional Design で確定する。
