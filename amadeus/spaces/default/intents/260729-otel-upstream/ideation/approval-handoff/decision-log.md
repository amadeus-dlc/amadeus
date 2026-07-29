# Decision Log — Ideation Phase

上流入力（consumes 全数）: `intent-statement.md`、`scope-document.md`、`intent-backlog.md`、`feasibility-assessment.md`、`constraint-register.md`（参照済み）、`competitive-analysis.md`（不存在）、`team-assessment.md`（不存在）、`wireframes.md`（不存在）

Ideation で確定した全決定。各決定は質問票の回答（ユーザー直接回答、HUMAN_TURN 実測）に由来する。

## intent-capture

| # | 決定 | 根拠 |
|---|---|---|
| IC-1 | 問題は因果の不正確さ・語彙の乖離・Context の分断の3点が同等 | Q1-D |
| IC-2 | 顧客は利用チームと保守者の両方 | Q2-C |
| IC-3 | 成功指標は因果の正確性・基盤単一化・耐性維持のすべて必須 | Q3-D |
| IC-4 | トリガーは「本来の意味での可観測性の獲得」（現行は半分の達成） | Q4 自由記述 |
| IC-5 | 6 Phase を 1 Intent で扱い、並行化は Unit/Bolt | Q5-A → project.md ## Way of Working（c4-2）へ persist |
| IC-6 | Phase 1 不合格なら撤回。恒久 dual upstream に妥協しない | Q6-A |

## feasibility

| # | 決定 | 根拠 |
|---|---|---|
| F-1 | Logs API 採否は Phase 1 ADR 確定まで仮説扱い。両案を skeleton で実測比較 | Q1-A |
| F-2 | 既製 Context Manager が Bun で動く仮説。不成立時は撤回せず Adapter 実装へ切替 | Q2-A |
| F-3 | 依存は単一 bundle へ取り込み、追加理由を ADR に文書化 | Q3-A |
| F-4 | 性能は現行同等とみなし Phase 1 実測で数値化 | Q4-A |
| F-5 | 期間制約なし。長寿命 Intent として resume で進める | Q5-A |
| F-6 | 組織的ブロッカーなし（競合 intent・変更凍結なし） | Q6-A |

## scope-definition

| # | 決定 | 根拠 |
|---|---|---|
| S-1 | Out = #1672 非目標6件で確定 | Q1-A |
| S-2 | MoSCoW: Must = Phase 1-4／Should = Phase 6／Could = Phase 5 | Q2-A |
| S-3 | シーケンシングは risk-first（hard gate で最大リスクを最初に潰す） | Q3-A |
| S-4 | 最初の価値スライスは Phase 1 の walking skeleton 自体 | Q4-A |
| S-5 | Unit 粒度は Phase 内 module 単位、Phase 間は直列依存 | Q5-A |

## approval-handoff

| # | 決定 | 根拠 |
|---|---|---|
| AH-1 | Go — Inception へ進む | Q1-A |
| AH-2 | RAID R-1〜R-6 と対応を受容 | Q2-A |
| AH-3 | 体制は solo オーナー＋conductor。並行化は swarm | Q3-A |
| AH-4 | go は「Phase 1 までの go」。Phase 2 以降は合格時に再判断 | Q4-A |
