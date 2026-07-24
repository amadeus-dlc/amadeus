# Code Summary — U1 tla-externalize

## 実装結果

U1 の外部化、固定パス loader、canonical model-map parser、adapter 配線、Comprehensive test を実装した。`generateFrozenTlaModel` と `createFrozenTlaModelReceipt` の公開シグネチャは変更していない。Result は `loadVerifiedTlaSource` pipeline の戻り値に限定し、`tla-arm.ts` の adapter が内部で分岐する。成功時は `VerifiedTlaSource` だけを内部 generator へ渡し、失敗時は error だけを `TlaModelHarnessError`（`HARNESS_ERROR`、exit 2）へ写像する。

## 変更ファイル

- `specs/tla/FormalElection.tla` — 旧 `MODEL_SOURCE` の escape 解決後 12,662 bytes を外部化した。
- `specs/tla/FormalElection.cfg` — 旧 `CFG_SOURCE` の escape 解決後 294 bytes を外部化した。
- `specs/tla/model-map.json` — model/cfg identity と、実測した `packages/framework/core/tools/amadeus-election*.ts` 5ファイルの SHA-256 を path 昇順で初期化した。
- `scripts/formal-verif/tla-model-map.ts` — exact schema、固定 asset path、canonical implementation path、重複・順序・SHA-256 検証と `diffModelMap` を追加した。
- `scripts/formal-verif/tla-model-loader.ts` — production向けに引数なしの `loadVerifiedTlaSource()` だけをruntime exportする薄いwrapperを追加した。
- `scripts/formal-verif/tla-model-loader-internal.ts` — `import.meta.url` 基準の最寄り repository root、realpath 包含、regular-file、symlink 拒否、固定 error code、identity/hash 検証とinternal/test-only注入seamを追加した。
- `scripts/formal-verif/tla-arm.ts` — 埋め込み `MODEL_SOURCE` / `CFG_SOURCE` を削除し、pipeline Result の内部 fold と成功値専用 generator を追加した。
- `tests/unit/t-formal-verif-tla-model-loader.test.ts` — parser、path/hash、diff、全 loader error code、production export面、exhaustive error写像を15ケース追加した。
- `tests/integration/t-formal-verif-tla-model-loader.integration.test.ts` — 実 filesystem とinternal seamで正常、missing/empty/unreadable、root/containment/read race、symlink、UTF-8、identity/hash drift、公開契約、fallback 不在を14ケース追加した。
- `tests/.coverage-patch-allowlist.json` — 埋め込みsource削除で移動した既存defensive catchの行番号を848から561へ同期した。新規U1行のallowlist追加はない。
- `.claude/.cursor/.opencode` と `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}` の `amadeus-mirror.ts` — canonical mirror sourceの既存root解決修正を正規package/promote経路で同期した。
- `performance-input-manifest.txt` / `performance-samples.json` — commit禁止下のcontent-addressed実装識別子、適用diff identity、raw性能標本を保存した。
- `code-generation-plan.md` — Step 1〜8 の完了を記録した。

## 主要な決定

- model-map schema は時刻に依存しない `{ schemaVersion, model, cfg, entries }` とし、model/cfg の canonical identity と implementation SHA-256 を単一ファイルで保持する。
- repository root は `cwd`、環境変数、CLI 引数を使わず、module URL から `.git`、`package.json`、`specs/tla/` を持つ最寄り祖先を求め、realpath で一意化する。
- implementation entry は `packages/framework/core/tools/amadeus-election*.ts` に限定した。absolute path、`..`、backslash、非正規 path、重複、symlink、root 外 realpath を拒否する。
- cache、埋め込み fallback、新規 runtime dependency は追加しなかった。

## Identity 証拠

- module identity: `ca86668dcf1c39b4a72e2ca334959923184fc7874ceb7197c389840d793c3769`
- cfg identity: `92656a5c8cf2a83a0251bc35fef8c8260e9cb1baec459bef2d87a104474ed62b`
- 外部化前の埋め込み bytes と外部ファイル bytes は上記 identity で一致した。
- `tla-arm.ts` から `MODEL_SOURCE`、`CFG_SOURCE`、`---- MODULE FormalElection ----` が消え、外部ファイル以外の source fallback がないことを integration test で確認した。

## テスト・品質結果

- `bun test --coverage --coverage-reporter=lcov ...tla-model-loader... ...tla-model.test.ts`
  - 50 pass、0 fail、329 assertions。
- U1明示差分とlocal LCOVの `coverage-patch-gate`
  - measured added lines 341、covered 341、allowlisted 0、uncovered 0。
- `bun test tests/unit/t-formal-verif-*.test.ts tests/integration/t-formal-verif-*.test.ts tests/e2e/t-formal-verif-*.test.ts`
  - 48 files、693 pass、0 fail、8,084 assertions、4.47秒。
  - D4 invalid-timestamp の walking-skeleton integration/E2E と TLC counterexample 正規化経路を含む。
- `bash tests/run-tests.sh --ci`
  - 最終treeで492 test files、7,077 assertions、失敗0。
- `bun run coverage:ci`
  - 492 test files、7,071 assertions、失敗0。`coverage/lcov.info`生成成功。
- `bun run typecheck`
  - exit 0。
- `bun run lint`
  - exit 0。repository既存のcomplexity warning 255件・info 19件は残る。
- U1対象ファイルの `bunx biome check`
  - checked 6 files、warning/error 0。
- `bun run dist:check` / `bun run promote:self:check`
  - 全harness treeとproject-local self installが同期済み、exit 0。
- `git diff --check`
  - exit 0。

## 性能結果

- 環境: Darwin 25.5.0 arm64、Bun 1.3.13、baseline SHA `de6c3ad3fbdea3fed8766742ccda6c278e0d3435`。
- implementation tree identity: `8219516c05a433fa5a0df178fad6d5aa8b336a5a3a1efa6f3bbe82720aa82c07`。適用diff SHA-256: `d0494197b7e46ea76232731fb4a63ad725378a0c5cb2c0f9adfc558822c04cc1`。
- fixture: module 12,662 bytes、cfg 294 bytes。
- baseline と implementation source state を別々のdetached一時worktreeに置き、後者へ上記diffを適用し、同じ `t-formal-verif-tla-model.test.ts` をwarm-up 2回後、10回ずつ実行した。
- baseline: median 68.812ms、max 75.056ms。
- implementation: median 74.793ms（baseline の108.69%）、max 80.030ms（baseline の106.63%）。
- 判定: median 110%以下、max 120%以下を満たす。直接loadはmedian 0.286ms、max 0.321msで、全標本250ms未満を満たす。
- raw artifact SHA-256: `f1279a2819758735ccc61b48192c6cd9dfdf7ecb6fbb2665bca49135d201653b`。manifest自身のSHA-256がimplementation tree identityと一致する。
- 比較用一時 worktree は測定後に削除した。現行 tree に旧埋め込み実装を保持していない。

## 逸脱・残課題

- 親タスクから commit 禁止を明示されたため、implementation commit は作成していない。性能比較では baseline commit の別 worktree と、同じ baseline から作成して未コミットの U1 source state を複製した別 worktree を使用した。測定対象 bytes は現行 U1 実装と同一である。
- 実 OpenJDK/TLC を使う30分枠の完全探索は U3/U4 および build-and-test の責務であり、U1 Code Generation では既存の決定的 counterexample integration/E2E を実行した。
