# Code Generation Plan — U2 span-attrs(Bolt 2a)

上流入力(consumes 全数): functional-design 3成果物、nfr-design 5成果物、requirements.md FR-SPAN-1〜3 / FR-SUB-4 — resolver 6キー閉語彙・両キー省略 fail-open・merge 後勝ち・短命プロセス memo を FD から、決定的テスト形を nfr-design から導出。

## 実行形態

gated swarm batch 2(U2/U3/U5 並列、worktree `bolt-span-attrs`、base = origin/main #1899 着地後)。TDD 必須・PR 1本・NFR-4 同一変更。

## 経過(実績)

1. builder が**実装前停止** — 契約どおりでは6キーが DEFAULT_REDACTION_POLICY の default-deny により store/Relay 境界で全数 drop される実測(検証劇場クラス)を検出
2. **E-OMSB2A-DEV**(2-0)で案A(safeKeys へ6キー追加)を裁定。条件 = (a) JSONL 実文字列での6キー生存 assert (b) credential 形 agent.id の scrub assert を必須受け入れ基準化
3. 裁定後に実装再開 — span-context.ts 新設、tracer-provider 配線(resolver 先置き・後勝ち merge)、redaction.ts へ SPAN_CONTEXT_ATTRIBUTE_KEYS(層コメント付き)
