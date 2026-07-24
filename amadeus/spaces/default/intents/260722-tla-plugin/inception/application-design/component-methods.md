# Component Methods — 260722-tla-plugin

上流入力(consumes 全数): requirements(FR-1〜FR-6)、architecture(既存シンボル file:line)、component-inventory、team-practices

方式: functional-domain-modeling-ts(判別ユニオン Result、type+コンパニオン、class は既存 FsTlcToolchain 系の既習様式に限り踏襲)

## C-1: PluginStageDiscovery(amadeus-graph.ts 拡張)

- `discoverPluginStageFiles(hostRoot: string): { path: string; slug: string }[]` — `plugins/*/stages/*.md` を列挙(存在しなければ空配列 = 0-plugin baseline)。エラー: 読取不能ディレクトリは skip せず loud throw
- `compileStageGraph()` 変更点 — 既存 walk の後に plugin ステージを合流。slug 重複(コア or plugin 間)は `throw new Error("plugin stage slug collides: <slug>")`(loud)。number/name 採番は既存の auto-seed 契約を踏襲

## C-2: run-model-check CLI

- CLI 契約(FR-3.3/3.6): `bun scripts/formal-verif/run-model-check.ts --model <path.tla> --cfg <path.cfg> --out <dir> [--provider auto|sandbox-exec|docker]`
- `parseRunModelCheckArgs(argv: string[]): Result<RunModelCheckInput, CliError>` — 引数を数値/パスとして parse(parse-don't-validate)。不足・不正は exit 2 + usage
- `runModelCheck(input: RunModelCheckInput, deps: Ports): Promise<ModelCheckOutcome>` — acquire → verifyOffline → prepare → run → normalize の既存 fail-closed 連鎖を再利用
- `ModelCheckOutcome = { kind: "NOT_DETECTED" } | { kind: "DETECTED"; counterexampleIdentity: string } | { kind: "HARNESS_ERROR"; code: string; detail: string }` — exit 写像: NOT_DETECTED→0、DETECTED→1、HARNESS_ERROR→2+(FR-3.6)
- エラー方針: 全異常は HARNESS_ERROR へ分類し stderr へ構造化1行 JSON+人間可読行。無言 fail なし

## C-3: TlcSpawnPlanner(iteration 1 Critical 是正後の正設計)

実測前提: TLC spawn は `FsTlcToolchain.run()` 内のハードコード argv(fs-tlc-toolchain.ts:1289-1296、sandbox-exec プレフィクス)であり、既存 `DarwinSandboxExecProvider`(:380)は network-deny 自己診断プローブ専用 — spawn 経路ではない。

- `type TlcSpawnPlanner = { readonly identity: string; buildArgv(manifestArgv: readonly string[]): readonly string[]; snapshotEnvironment(ctx: EnvVerifyContext): Promise<Result<EnvSnapshot, TlcToolchainError>>; verifyEnvironment(snapshot: EnvSnapshot): Promise<Result<EnvReceipt, TlcToolchainError>> }`〔U3 FD レビュー Critical 是正 2026-07-22: 既存コードは prepare() が初回スナップショット(#snapshotJdk/#preflightSandbox :1240-1241)、run() が spawn 直前の drift 再検証(:1263-1278、TOCTOU 防止)の**2段構成** — planner も snapshot(prepare時)/verify(run時再検証)の2メソッドで両段を保存する〕。inspection matrixとreceipt builderはplanner/domain層のcanonical定義とし、`passed`は成功した実検査、`failed`は実行済み失敗、`not-applicable`はplatform非該当、`not-run`は前段failureで未実行の場合だけに用いる。
- `DarwinSandboxSpawnPlanner` — buildArgv = 既存の `["/usr/bin/sandbox-exec", "-p", DARWIN_NETWORK_DENY_PROFILE, ...manifestArgv]` を移設。snapshotEnvironment = 既存 prepare() の初回スナップショット、verifyEnvironment = 既存 run() の spawn 直前 drift 再検証(sandbox receipt / JDK snapshot / JDK version)を移設。既存挙動 byte-equivalent(検証内容・順序・呼出し位置とも同一)
- `DockerSpawnPlanner(config: { imageRef: string /* eclipse-temurin@sha256:… digest固定 */; jarPath: string; jarSha256: string })` — buildArgv = `["docker","run","--rm","--network=none","-v","<ws>:/w",imageRef,"java","-cp","/w/<jar>","tlc2.TLC",...]`。verifyEnvironment = イメージ digest 一致+jar sha256 検証。sandbox receipt / ホスト JDK snapshot は**宣言的非適用**(EnvReceipt に非適用と根拠を記録 — 無言スキップ禁止、ADR-6)。docker 不在は HARNESS_ERROR(loud)であり、Docker適用検査は前段停止として`not-run`を記録する。
- 選択(`auto`): darwin → DarwinSandboxSpawnPlanner / それ以外 → DockerSpawnPlanner。normalize は planner 非依存(FR-3.5)

## C-3b: fs-tlc-toolchain.ts prepare()/run() の委譲リファクタ(Critical 是正後の正設計)

- `prepare()`: 初回スナップショット取得を `planner.snapshotEnvironment` へ委譲(Darwin planner 使用時の検証内容・順序は既存 :1240-1241 と同一)
- `run()`: (i) spawn 直前の drift 再検証を `planner.verifyEnvironment(snapshot)` へ委譲(既存 :1263-1278 の再検証を保存 — TOCTOU 防止を削らない) (ii) argv 構築を `planner.buildArgv(prepared.manifest.argv)` へ委譲(:1289-1296 の直書きを置換)。issue 検証(#issuedPrepared)・SOURCE_DRIFT 照合・normalize は無改変

## C-4: TlaModelLoader(tla-arm.ts 変更)

- `loadTlaModelSource(modelPath: string, cfgPath: string): Result<{ moduleBytes: Uint8Array; cfgBytes: Uint8Array }, ModelLoadError>` — specs/tla/ から読込。不在・空は loud エラー
- 既存 `generateFrozenTlaModel` / identity 生成(tag `amadeus.formal-verif.tla.module.v1` 等)は bytes 入力に対して不変 — 埋め込み定数の削除と読込への差替のみ(二重保持しない)
- FR-3.2(埋め込み版とのバイト一致検証+既知欠陥の代表ケース再現1回)の**検証実施は build-and-test ステージへ委譲**する — 本設計では検証可能性(identity tag の同値比較手段と D4 パッチの再適用可能性)のみを保証する(iteration 1 Minor 3 是正: 孤児要件でなく明示委譲)

## C-6: model-completeness sensor

- manifest: id `model-completeness` / kind deterministic / matches `specs/tla/**`+ 対象実装 glob(設計値: `scripts/amadeus-election*.ts`)/ default_severity advisory
- `checkModelCompleteness(mapPath: string): Result<CompletenessVerdict, SensorError>` — model-map.json(登録簿)の各 entry `{ implPath, sha256 }` を再計算照合。乖離 → `{ pass: false, findings: [<implPath> changed since model sync] }`
- `updateModelMap(mapPath: string, implPaths: string[])` — モデル更新時に登録簿を再記録する明示コマンド(sensor 本体と同ファイルの subcommand。起動者: モデルを更新した開発者 — guard-activator 明記)
- map 不在は FAILED(fail-closed — 登録簿なしで green にしない)

## C-7: ci.yml formal ジョブ(宣言的 — メソッドなし)

- steps: checkout → jar を版固定 URL からダウンロード → `sha256sum -c`(チェックサム固定)→ `docker run` 可用性確認 → `bun scripts/formal-verif/run-model-check.ts --model specs/tla/FormalElection.tla --cfg specs/tla/FormalElection.cfg --out out/ --provider docker` → out/ を artifact upload(if-no-files-found: error)

## C-8: plugin(宣言的)

- plugin.json: stages `[{slug:"formal-model-check", path:"plugins/formal-model-check/stages/formal-model-check.md"}]`〔U2 FD レビュー Critical 是正 2026-07-22: manifest の `path` はホストツリー相対の宛先で verbatim に書き込まれる(plugin-composition.ts:824 実測)ため、`plugins/<name>/` プレフィクスを明示して名前空間素性を保つ。C-1 の走査対象 `plugins/*/stages/*.md` と一致させる。走査 root は compose の hostRoot と同一のハーネスルート(stagesDir() の2階層上 = <harnessDir>)〕。seams なし(sensor はコア供給で、ステージ frontmatter に直接 `sensors: [model-completeness]` を書く — 自ステージファイルへの宣言はシーム不要)
- stages/formal-model-check.md: frontmatter(slug/phase: construction/execution: CONDITIONAL/scopes: []/sensors: [model-completeness])+ 本体(run-model-check 実行と結果報告の手順)
