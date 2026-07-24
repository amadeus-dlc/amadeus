# Domain Entities — U3 run-model-check

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

## エンティティ

- `RunModelCheckInput` — `{ readonly modelPath: string; readonly cfgPath: string; readonly outDir: string; readonly provider: "auto" | "sandbox-exec" | "docker" }`。スマートコンストラクタ `parseRunModelCheckArgs(argv): Result<RunModelCheckInput, CliError>`
- `CliError` — `{ readonly kind: "MISSING_ARG" | "UNKNOWN_ARG" | "INVALID_PROVIDER"; readonly detail: string }`
- `TlcSpawnPlanner` — `{ readonly identity: string; buildArgv(manifestArgv: readonly string[]): readonly string[]; snapshotEnvironment(ctx: EnvVerifyContext): Promise<Result<EnvSnapshot, TlcToolchainError>>; verifyEnvironment(snapshot: EnvSnapshot): Promise<Result<EnvReceipt, TlcToolchainError>> }`(component-methods C-3 の正設計(Critical 是正後の2段構成)を canonical とする — 本 Unit が所有。snapshot=prepare時初回検証 / verify=run時spawn直前再検証)
- `EnvSnapshot` — planner 実装別の初回検証結果(Darwin: JDK snapshot + sandbox receipt / Docker: イメージ digest + jar sha256 の検証済み値)。verifyEnvironment の再検証基準として run() へ運ばれる
- `EnvReceipt` — schema `amadeus.env-receipt.v1`、runId、planner、固定5 inspectionを持つ。inspectionは`passed | failed | not-applicable | not-run`の判別unionであり、`passed`は成功した実検査、`failed`は実行済み失敗、`not-applicable`はplatform非該当、`not-run`は前段failureにより未実行の検査だけを表す。generic builderはdomain、provider別inspection matrixはplannerがcanonical所有する。
- `DockerPlannerConfig` — `{ readonly imageRef: string /* @sha256: 必須 */; readonly jarPath: string; readonly jarSha256: string }`。スマートコンストラクタで digest 形式(@sha256:64hex)を検証(タグ参照は拒否)
- `ModelCheckOutcome` — 判別ユニオン `{ kind: "NOT_DETECTED" } | { kind: "DETECTED"; counterexampleIdentity: string } | { kind: "HARNESS_ERROR"; code: string; detail: string }`。exit 写像 0/1/2+
- `TlaModelSource` / `ModelLoadError` — U1 定義を import(canonical — 再定義しない)

## 不変条件

- DockerPlannerConfig.imageRef は digest 固定形のみ表現可能(コンストラクタで拒否 — 無効状態の表現不能)
- EnvReceiptは全5 IDを順序固定で持つ。Dockerではjdk-snapshot / sandbox-profileだけ、Darwinではimage-digestだけが`not-applicable`になり得る。前段failureで未実行の適用検査を`failed`や`not-applicable`へ偽装してはならず、固定reason付き`not-run`とする。
- ModelCheckOutcome の NOT_DETECTED は normalize の COMPLETE 判定からのみ構築可能(構築経路を private に限定)

## frontend-components.md について

本 Unit は CLI のみで UI を持たないため optional の frontend-components.md は生成しない(CONDITIONAL 非該当 — 全候補列挙 assert で不在確認)。
