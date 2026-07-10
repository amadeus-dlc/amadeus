# Code Generation Plan — u734-coverage-project-gate

> 上流: `../functional-design/business-logic-model.md` / `business-rules.md` / `domain-entities.md`、`../../../inception/requirements-analysis/requirements.md`。
> テスト戦略: Minimal(要件駆動のユニットテスト)。トレーサビリティは FR/NFR 番号で示す(user-stories は refactor スコープで SKIP のため)。
> 実装は bolt worktree(`bolt/734-coverage-project-gate`、main 起点)で行い、PR スカッシュマージで main へ。

## 実装ステップ

- [ ] **Step 1: emit 抽出(FR-1)** — `tests/run-tests.ts`: `writeCoverageHtml()` の LCOV パース+集計(:573-638)を `collectCoverageTotals(lcov)` として抽出し、HTML と新設 `writeCoverageTotals()`(`coverage/coverage-totals.json`、`{schemaVersion:1, hits, lines}`)の両方が同一の戻り値を消費する構造にする。coverage 実行経路で JSON が HTML と同時に書かれる。挙動(HTML 内容)は不変。
- [ ] **Step 2: ゲート CLI(FR-3/FR-4/FR-5)** — 新設 `tests/coverage-project-gate.ts`:
  - `evaluateGate(current, base): Verdict` を export された純関数として実装(判別ユニオン: pass / fail{DROP_EXCEEDED|MISSING_CURRENT|MISSING_BASELINE|MALFORMED|EMPTY_POPULATION})
  - 比較は BigInt 整数厳密式 `10000·ch·bl − 10000·bh·cl >= −2·cl·bl`(0.02 百分点許容、等号は合格側)
  - parse-don't-validate: schemaVersion===1・非負整数・hits<=lines を検証してから型で運ぶ
  - `--check`: current=`coverage/coverage-totals.json`、base=`tests/.coverage-project-baseline.json` を実読して判定、失敗は理由コード+実測値を stderr、exit 1。成功は1行サマリ、exit 0
  - `--update`: current の emit を base へ転写(emit 不在なら拒否)
  - 入力パスは env(`AMADEUS_COVERAGE_TOTALS` / `AMADEUS_COVERAGE_PROJECT_BASELINE`)で差し替え可能(既存 ratchet の `AMADEUS_COVERAGE_RATCHET` と同型のテストシーム — テスト専用分岐ではなく注入点)
- [ ] **Step 3: ベースライン初期値(FR-2)** — worktree で `bun run coverage:ci` を実行し、`--update` で `tests/.coverage-project-baseline.json` を実測値から生成してコミット(手書き値の捏造禁止 — 実行結果由来)。
- [ ] **Step 4: テスト(NFR-1、Minimal 戦略)** — 新設 `tests/unit/coverage-project-gate.test.ts`(`// covers:` ヘッダ付き):
  - in-process: `evaluateGate` の境界値 — ちょうど −0.02pp(緑)/ それを厳密に超える最小低下(赤)/ MALFORMED 各種 / EMPTY_POPULATION / hits>lines 拒否
  - プロセス境界(`spawnSync` + temp tree + env 注入): (a) 低下注入 → exit 1 (b) totals 欠落 → exit 1 (c) baseline 欠落 → exit 1 (d) 閾値内 → exit 0 — 「落ちる実証」を実 exit code で固定
  - `bun tests/gen-coverage-registry.ts` で registry を再生成し、drift guard を green に保つ
- [ ] **Step 5: CI 配線(FR-3)** — `.github/workflows/ci.yml` の coverage ジョブ「Generate coverage reports」直後(artifact/Codecov upload の前)に `Project coverage gate` ステップ(`bun tests/coverage-project-gate.ts --check`)を追加。ci-success / require_result / needs は不変。
- [ ] **Step 6: codecov.yml(FR-6)** — `coverage.status.project` セクションのみ削除。`patch` / `ignore` / `fixes` はバイト不変。
- [ ] **Step 7: ドキュメント(FR-7)** — `docs/reference/09-testing.md` に新節「Project Coverage Gate」(EN): 母集団定義(正規化 LCOV 全体、tests/** 含む)/ Codecov UI との絶対値乖離が仕様である理由 / 0.02pp 判定式 / ベースライン更新手順(向上 PR 内 `--update`+レビュー)/ 意図的引き下げはユーザー承認事項。`09-testing.ja.md` にも同内容の日本語節を同時追加。
- [ ] **Step 8: 検証** — `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check`(core/harness 非改変の無影響確認)/ `bash tests/run-tests.sh --ci` を実行し、各 exit code を記録。新設ゲートの落ちる実証(Step 4 のケース)がスイート内で実際に赤→緑を検証していることを確認。

## トレーサビリティ

| ステップ | 要件 |
|---|---|
| Step 1 | FR-1(単一情報源 emit)、NFR-2(整数のみ) |
| Step 2 | FR-3(fail-closed 判定)、FR-4(欠落 fail)、FR-5(--update)、NFR-2(BigInt 厳密) |
| Step 3 | FR-2(コミット済みベースライン、実測由来) |
| Step 4 | NFR-1(落ちる実証+in-process seam)、NFR-4(既存ランナー統合) |
| Step 5 | FR-3(CI 配線、既存 require_result 相乗り) |
| Step 6 | FR-6(project 節削除) |
| Step 7 | FR-7(ドキュメント5点) |
| Step 8 | NFR-4(グリーン維持)、制約(dist 無影響確認) |

## 対象外(このユニットで実装しないもの)

- FR-8(#717/#734 close)— マージ時の leader 執行タスク(PR 作成時に PR 説明へ supersede 文言を記載して支援)
- ブランチ保護設定変更・Codecov 再連携(スコープ外)
