# Feasibility Assessment — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md, competitive-analysis.md, market-trends.md, build-vs-buy.md

## Technical Viability

**総合判定: Feasible(実現可能)、ただし自動検出の網羅性に制約あり。**

intent-statement.md が示すとおり、対象は `amadeus-state.md` 冒頭または各ステージ `memory.md` への構造化フィールド追加、および検出ロジックの実装である。build-vs-buy.md の結論(Build)を踏まえ、既存の Amadeus TypeScript/Bun スタック内で完結する。

### 実測根拠(feasibility-questions.md Q1 より)

| ハーネス | 検出可能性 | 実測根拠 |
|---|---|---|
| Claude Code | 高 | 現行セッションの `env` に `CLAUDECODE=1`、`CLAUDE_CODE_SESSION_ID`、`CLAUDE_CODE_ENTRYPOINT=cli` 等が実在(`env \| grep CLAUDE` で直接確認) |
| Codex | 中(条件付き) | `~/.agents/skills/agmsg/scripts/drivers/types/codex/codex-bridge.js:155` が `process.env.CODEX_THREAD_ID` を読む実装が既存。ただし agmsg app-server ブリッジ(monitor モード)経由でのみ設定される可能性があり、素の codex CLI 起動時の挙動は未確認。`CODEX_HOME` は install path であり session marker ではない(`packages/framework/core/tools/amadeus-utility.ts:589` で install-path 用途のみ確認) |
| Cursor / OpenCode / Kiro | 低(未確認) | 本リポジトリの `packages/framework/core/tools/`、`dist/{cursor,opencode,kiro,kiro-ide}/` を grep したが、該当ハーネス固有の env var 参照実装が見つからない。自動検出できない場合は手動記入へのフォールバックが必要(Issue #1452 の「手動記入は最終手段」の優先順位どおり) |

## Risk Analysis

- **主リスク**: cursor/opencode/kiro の自動検出手段が未確立のため、これら3ハーネスでは「検出できず未記入」または「手動記入」に頼らざるを得ない。緩和策: requirements-analysis 段階で「検出不能時は `unknown`/`manual` 値を許容するフィールド設計」を要件として固定する
- **副次リスク**: codex の `CODEX_THREAD_ID` が agmsg 経由セッション限定である場合、素の codex CLI 利用者には効かない。緩和策: requirements 段階で codex 側の実機検証(feasibility では実施済み範囲を明示するに留め、確定は requirements/design で行う)を明示的なタスクとして残す
- **非リスク**: 本機能は既存スキーマへの非破壊的追加であり、既存の gate/センサー機構・監査シャード形式への後方互換性を壊さない設計とする(要件段階で明示)

## Constraint Summary

feasibility-questions.md Q2-Q6 のとおり、規制・予算・組織的障壁・AWS 依存はいずれも N/A。技術的制約は上記の自動検出網羅性のみ。
