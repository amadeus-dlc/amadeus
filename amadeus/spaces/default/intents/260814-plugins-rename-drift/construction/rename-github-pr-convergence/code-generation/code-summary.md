# Code Summary — rename-github-pr-convergence

上流入力: `code-generation-plan.md`、builder 最終報告(swarm batch 1、branch `bolt-rename-github-pr-convergence`)。PR: https://github.com/amadeus-dlc/amadeus/pull/3051

## 実装

- `git mv plugins/pr-convergence plugins/github-pr-convergence`(13 ファイル、全て R = rename でファイル名不変)+ `plugin.json` name 更新
- パス軸消費者の同期: base `d554cc7c5` 断面の再実測で **26 件・前回実測(cd64486a6)と同一集合**を確認してから機械置換(project.md 歴史引用は除外)。プラグイン自身 2 ファイル(sensor md `command:` 行 1 + stage md CLI 呼出 5 箇所)も内容内パスを更新
- 素の名前軸: `amadeus/config.json` の `activation.names` 要素と `scope-bindings` 外側キー(内側ステージ slug キーは不変)、docs 06-sensors en/ja
- t445 の `PLUGIN` 定数追随。t449 は同一定数がディレクトリ名と slug の両用だったため `PLUGIN` / `STAGE_SLUG` に分離(slug 不変を守るための不可避な分離 — 互換エイリアスなし)
- 新規テスト `tests/integration/t2996-pr-convergence-scope-grid.integration.test.ts`: compile 実行結果から EXECUTE 行を導出し 4 self スコープと照合(ハードコード比較なし)
- 競合解決(post-PR): origin/main の前進(#3045/#3039/#3037/#3030 等)との rename/modify 競合を「相手の変更を新パスへ着地」で解決(`430eaadba`)

## 落ちる実証(ADR-2 — 1 セット)

構文的に妥当な誤名 `"pr-convergency"` を scope-bindings 外側キーへ注入 → scope-grid テストが「EXECUTE 行 0(expected 4 スコープ / received [])」で赤 → revert(`git diff --stat` 空、残渣ゼロ)→ 再 green。無音脱落そのものを実測。

## 実測(builder 報告からの転記 + conductor referee)

| 検証 | 結果 |
|---|---|
| typecheck / lint / build(追跡不変)/ source-only | すべて exit 0 |
| 対象テスト 22 ファイル | 418 pass / 0 fail(path 実在の事前確認 + runner 報告数照合済み) |
| 残存参照: パス軸述語 | 0 件(exit 1) |
| 残存参照: 名前軸(厳密トークン) | 残 1 件 = `config.json:61` 内側ステージ slug キー(FR-REN-5 の不変対象 — 除外根拠記録済み) |
| referee `check` | converged / tampered=false |
| リモート CI(正) | PR #3051 — 競合解決 push 後に再実行中 |

## 申し送り

- 下流 workspace の移行面: gitignored 旧ステージングコピー(`.claude/plugins/pr-convergence` 等)が compose 後も残留しうる — リリースノート記載候補
- docs 原文 "the opt-in `pr-convergence` plugin stage" は識別子のみ差し替え(文構造不変)

## 追補: 不変識別子 3 種の diff grep 機械確認(レビュー FOLLOW-UP 対応、conductor 実測 2026-08-14)

述語: `git diff <merge-base>..bolt-rename-github-pr-convergence | grep -E '^[-+].*(<識別子>)'`(プラグインディレクトリ自身の R 移設行は除外)
- センサー id `pr-convergence-report-format`: ヒットは docs 06-sensors 表の en/ja 2 行のみで、-/+ 両辺に同一 id が現れ(変更トークンは同じ行内のプラグイン名)、id 自体の変更なし
- スキル名 `amadeus-pr-convergence`: 同上(docs 表の同一行のみ。skills ディレクトリ名への変更なし)
- ツールファイル名 `pr-convergence-*.ts` 9 種: プラグインディレクトリ外の diff 行に出現 0(exit 0 は選言 grep の検査実行成功、対象行 0 行を目視確認)
