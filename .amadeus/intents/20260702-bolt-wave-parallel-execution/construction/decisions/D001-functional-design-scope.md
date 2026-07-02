# D001: Functional Design scope

## 背景

U001 Bolt wave 実行契約は、Inception の Unit Design Brief で設計戦略（依存表からの導出、新状態フィールドなし、公開入口 1 箇所定義、直列既定の維持、policy 一般形参照）まで確定しており、Construction の入口で契約の文言と挿入位置が未確定として残っていた。

## 判断

U001 の Functional Design を必須（`requirement: required`、`frontendSurface: absent`）にし、core 3 文書を作成する。
次を Functional Design で確定した。

- 挿入位置は `skills/amadeus-construction/SKILL.md` の `内部プロセス` の直後に新見出し `Bolt の wave 実行` を置く（BR001）。
- wave の導出規則は「依存がすべて前の wave までに完了する Bolt の集合を wave 1 から順に導出」とし、循環時は補修へ戻す（BR002）。
- wave 並行の適用条件と直列既定を明記する（BR003）。
- worktree 運用は対象 workspace の steering policy への一般形参照とする（BR004）。
- wave 完了時の統合と検証、まとめ承認の運用を定義する（BR005、BR006）。

## 理由

wave の導出材料と運用前提が既存成果物として確定しており、Functional Design はそれらへの準拠として確定できるため。

## 影響

B001 の Task 分解はこの設計を根拠にする。
Domain Map と Context Map は更新しない（BC001 既存境界内の契約追加）。
