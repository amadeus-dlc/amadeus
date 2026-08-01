# Constraint Register — OTel Upstream 統合

上流入力（consumes 全数）: `intent-statement.md`（参照済み）、`competitive-analysis.md`（不存在）、`market-trends.md`（不存在）、`build-vs-buy.md`（不存在）

## 技術的制約

| ID | 制約 | 由来 |
|---|---|---|
| TC-1 | Bun-only 配布を維持する。短命 process からネットワーク通信しない（Collector への network flush 禁止） | #1672 採用方針・非目標 |
| TC-2 | 依存は単一 bundle へ取り込み、追加理由を ADR に文書化する（runtime dependency 追加の文書化要件） | project.md Forbidden、Q3 回答 |
| TC-3 | 正本は `packages/framework/core/` のみ。`.claude/`・`.codex/` 等の harness 面と `dist/` は直接編集せず package/promote で再生成する | AGENTS.md、#1672 移行設計 |
| TC-4 | audit JSONL の保存面と状態機械上の責務を維持する（reader-first、mixed schema merge、retention 条件達成後に v1 reader 削除） | #1672 移行戦略 |
| TC-5 | canonical Event の失敗契約は「同期例外＋process-local fatal health latch」の二重防御。latch は process 内で解除しない | #1672 失敗契約 |
| TC-6 | 機微情報（prompt、argv、credential、無許可パス）を Signal Stores へ流さない | #1672 完了条件 |

## 組織的制約

| ID | 制約 | 由来 |
|---|---|---|
| OC-1 | 決定者は Intent オーナー（solo 運用）。全ゲートはオーナー承認 | stakeholder-map.md |
| OC-2 | 期間・マイルストーンの制約なし。長寿命 Intent として session を跨ぎ resume で進める | Q5 回答 |
| OC-3 | 競合 intent・変更凍結なし（2026-07-29 時点のユーザー回答） | Q6 回答 |
| OC-4 | 6 Phase（#1673-#1678）は 1 Intent で扱い、並行化は Unit/Bolt のみで行う（複数 Intent 分割は採用しない） | intent-capture Q5、project.md ## Way of Working（c4-2） |

## 規制・コンプライアンス制約

該当なし — 社内開発基盤の改善であり、PCI/HIPAA/SOC2/データレジデンシー等の外部規制は適用範囲外。機微情報の telemetry 非流出（TC-6）は内部セキュリティ要件として扱う。
