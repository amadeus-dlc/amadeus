# Unit Test Instructions — 260814-ambient-error-sink

> 上流: `code-generation-plan.md` Step 1(TDD)と `code-summary.md` の FR 対応に基づく。新規テストは integration 層(unit 層は filesystem を触る medium test を許さない — codekb 制約)。

## 実行

- 新規回帰テスト: `bun test tests/integration/t544-ambient-projectdir-refusal.integration.test.ts`(4 ケース: env 段 ×3入口 + marker 段)
- 既存契約: `bun test tests/unit/t214-engine-error-logged-seam.test.ts`(#839)/ `bun test tests/integration/t258-engine-error-ambient-shard-pollution.test.ts`(#1389)
- フルスイート: `bash tests/run-tests.sh --ci`

## FR 対応

| FR | 検証 |
|---|---|
| FR-1 | t214 T5(runEngineMain)+ CLI spawn 系(t118/t248)green |
| FR-2 | t544 A/B/C(拒否 directive + ambient shard 空) |
| FR-3 | typecheck exit 0(handlePark: string) |
| FR-4/5 | t544 の red(0/4)→ green(4/4)実測 |
| FR-6 | t214/t258 無変更 green + フルスイート |
