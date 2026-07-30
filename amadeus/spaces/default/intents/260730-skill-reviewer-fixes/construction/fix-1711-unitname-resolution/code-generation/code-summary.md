# Code Summary — fix-1711-unitname-resolution(Bolt 2)

上流入力(consumes 全数): requirements.md(FR-2a〜2f の充足を本文で対照)。

## 結果

- コミット: `fba95d83f` fix(engine): resolve {unit-name} for degrade-scope per-unit directives(worktree 内 7d396f68e から amend 系列の最終形)
- PR: https://github.com/amadeus-dlc/amadeus/pull/1760 — CI 収束待ち。マージは人間承認後。

## 実装(コミットメッセージ+diff 検分より)

- FR-2a: `unitDirsUnderConstruction()` 新設 — `<recordPrefix>/construction/` 直下のディレクトリからステージ slug 集合(loadGraph)を減算して unit 集合を導出(diary ディレクトリ共存対策)、sort で決定的化。`emitRunStageForSlug` に `unit` パラメータ追加(既定 = placeholder、degrade 経路のみ解決値を渡す)。
- FR-2b: 一意化不能(0件/複数件)は候補列挙+conductor の操作を名指しする error directive で fail-closed。
- FR-2c: t186 test 5 を解決/fail-closed の両半へ分割、t116 test 9/10 は unit dir を seed して解決済みセグメントを期待、test 16 は --single 経路の placeholder 免除を設計どおり維持。t118/t120/t247 は unit dir seed で既存 assert を維持。:3052 コメントを新契約の記述へ更新。仕様裁定(Q1=A)に基づく契約変更をコミットメッセージ・PR 本文に明記。
- FR-2d: produces/consumes 両側が解決される(directive 単位の unit 引数が両側の resolveArtifactPath へ流れる)。--single 経路の consumes 免除は不変。
- FR-2e: t367-degrade-unitname-resolution.test.ts(317行)— 解決 emit → reviewer-runtime scope exit 0 / 0件・複数件 fail-closed の両側を end-to-end で固定。
- allowlist: orchestrate の行ピン 38 エントリを base→head 行マップで機械 remap し、各 remap 先の source text がバイト同一であることを直読照合。新規 allowlist エントリ 0(追加46測定可能行は handleNext 経由の in-process 被覆)。

## 検証

- builder が worktree 内でフルスイート `coverage:ci` を完走(実測観測: coverage/.parts 601件生成)。
- 配送工程(push/PR)は builder 停止のため conductor が引き取り(diff stat 検分のうえ push、PR 作成)。最終判定は PR #1760 の CI(typecheck / lint / dist:check / promote:self:check / Tests / Coverage)green とする。
- 落ちる実証(builder 遅着報告 2026-07-30T14:44Z の吸収で確定): fix コミット後に canonical+dist 両面へ pre-fix 挙動を checkout 注入し t367 が 0 pass / 9 fail(test 3 の失敗文言が Issue 症状 `required review artifact is missing: …/construction/{unit-name}/…` と逐語一致)→ 復元で 9/9 green・fix コミットと差分ゼロ(stash 不使用・1セット完結)。

## 逸脱

- builder が push/PR/報告の配送前に停止(spawned-agent-result-delivery クラス)。conductor が disk-evidence-early-takeover で引き取り、worktree クリーン・コミット実在を確認のうえ配送を実施。
