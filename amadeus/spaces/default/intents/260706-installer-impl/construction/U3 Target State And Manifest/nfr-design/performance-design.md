# Performance Design — U3 Target State And Manifest

> Stage: construction / nfr-design  
> Unit: U3 Target State And Manifest

## Design Goals

U3の性能設計は、target state detection と target snapshot を bounded read に保つ。`performance-requirements.md` の p95 目標を満たすため、処理経路は manifest path、fixed sentinel paths、expected file paths のみに限定する。`business-logic-model.md` の通り、U3は version resolution、planning、apply、manifest write を実行しない。

## Hot Path Architecture

| Path | Budget | Design |
|---|---:|---|
| valid manifest read and validation | p95 <= 150ms | `ManifestStorePort.readManifest(): InstallerManifest \| null` の既存契約を使う。manifest store 実装内で1ファイルだけ読み、schema validation は単一passで `InstallerManifest` に変換する。 |
| selected harness sentinel detection | p95 <= 100ms | harnessごとの固定 sentinel path table を `FileSystemPort.exists` で確認する。 |
| no-manifest all-harness inference | p95 <= 200ms | supported harness の小さな sentinel set だけを評価し、recursive scan は行わない。 |
| snapshot 2,000 files / 50MB | p95 <= 3s | expected paths を逐次または小さな並列幅で読み、binary md5 を計算する。 |
| unreadable md5 fallback | p95 <= 500ms / 100 files | stat/existence 結果を保持し、read失敗時は `exists:true` かつ `md5` omitted にする。 |

## Component-Level Optimizations

`ManifestReader` は manifest が存在しない場合に sentinel fallback へ即時に進む。invalid/unreadable manifest は性能最適化のために例外で呼び出し元へ広げず、validation result を diagnostics に残して `null` として扱う。

`SentinelDetector` は harness別の固定配列を持つ。`codex`、`claude`、`kiro`、`kiro-ide` の sentinel lookup は shared path の重複を呼び出し内でメモ化してよいが、process-wide cache は持たない。

`TargetSnapshotBuilder` は `distribution metadata` と valid manifest の file entries から expected paths を作る。`scalability-requirements.md` の no recursive scan を守るため、target workspace size に依存する処理は入れない。

## Measurement Plan

U6のfixtureで以下を測る。

| Benchmark | Fixture |
|---|---|
| manifest validation 2,000 entries | valid/invalid manifest JSON fixtures |
| sentinel classification | fake filesystem with complete/partial/none/unsupported paths |
| ambiguity classification | `kiro` / `kiro-ide` shared sentinel fixture |
| snapshot md5 | temp target with 2,000 expected files and 50MB total data |
| unreadable md5 | fake filesystem read errors with existence retained |

失敗時は性能超過と分類誤りを分けて記録する。ただし `performance-requirements.md` の通り、正しさの失敗は性能結果より優先してfailにする。

## Non-Goals

- persistent cache は導入しない。
- daemon、worker pool、filesystem watcher は導入しない。
- full target traversal を性能改善目的でも導入しない。
- U4 overwrite policy や U5 apply decision をU3で先読みしない。
- release publish、GitHub Actions release dispatch、npm publish はU3で扱わない。

## Upstream Coverage

- `performance-requirements.md`: p95 budget、measurement protocol、resource constraints を設計に反映した。
- `security-requirements.md`: read-only detection、manifest validation、file content leakage禁止を維持した。
- `scalability-requirements.md`: 2,000 entries/files、fixed sentinel set、no recursive scan を守る。
- `reliability-requirements.md`: invalid manifest fallback、unknown md5、stable classification を性能経路に組み込んだ。
- `tech-stack-decisions.md`: Bun/TypeScript、ports、binary md5、schema validation 方針に従う。
- `business-logic-model.md`: manifest-first detection、sentinel fallback、snapshot workflow、manifest write ownership に沿う。
