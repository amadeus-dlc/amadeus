# Feasibility Assessment — 260706-harness-codex（Issue #552）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

## 技術的実現可能性

| 観点 | 評価 | 根拠（実測） |
|---|---|---|
| 上流対応物の実在 | 高 | 上流 b67798c3 に `harness/codex/`（emit.ts、hooks adapter、manifest 等）と `dist/codex/.agents/skills/aidlc-*/agents/openai.yaml`（38 件）が実在する |
| 取り込み内容の単純さ | 高 | openai.yaml の内容は guard（`policy: allow_implicit_invocation: false`）で小さい。適応は rename 契約（aidlc-* → amadeus-*、/aidlc → /amadeus）の機械的置換で足りる |
| 既存 tooling との整合 | 高 | promote-skill.ts の alwaysAllowedDirs に "agents" が実在し、`skills/amadeus-*/agents/` は既存 promote 経路に乗る（Q6 = B の場合、新規機構が不要） |
| 純正性検証（#541） | 高 | fresh clone + provenance 照合の手順は #428（上流同期）で実績あり。基準 commit b67798c3 は parity-baseline の baselineCommit と一致 |
| Phase 2 との分離 | 高 | Phase 1 は追加のみ（既存ファイルの移動なし）で、#526 級の大移設を伴わない。設計確定成果物（本ステージの questions + decision）が Phase 2 の入力になる |

## 実現方式の要点

1. 上流 `dist/codex` の openai.yaml 群を fresh clone から取得し、skill 名を amadeus 名へ写像して取り込む（写像は parity-map の skillNameMapping / nameMappings を参照）。
2. 配置は設計論点 Q6 の確定に従う（ピア協議中）。
3. `harness/codex/` を新設し、ハーネス契約（Codex の skill 発見規則 = `.agents/skills/`、openai.yaml の役割）と取り込み provenance（基準 commit、適応規則）を記録する。
4. 検証は validator + `npm run test:all` + parity:check（openai.yaml の parity への載せ方は Q3/Q6 の確定に従い宣言）。

## スケジュール・リソース

- 単一 worktree（engineer4）で直列実施。ピア協議 1 回（設計論点 6 問）+ 接触面確認（engineer3、Q6 = B の場合は協議で兼ねる）。
- Phase 2 は後続 Intent（#526 と同じ単独実行枠。起案は人間と leader）。

## 結論

実現可能。ブロッカーなし。設計論点 6 問の確定（ピア協議、[feasibility-questions.md](feasibility-questions.md)）を待って scope-definition へ進む。
