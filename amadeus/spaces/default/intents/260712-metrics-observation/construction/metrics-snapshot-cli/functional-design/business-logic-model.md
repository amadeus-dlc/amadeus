# Business Logic Model — U2: metrics-snapshot-cli

## フロー(--write)

1. collector 配列を順次実行(各 collect は Result 型を返す — 例外は境界で捕捉して CollectorError へ)
2. 全成功 → Snapshot を組み立て(schema_version=1 / captured_at=UTC now / commit=`git rev-parse HEAD` / collectors)
3. temp ファイルへ serialize → `metrics/<captured_at をファイル名安全化>.json` へ rename(アトミック)
4. verdict 1行(OK/件数/パス)+ exit 0
5. いずれか失敗 → 書き込みなし・FAILED [COLLECTOR: name] 1行・exit 1(fail-fast: 最初の失敗で停止 — 部分実行の副作用なし)

## --check(dry-run)

collect のみ実行し書き込みなし。verdict CHECK OK/FAILED。

## collector 個別(型は domain-entities)

- ccn: runLizard()(complexity-gate export)→ 関数数・分布(p50/p90/max)・over_threshold(CCN_BLOCK_THRESHOLD 参照 — 数値の再定義禁止)
- coverage: coverage/coverage-totals.json を読む(不在 = fault)
- loc: git ls-files + 行数走査(core/scripts/tests 別)
- tests: coverage/tests-totals.json を読む(U1 契約4キー、不在 = fault)
- test_pyramid: **classifyTestSize(tests/lib/test-size.ts:49)による静的走査**(テストファイルを glob して tier×size を自己完結で集計 — reviewer F5 の二択のうち静的側。test-size-report.json(動的・部分実行で不完全)は読まない: 実行有無への依存と追加 fault 契約を作らないため)
- dist_size: dist/ 再帰バイト合計
