# Build Test Results — 260727-mirror-project-status

上流入力(consumes 全数): code-generation-plan, code-summary(u1-project-sync-skeleton / u2-state-reconcile-hardening / u3-lifecycle-integration / u4-config-overrides-and-diagnostics / u5-docs-and-distribution の全5ユニット)

## 実測結果(集計コマンド実出力からの転記のみ — numbers-from-command-output-only)

測定 ref = bolt/u5-docs-and-distribution HEAD 45a09c9a0(conductor 再実行 2026-07-28)

- bun run typecheck → exit 0
- bun run dist:check → exit 0
- bun run promote:self:check → exit 0
- bun tests/complexity-gate.ts --check → exit 0
- bun test(mirror 面 10ファイル: t343/t344/t345/t346/t347/t348/t349/t285/t291/t287)→ 168 pass / 0 fail / 409 expect() calls
- bash tests/run-tests.sh --ci(u5 builder 実測・同一 HEAD)→ exit 1、617 files / 8528 assertions / Failed files 1(t132-hooks-doc-count-sync、3 assertions)= #1594 既存赤(assertion 実文: :141 DOC_TOTAL_WORD undefined / :158 DOC_TOTAL NaN — hooks docs 由来、mirror 4文書と非交差)
- bun scripts/mirror-docs-contract.ts(u5 builder 実測)→ exit 0(OK: 4 documents, 44 topics)

## 赤の帰属確定

唯一の赤 t132-hooks-doc-count-sync は #1594(main 既存赤)— assertion 実文(t132:141 `DOC_TOTAL_WORD` undefined / :158 `DOC_TOTAL` NaN、hooks docs の件数語 parse 失敗)により本 intent の mirror 4文書・code-generation-plan / code-summary の変更面(各ユニット)と非交差であることを u2/u4/u5 の3ユニットで独立に帰属確定した。マージ前に main 側修正の取込で解消見込み。
