# D001: Inception の所有境界

## 背景

Issue #352 は、wave 単位の並行実行契約を Construction skill から読めるようにすることを求める。
既存コードには、wave の導出材料（`bolts.md` の依存表）、運用前提（並行運用ポリシー）、まとめ承認の先例（#334 D003）、直列前提の既存契約と e2e eval がある。

## 判断

Inception の所有境界を brownfield（既存の Construction skill 契約に載せる）として固定する。

対象は、`amadeus-construction` SKILL.md への wave 実行契約の定義（導出、実行、統合、まとめ承認、直列既定）、promote 同期、既存検証の非破壊確認である。

対象外制約として次を固定する（scope.md の SC-OUT-001 から SC-OUT-004）。

- 複数人での Bolt 分担。
- リモート実行基盤。
- 複数人チームでの並行と複数 workspace での組織利用。
- 新しい phase や人間ゲートの追加（既存の Task Generation Gate の契約を変えない）。

## 理由

wave の導出材料、運用前提、承認先例がすべて既存成果物として揃っており、既存契約への追加として設計するのが最小であるため。

## 影響

Unit Design Brief は既存契約の維持（内部 skill 不変、直列既定）を前提に書かれ、Construction の Functional Design は契約の文言と挿入位置の確定に集中できる。
