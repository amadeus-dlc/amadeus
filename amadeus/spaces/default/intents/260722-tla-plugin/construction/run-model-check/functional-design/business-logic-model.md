# Business Logic Model — U3 run-model-check

上流入力(consumes 全数): unit-of-work(U3 定義)、unit-of-work-story-map(体験ステップ3)、requirements(FR-3.3〜3.6)、components(C-2/C-3/C-3b)、component-methods(TlcSpawnPlanner 正設計)、services(実行単位・タイムアウト)

## 中核フロー: 単発モデル検査

1. **引数 parse**: `parseRunModelCheckArgs(argv)` — --model/--cfg/--out 必須、--provider auto|sandbox-exec|docker(既定 auto)。不正は exit 2+usage(parse-don't-validate)
2. **モデル読込**: U1 の `TlaModelSource.load(modelPath, cfgPath)`(canonical 1定義を import)
3. **planner 選択**: auto → darwin なら DarwinSandboxSpawnPlanner / 他は DockerSpawnPlanner(component-methods C-3 の正設計どおり)。docker 実行可能性は verifyEnvironment で検証(不在は HARNESS_ERROR、loud)
4. **実行連鎖**: 既存 FsTlcToolchain の acquire → verifyOffline → prepare → run → normalize を再利用。C-3b 委譲は2段構成を保存する(Critical 是正 2026-07-22): prepare() = `planner.snapshotEnvironment`(初回スナップショット、既存 :1240-1241 相当)/ run() = spawn 直前に `planner.verifyEnvironment(snapshot)`(drift 再検証、既存 :1263-1278 相当 — TOCTOU 防止を削らない)+ `planner.buildArgv`。issue 検証・SOURCE_DRIFT 照合・normalize は無改変
5. **verdict 写像**: normalize の CellResult → `ModelCheckOutcome` → exit code(0 = NOT_DETECTED 完全探索完走 / 1 = DETECTED 反例あり+counterexampleIdentity / 2+ = HARNESS_ERROR)。stderr に構造化1行 JSON+人間可読行、--out に成果物(TLC ストリーム・manifest・EnvReceipt)を保存

## 実行予算(services 是正の数値確定は nfr-design へ)

単発 run。spawn deadline は診断実測に基づく規律(上限 180秒/spawn)を単発 run 予算として nfr-design で検算・確定。

## エラー経路

- 全異常(モデル不在・planner 検証失敗・部分探索・timeout・統計欠損・drift)は HARNESS_ERROR 系へ分類し loud fail。無言 fail・graceful degrade なし
- Docker 経路の環境検証: イメージ digest 一致+jar sha256 検証を適用、sandbox receipt / ホスト JDK snapshot は宣言的非適用(EnvReceipt に非適用根拠を記録 — ADR-6)
- 環境inspectionは全5 IDを固定順で記録する。前段failureで未実行の適用検査は`not-run`、実行済み失敗だけ`failed`、planner/platform非該当だけ`not-applicable`とし、composition rootはprovider別receiptを合成しない。
- artifact予約前のpath canonicalization失敗はterminal HARNESS_ERROR/exit 2とする。予約後はcache作成からpublisherまで単一failure/publish境界で実行し、例外時も可能な限りfailure directoryとterminal manifestを最後に発行する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-22T13:45:44Z
- **Iteration:** 2
- **Scope decision:** none

Critical(2段構成の確定: snapshot=prepare/verify=run直前再検証、TOCTOU保持)・Minor(D4目的分離注記)の閉包を実コード再実測で確認。残Minor(行番号:1237-1238→:1240-1241)はconductorが即時是正済み。

### Findings

- None
