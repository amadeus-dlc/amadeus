# Constraint Register — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md, competitive-analysis.md, market-trends.md, build-vs-buy.md

## Technical Constraints

| ID | 制約 | 根拠 | 影響 |
|---|---|---|---|
| TC-1 | Claude Code は `CLAUDECODE=1` 等の env var で確実に自動検出できる | 実測(`env \| grep CLAUDE`、現行セッション) | 自動検出の第一候補として requirements で確定可能 |
| TC-2 | Codex の自動検出は `CODEX_THREAD_ID`(agmsg codex-bridge.js:155 の実装例)に依存しうるが、素の codex CLI 単体起動での有効性は未確認 | agmsg ソースコード実測、`packages/framework/core/tools/amadeus-utility.ts:589` の `CODEX_HOME` は install path 用途のみ | requirements/design 段階で実機検証が必要な未決事項として持ち越す |
| TC-3 | Cursor / OpenCode / Kiro の自動検出用 env var は本リポジトリ内に実装例がない | grep 実測(`packages/framework/core/tools/`、`dist/{cursor,opencode,kiro,kiro-ide}/`) | 自動検出できない場合、手動記入へのフォールバックを設計に含める必要がある |
| TC-4 | git commit の author は常に人間の git identity | Issue #1452 本文(既知の制約として明記) | ハーネス種別は commit メタデータではなく、Amadeus 独自の記録面(state/memory/audit)に持たせる設計とする |

## Organizational Constraints

なし(feasibility-questions.md Q5 のとおり N/A)。

## Regulatory Constraints

なし(feasibility-questions.md Q2 のとおり N/A)。

## Scope Constraints(Issue #1452 本文より)

- 過去 intent への遡及復元は非対象(既存 record に情報が残っていないため技術的に不可能)
- git commit author の書き換えは非対象
