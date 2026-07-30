# Code Generation Plan — fix-1711-unitname-resolution(Bolt 2)

上流入力(consumes 全数): requirements.md(FR-2a〜2f、N-1〜N-4、Q1=A 裁定)。functional-design 系 6 成果物は self-fix スコープの SKIP により設計どおり不在(consumes_absent expected)。

## 対象

GitHub Issue #1711 — units-generation SKIP スコープの degrade 経路で `{unit-name}` 未解決 directive が reviewer-runtime に拒否される問題を、裁定 A(engine 側解決+fail-closed)で修正する。

## 手順(requirements FR-2 の写像)

1. 機構実測(degrade 分岐 :3050-3057、UNIT_NAME_PLACEHOLDER :1588、emitRunStageForSlug :2888-2912、resolveArtifactPath :1661-1663、consumes 逃がし :1771-1774)。
2. 実装: `<recordPrefix>/construction/` 直下の実在ディレクトリからステージ slug 集合を減算して unit 集合を導出(diary ディレクトリの共存対策)。一意なら解決して emit(FR-2a)、0件/複数件は候補列挙+conductor の取るべき操作を名指しする error directive(FR-2b、state に一意化フィールド不在の実測により厳格 fail-closed)。
3. テスト契約の明示改訂(FR-2c): t186 test 5/11、t116 test 9/10、:3052 コメント。--single 経路の placeholder 免除(t116 test 16)は設計どおり不変。
4. regression(FR-2e): t367-degrade-unitname-resolution.test.ts 新設 — 解決 emit + reviewer-runtime scope exit 0 / fail-closed 両側。
5. coverage-patch-allowlist の orchestrate 行ピンを機械 remap+直読照合(c1-allowlist-mechanical-remap)。
6. dist 7ハーネス+self-install 再生成、検証一式、deslop、落ちる実証、push、PR(Closes #1711)。

## 実行環境

git worktree 分離: `bolt/fix-1711-unitname-resolution` @ origin/main(b58ac4b06)。builder = amadeus-developer-agent subagent。配送工程(push/PR)は builder 停止のため conductor が引き取り(disk-evidence-early-takeover — 差分検分実施、検証は builder のフルスイート実測+PR CI で担保)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T14:27:37Z
- **Iteration:** 1
- **Scope decision:** none

実装は FR-2a〜2e と裁定Aに一致。fail-closed両条件・produces/consumes対称・--single免除維持を実測確認、t367(9件)・t186・t116・t118・t120・t247(全94件)・ratchetテストは worktree内実行でgreen、allowlist 38ピンのうち5件をbase(b58ac4b06)対比でバイト同一性を直読確認、typecheckもclean。

### Findings

- Minor(非ブロッキング): .codex/tools/data/scope-grid.json のみ "workshop" エントリの位置が並び替わっている(git show HEAD -- .codex/tools/data/scope-grid.json、36行挿入/36行削除、内容は不変)。他5ハーネスのscope-grid.jsonは無変更。bun run dist:check / promote:self:check は共にOKで実害はないが、N-1(surgical)の観点では本fixと無関係な副産物に見える — 次回regen時に混入経路を確認すると良い。
