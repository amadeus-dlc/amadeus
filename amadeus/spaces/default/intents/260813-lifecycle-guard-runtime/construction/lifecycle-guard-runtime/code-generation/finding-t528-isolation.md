# bug(tests): t528 の failed-result ケースが ambient の active intent に依存して合否が変わる(テスト隔離欠陥)

## 背景・対象範囲

`tests/integration/t528-report-ack-kind.integration.test.ts` のケース「a failed result remains a typed error directive」は、`handleReport(["--stage","code-generation","--result","failed"], undefined)` を **projectDir 未指定**で in-process 呼びする。`amadeus-orchestrate.ts` の failed-result 分岐は `resolveProjectDir(projectDir)` で ambient(`CLAUDE_PROJECT_DIR` / cwd)へフォールバックし、`runsQualityRepair(failureAdmissionDir)` が**実行環境の active intent の autonomy projection**を読む。fixture project ではなく実ワークスペースの状態が合否を決める。

## 根拠・実測証拠(すべて `origin/main` = `7f13639383c559bc8ab481fafdc4044c5cf198c2` のクリーン checkout で再現)

- 素の実行: `bun test tests/integration/t528-report-ack-kind.integration.test.ts` → **6 pass / 0 fail**
- active intent(autonomy `full`、quality repair active)を持つワークスペースを ambient に向けた実行: `CLAUDE_PROJECT_DIR=<active-full-autonomy-workspace> bun test tests/integration/t528-report-ack-kind.integration.test.ts` → **5 pass / 1 fail**
- 失敗内容(実測転記): 期待 `Unknown --result "failed"` に対し実際は `report --result failed requires --failure <detail> — the typed failure the stage's referee returned.`
- 機序(file:line、observed `7f1363938`): `packages/framework/core/tools/amadeus-orchestrate.ts:6021-6024` — `if (flags.result === "failed" && runsQualityRepair(failureAdmissionDir)) { handleStageFailureReport(...) }`。`failureAdmissionDir = resolveProjectDir(projectDir)` は test が渡す `undefined` から ambient へ解決される。テスト側は `tests/integration/t528-report-ack-kind.integration.test.ts:123-128`。
- 観測経緯: active intent を持つワークスペース(intent record あり・full autonomy)でのフルスイート実行(`bash tests/run-tests.sh --ci`)で当該 1 ファイルのみ FAIL(Failed files: 1)。同一ソース(`git diff` 空)のクリーン checkout では PASS。

## 期待結果・完了条件

- [ ] t528 の failed-result ケースが、実行環境の active intent / autonomy 状態に依存せず決定的に合格する(fixture project を明示的に渡す、または quality-repair 分岐を fixture 状態で駆動する)
- [ ] 「failed + quality repair active → `--failure` 必須の typed error」経路自体のテストが fixture ベースで存在する(現在この経路は環境偶発でしか踏まれない)
- [ ] active intent を持つワークスペース上でのフルスイート実行で t528 が green

## 影響・価値

セルフ開発ワークスペース(active intent 常在)での フルスイートが偽赤になり、変更帰属の切り分けコストを毎回発生させる。CI(クリーン checkout)では緑のため検出されず、ローカルでのみ再現する隔離欠陥クラス(cid:code-generation:c2-env-isolation-seam-inventory の同族)。

## 関連

- 経路導入: #2912(stage-owned referee の typed failure admission)/ #2945(full autonomy の Quality Repair 接続)
- 観測 intent: 260813-lifecycle-guard-runtime(Issue #2771 実装中のフルスイートで検出。実装 diff は `amadeus-orchestrate.ts` / t528 に非接触 — `git diff` 空で確認)

## 初期分類

- 種別: bug(既存テスト契約「環境非依存で green」への違反)/ 優先度: P2 / 重大度: S3(ローカル開発の偽赤、CI 影響なし)
