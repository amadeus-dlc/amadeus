# Constraint Register — amadeus-mirror ツール

上流入力(consumes 全数): intent-statement.md(intent-capture)

## Technical Constraints(技術制約)

- C1: bun 直接実行の TypeScript、追加 runtime dependency 禁止(project.md Forbidden 準拠)
- C2: 状態は決定的ソース(summary --json / intents.json / amadeus-state.md)からのみ読む — LLM 側で数えない(intent-statement の設計原則)
- C3: 同期は record → Issue の一方向。Issue 側の編集は正本に影響しない(team.md cid:intent-first-mirror-issue)
- C4: close は着地機械検査(intent 完了状態の実測)不成立時 exit 1 で拒否(Q2 裁定)
- C5: ミラー本文は定型3要素(概要+record リンク+状態行)のみ。日本語(issues-in-japanese)

## Organizational Constraints(組織制約)

- C6: 配置は repo ローカル `scripts/`(Q1 裁定)。framework 昇格は別 intent
- C7: close 呼び出しの可否は人間確認後(no-AI-merge と同系の P4 運用契約)
- C8: 本 intent は ideation まで実行して park(試運転)。クロスレビューは park 時の record PR(intent birth PR)で実施(Q5 裁定)

## Regulatory Constraints(規制制約)

- なし(N/A 根拠: 公開 Issue メタデータのみ、compliance 観点の実測は feasibility-assessment.md 参照)
