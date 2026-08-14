# formal-model-check プラグインのセンサー資産が plugin.json に未宣言で投影から欠落している

## 概要

`plugins/formal-model-check/sensors/amadeus-model-completeness.md` がディスク上に実在するが、`plugins/formal-model-check/plugin.json` に `sensors` キーが存在しないため、プラグイン投影(`.claude/sensors/`)へ配送されない。「ディスクにあるがどこからも宣言されていない資産」であり、センサーは宣言されているつもりで一切発火しない。

## 証拠・再現(observed = origin/main `cd64486a68c6a1144db50fbe3fde8273f5e18455`)

- `ls plugins/formal-model-check/sensors/` → `amadeus-model-completeness.md` が存在
- `grep -n '"sensors"' plugins/formal-model-check/plugin.json` → 0 件(exit 1。全 93 行に `sensors` キー不在)
- `ls -1 .claude/sensors/ | wc -l` → 12(core 11 + pr-convergence 供給 1。model-completeness は含まれない)
- 対照: `plugins/pr-convergence/plugin.json` は `sensors` キーで自センサーを宣言し、投影に到達している
- 補強: `docs/harness-engineering/06-sensors.md` のセンサー表は `amadeus-model-completeness.md` を列挙しており、文書上は「存在する」ことになっている(実際は未投影)

## 期待 vs 実際

- 期待: プラグイン同梱のセンサー資産は `plugin.json` の `sensors` で宣言され、`bun run build` / self-install 投影で `.claude/sensors/` へ配送されて発火可能になる
- 実際: 宣言が欠落しており、資産はリポジトリに存在するのに投影されず、発火しない。`parsePluginManifest`(`packages/framework/core/tools/amadeus-plugin-compose.ts:331-352`)は未知・欠落キーを検査しないため、この欠落は無音

## 受け入れ条件

1. `plugins/formal-model-check/plugin.json` に `sensors` 宣言を追加するか、資産が意図的に非投影ならその根拠を資産または README に記録する
2. 宣言追加の場合: `bun run build` 後に `.claude/sensors/amadeus-model-completeness.md` が投影されることを実測(投影件数 12 → 13)
3. 「ディスク上のセンサー資産と plugin.json 宣言の不一致」を検出する検査(conformance または doctor)の要否を判定し、判定根拠を記録する

## 影響

formal-model-check の完全性検査(model-completeness)が発火せず、その検証面が黙って欠落している。同クラスの欠落(資産あり・宣言なし)は今後のプラグインでも無音で再発しうる。
