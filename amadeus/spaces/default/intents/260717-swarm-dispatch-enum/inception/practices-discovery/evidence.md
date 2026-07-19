# Practices Discovery Evidence — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): `code-structure.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`architecture.md`、`business-overview.md`。

証拠スキャンは practices-discovery:c1 に従い、同日(2026-07-18 JST)の reverse-engineering codekb を代用した。RE 差分リフレッシュ(base `6495e03a`・observed `e9a001105`・区間128コミット)は、実行コード・構造・API・依存の関心 seam に変化がないことを確認済みであり、`code-structure.md`・`architecture.md`・`business-overview.md`・`dependencies.md`・`technology-stack.md`・`code-quality-assessment.md` の8 body成果物は全点温存されている。以下は現 HEAD `07e3b21b5` での追実測。

## Pipeline & Deploy

- scan: `git log --first-parent -50 origin/main`、`.github/workflows/ci.yml`、`.github/workflows/release.yml` を確認した。
- evidence: `origin/main` first-parent 直近50件の merge commit は 0 件で、既決の squash / linear 運用と整合する。
- evidence: CI は push / pull_request で起動し、typecheck、Biome lint、CCN complexity ratchet、dist / self-install drift guard、test、coverage(project / patch / relative)を blocking で実行する(`.github/workflows/ci.yml` — 区間でリファクタ 88+/117− があったがゲート集合の意味論は不変)。
- evidence: release は `workflow_dispatch` から release-it / GitHub Release / npm publish の既決経路のみ(`release.yml` に区間変更なし)。
- inference: deployment topology は非該当のまま。新しい deploy 判断は生じない。

## Quality

- scan: `tests/` 配下の実ファイル数、`package.json` scripts、CI blocking gate を確認した。
- evidence: test file は unit 212 / integration 148 / e2e 68 / smoke 14(現 HEAD の `ls tests/<layer>/*.test.ts | wc -l` 実測)。
- evidence: 区間で coverage-patch-gate(`tests/coverage-patch-gate.ts` + `tests/.coverage-patch-allowlist.json`)が新設され、本 intent の PR は patch gate 対象になる(local lcov 事前確認の既決ノルムを適用)。
- inference: scope=amadeus の既決 Testing Posture(テスト並行作成・既存 CI gate green 維持)に変更はない。

## Developer

- scan: RE codekb の `code-structure.md`・`technology-stack.md`・`architecture.md` と `biome.json`・`tsconfig.json` を確認した。
- evidence: TypeScript / ESM / Bun、Biome(formatter 無効)、strict `tsc --noEmit`、`packages/framework/core/`(harness 中立層)と `packages/framework/harness/<name>/`(harness 別表層)の境界は区間で不変。
- inference: 既決 Code Style を変更せず適用する。命名・error handling の未決質問はない。

## DevSecOps

- scan: workflow、Biome / TypeScript 設定、SAST / DAST / secret scan / dependency-update automation 設定を検索した。
- evidence: lint・型・complexity・drift・test・coverage は repo-wired。SAST / DAST / secret scan workflow および Dependabot / Renovate 設定は前回(260717-codekb-diff3-cleanup)同様に確認できなかった。
- inference: 新設の security control は本 intent のスコープ外(intent-statement の Out 対象に整合)。hard rule への変換はしない。
