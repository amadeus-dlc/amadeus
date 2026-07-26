# 技術スタック決定 — U7 conformance-suite

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 決定: 既存テストランナーのみ・runtime dependency 追加ゼロ

`technology-stack.md` の本 intent 差分リフレッシュは「新規外部パッケージもゼロ」「テストランナー(`tests/run-tests.sh`)の構成は不変」と実測しており、U7 の適合スイートはこの実測所見どおり既存の `bun test` + 自作ランナー(smoke/unit/integration/e2e の 4 層)へ編入する。`requirements.md` NFR-3(Bun-only、runtime dependency 追加禁止)を継承し、新規のテストフレームワーク・アサーションライブラリを持ち込まない。

- テストランナー: 既存 `tests/run-tests.sh` の 4 層(`business-logic-model.md` フロー 3「新規 workflow を作らない — ci-pipeline:c2」)。`technology-stack.md` 実測の `bun:test` + 自作 runner を使用
- テスト様式: compose-semantics 層は既存 t252/t253 の in-process fixture 様式を踏襲(`business-logic-model.md` フロー 2)。per-harness 層の native hook 実起動は e2e 層(`technology-stack.md` 実測: e2e は `--ci` 非対象)
- レポート: ConformanceReportSection は既存 upstream-sync レポート生成へ追加(`business-logic-model.md` フロー 4)。`technology-stack.md` 実測の `gh` CLI(argument-array process runner)を再利用し、新規の外部レポートツールを導入しない

## 決定: CI ワークフローの二重生成回避

`business-logic-model.md` フロー 3 と project.md ci-pipeline:c2 のとおり、既存 `tests/run-tests.sh` / `.github/workflows/ci.yml` へ編入し、新規 workflow を二重生成しない。`technology-stack.md` 実測の CI 変化(検証ジョブ分割・complexity gate 移設)を尊重し、既存ジョブ配線へ載せる。

- 合否: 新規 runtime dependency ゼロ(`package.json` / `bun.lock` の diff が空 — `technology-stack.md` 実測手順の再現)
- 合否: 新規 CI workflow を作らず既存 `ci.yml` の 4 層ランナーへ編入(ci-pipeline:c2 — 既存 workflow を唯一の正本として文書化・検証)

## 代替案と却下理由

- 却下: 適合テスト専用の新規 workflow / ランナー新設 — project.md ci-pipeline:c2 違反。既存 4 層ランナーで足り、二重生成は正本の分裂を生む
- 却下: 上流テストの verbatim 移植(上流依存の同梱)— `requirements.md` A-4 / `business-rules.md` BR-U7-8(pin 固定)により上流実装を追わず、Amadeus 側テストへ disposition マッピングする。外部依存を持ち込まない(technology-stack.md 依存追加ゼロ実測)
