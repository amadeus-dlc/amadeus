# Code Generation Plan — pi-distribution(#2363)

方式 = D2(kimi 先例踏襲 + 2 方向検証)。traceability: 全 step → FR-PI-1〜3。depth Minimal。クロスレビュー成立済み(ESTABLISHED_WITH_REFINEMENTS — 実害は self-install 経路のみ、model ピン主張は不成立、persona 15)。

- [x] Step 1: TDD Red — 固定件数ピンの 3 テスト(`t-plugin-projection-packaging.test.ts:148-149`、`t-plugin-projection.test.ts:308`、`t209-promote-self-dangling-symlink.test.ts:143-150`)の期待集合を pi 込みへ更新し Red を実測(FR-PI-3 の Red 点)。あわせて vendor 非脱落(`git ls-files` 前後一致)と `.pi/agents` 集合一致(件数フリー、dist との parity)の検証をテストへ追加
- [x] Step 2: 3 面へ pi を追加 — `scripts/plugin-projection.ts:59` `SELF_INSTALL_HARNESSES`、`scripts/promote-self.ts:64-71` `managedDirs`({ src: "dist/pi/.pi", dst: ".pi" })、`packages/framework/core/tools/data/self-install-allowlist.ts:12-19` `GENERATED_SELF_INSTALL_ROOTS`(FR-PI-1)。pi dot-gitignore の `!/.pi/vendor/` と生成 ignore の両立(FR-PI-2)
- [x] Step 3: `bun run build` + promote-self 実行 → 配送先述語の実測: `.pi/agents/` 集合 = `dist/pi/.pi/agents/` 集合、`amadeus-architecture-reviewer-agent.md` の `tools: read, grep, find, ls` 逐語、`bun run source-only:check` green、`git status` 追跡汚染 0 件、vendor `git ls-files` 前後一致(FR-PI-1/2)
- [x] Step 4: docs 同期 — `docs/reference/11-contributing.md:47` の self-install ルート列挙(en/ja)ほか関連面へ pi を追加(FR-PI-3)
- [x] Step 5: 台帳 resync(テスト変更 → coverage-registry regen 要否確認)+ core 正本変更のため全ハーネス build 不変検査
- [x] Step 6: typecheck / lint / 対象テスト(Step 1 の Green 化)→ commit → push → PR 作成(push-first)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T15:59:56Z
- **Iteration:** 1
- **Scope decision:** none

3成果物はstage契約の必須構成(plan消化・summary対応・Minimal様式・pr-convergence-report format)を満たし、FR-PI-1〜3の受け入れ確認(配送先述語15件一致・reviewer charter逐語・source-only green・追跡汚染0)はcode-summaryの実測値と一致する。line番号引用(3面・3テスト・docs)はrequirements.md/plan.md間で完全一致。2件の判断(vendor述語置換、t415 HOST_ONLY_DIST)は申告され、うち1件は裁定ID(E-AD-5DD8BB00)を明示、6面拡張はE-AD-22BD77ECを明示。BLOCKERは検出されなかった。unit-of-work.mdの宣言境界に対する実装スコープ拡張の追記漏れ、FR-PI-3のRed/Green内訳の粒度、head系譜の非明示をFOLLOW-UPとして記録する。

### Findings

- FOLLOW-UP | unit-of-work.md の pi-distribution 境界節は「scripts/promote-self.ts、scripts/plugin-projection.ts、self-install-allowlist.ts、生成 .gitignore/.gitattributes、対応テスト3本、docs2面」と宣言するが、code-summary.md は AGENTS.md、.coderabbit.yaml、.github/workflows/ci.yml、scripts/detect-ci-changes.sh、amadeus-sensor-self-scope-consistency.ts + manifest、追加テスト列挙5箇所(t413/t369/t-scope-promotion-canonical/t307/t415)への拡張を報告している。裁定E-AD-22BD77ECで認可・開示済みだが、unit-of-work.md自体は境界拡張を反映する追記がない(nsd-provenanceユニットで行われた『再束縛記録』のような明示更新がpi-distribution側にはない)。将来のtraceability確認のためunit-of-work.mdへの追記を推奨する。
- FOLLOW-UP | FR-PI-3の受け入れ確認は名指しの3テストファイル(t-plugin-projection-packaging.test.ts:148-149 / t-plugin-projection.test.ts:308 / t209:143-150)が個別にRed→Greenであることを要求するが、code-summary.mdのTDD節は『固定件数ピン更新+新述語で9 fail(exit1)→3面追加後Green(66 pass)』という集計値のみで、3本それぞれの遷移を切り分けていない。監査可能性のため内訳記録を推奨する。
- FOLLOW-UP | code-summary.md記載の実装head(64ce0a7b9 + 追補7ee84f501)とpr-convergence-report.mdのlocal/remote/pr head(cc776345d68e4cbdad3ca47e9cd526ff5e8321eb)が一致しない。conductor統合(record checkpoint同梱等)起因と推測されるが、いずれの成果物にもこの関係を説明する記載がなく、2成果物だけからはhead系譜を追跡できない。
- NIT | 逸脱・判断節の1件目(vendor述語の置換)はteam.md P2への直接準拠として妥当だが、他の2件(6面拡張・t415扱い)は個別裁定ID(E-AD-22BD77EC / E-AD-5DD8BB00)を明示する一方、この1件だけ裁定IDの引用がなく記述形式が非対称。
