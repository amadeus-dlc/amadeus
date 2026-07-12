# Domain Entities — U2(functional-domain-modeling-ts 様式)

- `CollectorResult` = { ok: true, name, tool, tool_version, values: Record<string, unknown> } | { ok: false, name, error: string } — 判別ユニオン
- `Collector` = { name: string, collect(env: CollectEnv): CollectorResult } — 一様インターフェース(配列駆動)
- `Snapshot` = { schema_version: 1, captured_at: string(ISO8601 UTC), commit: string, collectors: Record<name, values> } — 組み立てはスマートコンストラクタ(全 CollectorResult ok を型で要求)
- `CollectEnv` = { repoRoot, readFile, exec, listFiles } — 依存注入 seam(失敗注入テスト用・in-process 駆動用)
- test_pyramid collector の入力 = listFiles(tests/ glob)+classifyTestSize の静的分類(実行成果物への依存なし — F5 確定)
