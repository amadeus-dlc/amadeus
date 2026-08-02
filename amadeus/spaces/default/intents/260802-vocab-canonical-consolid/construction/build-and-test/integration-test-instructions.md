# Integration Test Instructions — vocab-canonicalization

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

- `code-generation-plan.md` の実行形態・完了条件と `code-summary.md` の実測値(PR #2044、head b783fe45c、検証表)を本書の前提として参照した

## 対象と実行

- `bun test tests/integration/t414-glossary-projection.integration.test.ts` — write/check round-trip(実 FS)、4投影面の drift 検出、旧面不在、マーカー区間異常(未閉包・対象欠落)
- 実測(conductor 独立再実行、head b783fe45c): **Ran 12 tests / 0 fail**(32 expect)
- スイート全体: `bash tests/run-tests.sh --ci` = **PASS(0 fail)**(builder 実測、リモート CI Tests ジョブでも green)

drift guard は blocking CI(FR-5b)。落ちる実証は実施済み(注入→check exit 1→revert→exit 0、2回・PR 本文に逐語)。

## 失敗時の読み方

- check の drift 検出は面別の diff 要約を出力する。drift = 正本編集後の write/13面同期漏れが第一容疑。
