# 性能テスト手順 — 260810-plugin-harness-dir-token

Test strategy: **Comprehensive** / Depth: Minimal

## 判定: 本 intent に適用可能な性能 NFR は存在しない

`<record>/inception/requirements-analysis/requirements.md` の非機能要件は 3 件で、
**決定性**・**既存テストの非退行**・**観測可能性**のみ。スループット・レイテンシ・
リソース使用量の目標値はどこにも宣言されていない。

したがって本 intent では性能テストを新規に作成しない。**性能テストが無いことは意図的な判断であり、
測定漏れではない。** 数値目標が無い状態でベンチマークを書いても、合否を決める述語が存在しないため
検証劇場になる。

## 変更の性能特性（実測ではなく設計上の性質）

本変更が触れる経路の計算量は以下のとおり。いずれも **DEDUCED**（プロファイルは取っていない）。

- `seedPluginsTransformed()` / `copyRealFiles()` — 従来の `cpSync` / `writeFileSync` に対し、
  prose 1 ファイルあたり正規表現置換 2 回（トークン、rules rename）が増える。対象は
  `plugins/` 配下の `.md` のみで、実測 4 ファイル
- `stagingEntryState()` — 比較のたびに source 側へ同じ変換を適用する。従来はバイト比較のみ。
  ただしこの変更が無いと staged と src が恒久的に `different` となり
  **毎回再シードが走る**ため、変換コストを足す方が総体では軽い

## 退行の検出手段

専用の性能テストは置かないが、以下が実質的なガードとして機能する。

- `t416` の冪等性・決定性テスト — 再 compose が no-op であることを固定する。
  再シードが毎回走る退行はここで検出される
- `bun run test:ci` の総実行時間 — 大幅な劣化は CI の実行時間として観測される

## 将来この文書を書き換えるべき条件

requirements に性能 NFR（例: compose の実行時間上限、投影のスループット）が宣言されたとき。
その時点で目標値と測定手順をここに追記する。
