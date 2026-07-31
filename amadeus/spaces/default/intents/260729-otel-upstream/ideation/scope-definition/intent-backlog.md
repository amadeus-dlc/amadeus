# Intent Backlog — OTel Upstream 統合

上流入力（consumes 全数）: `intent-statement.md`、`feasibility-assessment.md`、`constraint-register.md`（すべて参照済み）

MoSCoW 優先度付きの proto-Unit 一覧。Phase 間は直列依存（D = Dependency）、Phase 内 module は独立 Unit 候補（Q5 確定）。

## Must

| # | proto-Unit | Phase | 依存 | 価値 |
|---|---|---|---|---|
| B-01 | Phase 1 walking skeleton（Provider bootstrap・Local Exporters・失敗契約・Context 検証・性能計測） | 1 (#1678) | — | 撤回可否の判断材料となる最初の価値実証 |
| B-02 | Event Registry と drift guard（78 語彙の4集合一致） | 2 (#1676) | B-01 | 語彙 drift の CI 拒否 |
| B-03 | Journal schema v2 codec＋v1/v2 reader＋mixed shard merge | 2 (#1676) | B-01 | reader-first 移行の足場 |
| B-04 | AuditLogExporter＋LocalSpanExporter（同期 JSONL） | 2 (#1676) | B-01, B-02 | audit JSONL の唯一の生成経路 |
| B-05 | W3C Trace Context の子 process／subagent 伝播 | 3 (#1677) | B-01 | 因果の正確性（跨 process） |
| B-06 | doctor／recovery／presence／grant 等の reader 差替え | 4 (#1674) | B-03 | 既存ツール群の v2 対応 |
| B-07 | call site 段階移行（約1600箇所）＋call-site guard | 4 (#1674) | B-04 | 基盤の単一化 |
| B-08 | `appendAuditEntry()` 削除＋削除ゲート検証 | 4 (#1674) | B-07 | 移行完了の客観的判定 |

## Should

| # | proto-Unit | Phase | 依存 | 価値 |
|---|---|---|---|---|
| B-09 | Projector の OTLP Relay 縮退（推測ロジック削除、shadow 比較の撤収） | 6 (#1673) | B-07 | 推測なしの因果が完全に成立 |

## Could

| # | proto-Unit | Phase | 依存 | 価値 |
|---|---|---|---|---|
| B-10 | Metrics（Counter／Histogram subset）＋LocalMetricExporter | 5 (#1675) | B-01 | 集計値のローカル観測 |
| B-11 | diagnostic Logs＋LocalLogExporter（Trace Context 相関） | 5 (#1675) | B-01 | 診断ログの相関検索 |

## Value Stream

`intent-statement.md` の成功指標への写像:

- B-01 → 撤回可否判断（hard gate）
- B-02〜B-08 → 基盤の単一化（appendAuditEntry 直接 call site ゼロ）
- B-05 → 因果の正確性（跨 process 相関）
- B-09 → 因果の正確性の完全達成（推測の排除）
- B-10, B-11 → 耐性の維持を損なわない範囲での観測性拡張

依存の備考: B-02/B-03/B-04 は Phase 2 内で相互独立に切れる見込み（`constraint-register.md` TC-4 の reader-first 順序は実装順序の制約として残る）。B-10/B-11 は B-01 のみに依存し、Phase 2-4 と並行可能。
