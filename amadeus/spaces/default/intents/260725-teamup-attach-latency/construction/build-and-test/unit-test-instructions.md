# Unit Test Instructions — fix-1449-watcher-guard

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-attach-latency/construction/fix-1449-watcher-guard/code-generation/code-generation-plan.md`、`amadeus/spaces/default/intents/260725-teamup-attach-latency/construction/fix-1449-watcher-guard/code-generation/code-summary.md`

- `code-summary.md` — 新規テストが integration 層に置かれた根拠（実 FS を触るシェル source シーム）を引き、unit 層への新規追加がないことを確認した。
- `code-generation-plan.md` — FR-5 が存置を要求する4関数・2定数の一覧を引き、存在検査の対象を確定した。

## 方針

本変更に**新規 unit テストは追加しない**。

理由: 検証対象 `watcher_verification_applies` は POSIX シェル関数であり、判定には `TEAM_UP_LIB_ONLY=1` による実ファイル source（実 FS 境界）が必要。孤立モックの unit テストは対象の実挙動を観測しない。`cid:build-and-test:wtfbt-c1`（Minimal 戦略でもシェル関数・実 FS 境界は既存 integration シームを最小検証集合とする）および `cid:code-generation:fs-tests-integration-first` に従い、integration 層へ配置した。

## 既存 unit スイートの非退行

```
bash tests/run-tests.sh --ci
```

unit 層 282ファイル（small 119 / medium 162 / large 1）を含む全 546ファイルが緑。Failed files 0 / Failed assertions 0。
