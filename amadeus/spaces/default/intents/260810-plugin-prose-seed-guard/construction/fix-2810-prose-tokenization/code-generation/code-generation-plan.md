# Code Generation Plan — fix-2810-prose-tokenization

Depth は Minimal、Test Strategy は Comprehensive。既存の `bunfig.toml`、`package.json`、`tests/run-tests.ts` を再利用し、テスト設定ファイルは追加・変更しない。新規テストはリスクに応じて unit、integration、compose E2E に分け、該当する性能・セキュリティ NFR がないため専用 perf/security テストは追加しない。

- [x] Step 1: `tests/unit/t146-core-hygiene.test.ts` に plugin `.md` prose 専用の root-relative `plugins/<name>/(tools|stages|specs|hooks)/` 検出を追加し、fixture 注入と実 corpus の両方を同じ述語で検査する。prose 修正前に対象テストを実行し、fixture が検出され、現行 corpus が Red になることを記録する。

- [x] Step 2: `tests/helpers/harness-dir-fixture.ts` から manifest 実値の `harnessDir` と `rulesRename` を供給できるようにし、`tests/integration/t532-plugin-prose-transform-seed-equivalence.integration.test.ts` を追加する。全 8 manifest（harnessDir は distinct 7）を manifest ごとの独立 test case とし、`.md` / `.md.example` / `.json` / `.ts`、トークン有無、`<harnessDir>/rules/` 有無を比較する。`transform()` と `seedBytesForHarness()` のバイト一致、および独立した `.cursor` / `.opencode` の `rulesSubdirFor()` 契約を先に Red 実測する。

- [x] Step 3: `tests/integration/t2790-plugin-staging-seed-harness-dir.integration.test.ts` を拡張し、compose 後の対象 plugin stage prose に未解決トークンや root-relative command が残らず、各 command が `<harnessDir>/plugins/<name>/tools/...` へ解決することを assert する。prose 修正前に旧形が Red になることを記録する。

- [x] Step 4: `packages/framework/core/tools/amadeus-harness.ts` の `KNOWN_RULES_SUBDIR` に `".cursor": "amadeus-rules"` と `".opencode": "amadeus-rules"` を追加し、Step 2 の `.cursor` / `.opencode` Red と全 manifest 等価性を Green にする。

- [x] Step 5: `plugins/pr-convergence/stages/pr-convergence.md`、`plugins/formal-model-check/stages/formal-model-check.md`、`plugins/formal-model-check/stages/tla-authoring.md`、`plugins/formal-model-check/README.md` の裁定済み 13 行を `{{HARNESS_DIR}}/plugins/<name>/...` へ置換する。指定 grep の 0 hit、Step 1 の corpus Green、Step 3 の compose E2E Green を確認する。

- [x] Step 6: `bun run build` 後に Step 1〜3 の対象テストを再実行し、続けて `bun run typecheck`、`bun run lint`、`bun run test:ci`、`bun run distribution:check`、`bun run source-only:check`、graph compile check、coverage registry check、`bun run coverage:ci`、project/patch coverage gate、complexity gate、plugin-conformance E2E、isolated reproducible-build を既存 CI 契約どおり確認する。生成 `dist/` / self-install 面はコミットせず、NFR-1 の結果は後続検証へ渡す。

- [x] Step 7: `code-summary.md` に変更ファイル、Red→Green 実測、テスト結果、逸脱有無を要約する。repo 外 consumer 型 A/B 再演と exit code 記録は Build and Test へ、#2823 への残余 3 件コメントおよび #2810 / #2812 を closing keyword で閉じる PR 作成は後続の人間管理境界へ明示的に引き渡し、このステージでは GitHub 書込も PR 作成も行わない。

## Traceability

- Step 1 -> FR-2 / AC-2a / AC-2b / NFR-2 / NFR-3
- Step 2 -> FR-3 / AC-3a / FR-4 / AC-4a / AC-4b / NFR-2 / NFR-3
- Step 3 -> FR-1 / AC-1b / FR-5(a) / AC-5(a) / NFR-2 / NFR-3
- Step 4 -> FR-3 / AC-3a / AC-3b / FR-4 / AC-4b
- Step 5 -> FR-1 / AC-1a / AC-1b / FR-2 / AC-2b / FR-5(a) / AC-5(a)
- Step 6 -> NFR-1 / NFR-3 / AC-3b
- Step 7 -> FR-5(b) / AC-5(b) / FR-6 / AC-6

## Plan Approval

- Decision: `approve-plan`
- Decision ID: `auto-decision-5858f1d319304ba3067c881d2dd68ab2`
- Basis: Intent `full` grant（solo election unavailable のため agent recommendation へ明示的に degrade）

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T11:32:30Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜FR-6の実装方針、成果物、Green結果、およびFR-5(b)・FR-6・コミット後CIへの後続境界は概ね整合している。しかし、AC-4bが明示的に要求する.cursorと.opencode双方の変更前Red実測のうち、code-summaryには.cursor側しか記録されておらず、明示受入条件の充足を確認できないためNOT-READYとする。具体的な循環依存や無効な成果物参照は確認されなかった。

### Findings

- BLOCKER | AC-4bはFR-3適用前に等価性テストが.cursorと.opencodeの双方で赤になる実測を要求しているが、code-summaryのRed証跡は「Cursorのrules変換不一致」と.cursorのrulesSubdirFor()不一致のみで、.opencodeの失敗実測を記録していない。code-generation-planの完了チェックは事前計画であり実測結果の代替にならない。変更前実装に対する.opencode固有の失敗結果または両対象の失敗を集約した出力をrecordへ追加するまで、AC-4bの明示契約は未充足である。
- FOLLOW-UP | code-generation-planのStep 6はpatch coverage gateとisolated reproducible-buildを含めて完了済み[x]だが、code-summaryとpr-convergence-reportは両方をコミット後CIへ未実施のまま引き渡している。後続境界自体はclean tree/base refおよびコミット済みSHAを必要とするため妥当だが、完了チェックと実装逸脱なしは実績と一致しない。Step 6を実施済み部分と後続部分に分けるか、逸脱として明記すること。
- FOLLOW-UP | FR-1は対象13行、code-summaryも13行変更とする一方、t146の変更前Redはroot-relative参照12件としている。最終grep 0件により未修正残存は実証されていないためBLOCKERではないが、13対象行と12検出件数の差を行単位で説明し、ガードが意図した全対象を覆うことを監査可能にすること。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T11:36:13Z
- **Iteration:** 2
- **Scope decision:** none

前回BLOCKERは解消された。修復後のcode-summaryは、FR-3適用前相当の同一t532実行でcursor/opencodeのtransform等価性と.cursor/.opencodeのrulesSubdirFor契約が個別に失敗したことを記録し、復元後の単独・対象3ファイル実行もGreenである。AC-4bおよびNFR-2の要求に必要なRed→Green証跡が揃い、修復に起因する新規BLOCKERは確認されなかった。

### Findings

- None
