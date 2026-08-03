# 260802-plugin-projection-parity 差分スキャン

## スキャンメタデータ

- Date: `2026-08-03`
- Base commit: `47574fbabf274e11cb8e0b37bf35a0309a7b3d42`
- Observed commit: `a8e1ce025a918310ab7d803270bb6fc6b649c598`
- Distance: `25 commits`（`1085 files changed, 92157 insertions(+), 9694 deletions(-)`）
- Focus: [Issue #2018](https://github.com/amadeus-dlc/amadeus/issues/2018) とPR [#2049](https://github.com/amadeus-dlc/amadeus/pull/2049) 後に残る committed plugin projection parity。Developer scan、実コード、tracked surface、package／promotion／compose／runner契約、既存testsをarchitect synthesisした。

## 現存する非対称

| 面 | root self-install | plugin関係 tracked | 起動時の状態 |
| --- | --- | ---: | --- |
| Claude | 対象 | 58 | commit済みsurfaceが存在 |
| Codex | 対象 | 0 | `.codex` に59前後を生成しdirty。runnerは非正規 `.codex/skills` |
| Cursor | 対象 | 0 | commit済みprojection欠落 |
| OpenCode | 対象 | 0 | commit済みprojection欠落 |
| Kimi | 対象 | 0 | commit済みprojection欠落 |
| Kiro CLI／IDE | package-only | 0 | root dogfood非対象。共有 `.kiro` を二重投影しない |

PR #2049 は `amadeus/config.json` の選択、current-host startup reconciliation、transactional install/dropを実装した。しかし、startupが不足surfaceを作れることと、fresh worktreeが最初から完全な配布物であることは別契約である。現状は前者だけが成立し、通常起動がtracked treeを変更する。

## 所有境界と根因

1. `scripts/package.ts` は意図的にcompile-visible harness treeを0-plugin baselineに保ち、pluginを `dist/plugins/<name>/` のneutral bundleとして出す。この判断はstage graphの再compile冪等性を守るため維持する。
2. `scripts/plugin-projection.ts` は7 package faceと5 self-install harnessの行列を知るが、rootのcommit済みcomposition surfaceを完成させる所有経路がない。
3. `scripts/promote-self.ts` のplugin carve-outはcomposition ledgerが所有する既存surfaceを削除しないためのpreserve契約であり、欠落面をmaterializeしない。
4. `packages/framework/core/tools/amadeus-plugin.ts` はstartup compose後にgraph compileとgeneric runner-genを呼ぶ。このrepair pathが通常配布を肩代わりするため、staging／composition／composed files／graph／runnerが未追跡で生成される。
5. generic `amadeus-runner-gen.ts` は自身の `tools/../skills` を既定先にする。Codex manifestは `skipRunnerGen: true`、emitはproject-root `.agents/skills` を正規先と明記するため、startup生成の `.codex/skills` はDeveloper報告の正規先ではなく契約違反である。

## アーキテクチャ裁定

- 正しい流れを `authoring → neutral package bundle → face-aware project projection → graph／runner compile → version管理／drift check → startup verify／repair` とする。
- Claudeを参照surfaceとしつつ、生成対象は「決定的で共有可能なplugin関係ファイル」に限定する。per-session／machine-local状態は投影契約へ混入させない。
- root self-install 5面でcommit済みprojectionを生成・検査する。Codex runnerだけはhost外 `.agents/skills/amadeus-formal-model-check/SKILL.md` へ置き、`.codex/skills` を禁止する。Kiro 2 faceはneutral package bundleの検査対象に留める。
- startup composeは欠損・driftのself-healingとして残す。currentなfresh worktreeではwrite zero、終了後もgit cleanをpostconditionとする。

テキストfallback: plugin正本からneutral bundleと5面のproject projectionを決定的に作り、project projectionがgraphとface固有runnerを含む。startupはその結果を検証し、壊れている場合だけ修復する。

## テスト空白と必要な回帰境界

- `t415` は7 faceのstartup materializationを検証するが、commit済みprojection、startup前の初回利用性、startup後git-cleanを検証しない。
- `t356-promote-self-plugin-carveout` はClaude surfaceのpreserveを固定するが、Codex `.agents/skills` と他self-install面を覆わない。
- 必要なfalling proofは、Codexで `.codex/skills` が生成されたら赤、いずれかself-install面のtracked projectionが欠けたら赤、startupがbytesまたはgit statusを変えたら赤、neutral package／0-plugin baselineを崩したら赤、である。
