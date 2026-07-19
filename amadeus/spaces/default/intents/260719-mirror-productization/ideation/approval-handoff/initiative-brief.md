# Initiative Brief — mirror-productization

> 上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md、scope-document.md、intent-backlog.md

## 一言で

チーム内実証済みの intent ミラー Issue ツール(amadeus-mirror)をフレームワーク配布物へ昇格し、リカバリー SKILL と phase 境界の自動/確認同期(3層 config 制御)で「共有面の鮮度維持」を workflow に組み込む。

## 価値仮説

record 正本・Issue 共有面という intent-first 運用は実証済みだが、同期が leader の手作業に依存している。配布+engine 組込により (1) 同期漏れの構造的排除 (2) 乖離時の診断入口(status)(3) 他プロジェクト・他ユーザーへの展開、を得る。

## スコープ骨子(scope-document より)

- In: ツール移設(S-01)/status verb(S-02)/SKILL(S-03)/3層 config(S-04)/phase 境界 ask(S-05)/auto-mirror=sync のみ(S-06)/gh optional ノルム改定(S-07)— 全 Must
- Out: 既存設定移行・マシンローカル層・トラッカー抽象化・mirror 本文拡張・auto での create/close
- Bolt: Bolt 1 = S-01〜03 縦スライス(単独ゲート)、Bolt 2+ = S-04→S-05/06。S-07 は Bolt 1 マージ前提として先行

## リスク要点(raid-log より)

R-1 engine 変更のテスト影響(C-08 棚卸しで緩和)/ R-2 CI の gh 不在(モック化)/ R-3 config 解決の曖昧化(初版テスト固定)/ R-4 sync と record 未コミットの競合(発火位置を design で確定)

## リソース確約(Ideation の範囲まで)

Inception の分析はユーザー直接対話方式で本セッション続行可(P-02)。Construction の staffing・schedule は Delivery Planning で承認する(Team Formation SKIP のため named mob は確約しない — approval-handoff:c3)。競合分析・wireframes 等の SKIP 上流成果物は補完しない(approval-handoff:c4)— 代替の内部証拠は feasibility の leader 実測(F-1〜F-5)。

## 次の decision point

1. ideation 完了時: ミラー Issue 起票(ユーザー承認)
2. Inception 続行 or park(ユーザー判断)
3. 実装着手(issue-selection-user-decides)
