# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、Skill Contract consumer integration の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
詳細な Domain Design、Logical Design、実装設計、テスト設計は Construction で確定する。

## 設計戦略

- validator が参照できる `skill-contracts.ts` を生成物として追加する。
- evaluator や review が参照する契約項目を catalog 側に明示する。
- decision review は、判断に必要な prerequisites、invariants、postconditions、read/write boundary を入力にできるようにする。
- learning review は、feedback conditions と follow-up 候補を入力にできるようにする。
- validator の `passed` は内容承認ではなく構造検出として扱う。

## 責務境界

- 所有するもの: Skill Contract 生成 TypeScript の参照入口、review 入力としての契約項目、validator と evaluator の責務境界。
- 所有しないもの: validator による内容承認、evaluator の本格的な品質採点、#257/#259 の全実装。
- 依存してよいもの: U001 の Skill Contract catalog、U002 の生成物、Issue #257、Issue #259。
- 後続で再確認が必要になる条件: #257 または #259 の実装側が追加契約項目を要求する場合。

## 構成候補

- validator 参照入口。
- evaluator 入力候補。
- decision review 入力候補。
- learning review 入力候補。
- 構造検出と品質評価の境界説明。

## データと契約候補

- Validator: 生成物の存在、構造、参照入口。
- Evaluator: 契約項目と実行結果の品質評価入力。
- decision review: prerequisites、invariants、postconditions、read/write boundary。
- learning review: feedback conditions、follow-up issue/intent candidates。

## 検証観点

- `skill-contracts.ts` が validator から import 可能な形で生成される。
- #257 と #259 が参照できる契約項目が生成物に含まれる。
- 構造検出と品質評価の境界が文書化されている。

## Bolt 分割方針

- B003 で、validator、evaluator、decision review、learning review の Skill Contract 参照入口を追加する。

## Construction への引き継ぎ

- consumer の入口は最小にし、#257/#259 の詳細実装は後続 Intent の責務とする。
- 内容承認を validator の責務にしない。
