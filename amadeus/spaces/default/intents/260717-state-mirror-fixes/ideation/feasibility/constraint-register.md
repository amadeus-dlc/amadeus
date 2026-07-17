# Constraint Register — 260717-state-mirror-fixes

上流入力(consumes 全数): intent-statement.md

## 技術的制約

| ID | 制約 | 出典 | 影響 |
|---|---|---|---|
| T1 | Bun-only: 配布フレームワークへ runtime dependency を追加しない | project.md Forbidden | #1170 修正は既存 Bun/TS 内で完結させる |
| T2 | 正本は `packages/framework/core/`、`dist/<harness>/` は手編集禁止 — `bun scripts/package.ts` + `bun run promote:self` で同期 | project.md Mandated/Forbidden | #1170 は正本編集+全生成面の再生成が必須(dist:check / promote:self:check green) |
| T3 | gh CLI 依存は `scripts/` 配下の repo ローカルツールに限定 | project.md gh-scripts-boundary | #1172(scripts/amadeus-mirror.ts)は許容域内。配布面へ持ち込まない |
| T4 | bun --coverage は spawn 先を計測しない — hooks/CLI は in-process seam でテスト | team.md bun-coverage-spawn-blindspot / local-lcov-pre-push | #1170 のガードは seam 化した純関数+in-process 駆動で設計(intent-statement の Success Metrics のテスト実現条件) |
| T5 | state 書き込み経路の変更は audit-first 原則(state は audit から再構成可能)を壊さない | Issue #1170 本文(audit は全期間健全)・docs/reference/12-state-machine.md | ガードは書き込み側の抑止であり audit 形式に触れない |
| T6 | 検証・ゲートの結果を実行結果から導出しない構築(検証劇場)は禁止 | org.md Forbidden | #1170 ガードの「落ちる実証」必須(Mandated) — 後退書き込みを注入して赤を実測 |

## 組織的制約

| ID | 制約 | 出典 | 影響 |
|---|---|---|---|
| O1 | 本 intent は Ideation まで実施して park。Construction 進入はユーザー決定 | leader 割当 17:32:09Z・issue-selection-user-decides | inception 以降の作業をこの intent 内で先行しない |
| O2 | ステージゲートは delegate-approval 経由の auto 承認、PR マージはユーザー承認後に leader 執行 | team.md auto-gate-approval / no-AI-merge | 執行手順は既存フローに従う |
| O3 | 同時アクティブ builder は 1 intent あたり最大4 | team.md parallel-bolts | Construction 設計時の並行度上限(本 intent は2 Issue で小規模のため実質影響なし) |

## 規制的制約

**該当なし** — feasibility-assessment.md の規制スキャン参照(PII・決済・医療・輸出規制データを扱わない。project.md に規制要件の記載なし。反証可能根拠: 質問ファイル Q2)。
