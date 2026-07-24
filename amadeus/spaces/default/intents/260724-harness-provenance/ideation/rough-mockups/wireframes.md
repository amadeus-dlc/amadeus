# Wireframes (System Context) — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md, scope-document.md, intent-backlog.md

## N/A(UI ワイヤーフレーム)

本 intent は非 UI(CLI/データスキーマ)であり、視覚的ワイヤーフレームは N/A とする(cid:requirements-analysis:ui-less-mockups-as-output-contract)。代わりにシステムコンテキスト図を示す。

## System Context Diagram

```
+-------------------+       env var 実測        +----------------------+
|  AI ハーネス       | -------------------------> | ハーネス検出ロジック  |
|  (claude-code /    |   (例: CLAUDECODE=1)       |  (新規実装)          |
|   codex / cursor /  |                            +----------------------+
|   opencode / kiro)  |                                       |
+-------------------+                                        | 検出結果 (harness id | "unknown")
                                                                v
                                                    +----------------------+
                                                    | amadeus-state.ts /   |
                                                    | amadeus-lib.ts       |
                                                    | (既存 read/write     |
                                                    |  ヘルパー再利用)      |
                                                    +----------------------+
                                                                |
                                            +-------------------+-------------------+
                                            v                                       v
                                +----------------------+              +----------------------+
                                | amadeus-state.md      |              | stage memory.md       |
                                | 冒頭フィールド         |              | フロントマター相当     |
                                +----------------------+              +----------------------+
```

## 出力契約(verdict 別)

| verdict | 出力文言(例) | exit code |
|---|---|---|
| 検出成功 | `harness: claude-code (detected via CLAUDECODE env var)` | 0 |
| 検出不能(フォールバック) | `harness: unknown (auto-detection unavailable; falling back to manual)` | 0(非致命 — 既存の既習様式に倣い warn 相当) |
| 記録先ファイル不在等の異常 | `error: cannot write harness field to <path>: <reason>` | 1 |

既習様式: 既存の `amadeus-state.ts` CLI が採用する `{"error": "..."}` 形式(JSON 出力)または plain stdout メッセージのいずれかは、requirements/design 段階で既存コマンドとの整合を確認して確定する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-24T11:19:48Z
- **Iteration:** 1
- **Scope decision:** none

rough-mockups.md が要求する非UI成果物(system context diagram + key interaction flow sketches)を wireframes.md / user-flow.md が満たしており、intent-statement.md / scope-document.md / intent-backlog.md との内容整合も取れている。軽微な指摘のみで、ブロッカーはない。

### Findings

- 良い点: cid:requirements-analysis:ui-less-mockups-as-output-contract の適用が適切。UIを新規発明せず、verdict別の出力文言+exit code表とsystem context diagram+interaction flow diagramの組み合わせで非UI要件を充足している。
- 良い点: 3成果物すべての冒頭に上流入力行がconsumes全数を列挙しており、upstream-coverageセンサーの機械検査を満たす見込み。
- 良い点: scope-document.mdのin-scope項目とwireframes.md/user-flow.mdの描写が矛盾なく対応している。
- 軽微(要確認): 運用モード(team/solo)の実態を確認し、記述が実態と齟齬をきたさないか conductor 側で確認することを推奨(ブロッカーではない)。
- 軽微: no-election-judgment-gate の申告が1問1行形式ではなく地の文の1段落。内容は充足しているため軽微な様式指摘。
- 軽微: wireframes.mdの出力契約表でexit codeの断定と未確定の注記が同居している箇所は、並記の順序をもう一段明確にすると良い(任意の改善提案)。
