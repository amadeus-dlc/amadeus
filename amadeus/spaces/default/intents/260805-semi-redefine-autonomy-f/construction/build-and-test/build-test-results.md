# ビルド・テスト実行結果 — intent 260805-semi-redefine-autonomy-f(#2253)

上流入力(consumes 全数): `code-generation-plan.md`(全 7 Unit)、`code-summary.md`(全 7 Unit)

測定 ref: conductor クローン `/Users/j5ik2o/.codex/worktrees/a0c4/amadeus-u2-quality-repair`、branch `conductor/2253-autonomy-flag`、HEAD `74b70f40b`。数値はすべて下記コマンドの実出力からの転記(記憶・見込みからの記載なし)。

## 1. ビルドと静的ゲート

| 検証 | コマンド | exit code | 出力の要点 |
|---|---|---|---|
| 依存導入 | `bun install --frozen-lockfile` | 0 | — |
| ビルド | `bun run build` | 0 | 全ハーネスの `dist/` とセルフインストール面を再生成(追跡ファイル不変) |
| 型検査 | `bun run typecheck` | 0 | `tsc --noEmit` × 2 プロファイル |
| Lint | `bun run lint` | 0 | Biome(既存 warning のみ、エラーなし) |
| source-only 境界 | `bun run source-only:check` | 0 | `source-only boundary: clean` |
| 複雑度 ratchet | `bun tests/complexity-gate.ts --check` | 0 | `0 new violations, 0 regressions, baseline 34 entries (worst CCN 38), threshold 15` |

## 2. テストスイート(正規判定)

```
bash tests/run-tests.sh --ci
```

**exit code 0 / `RESULT: PASS`**

| 指標 | 実測 |
|---|---|
| pass | 11,494 |
| fail | 0 |
| 実行テスト数 | 11,487 |
| 実行ファイル数 | 819 |
| `--- FAIL:` 行 | 0 |

test-size マトリクス(同 run の出力):

| scope | small | medium | large |
|---|---|---|---|
| smoke | 0 | 16 | 0 |
| unit | 213 | 162 | 1 |
| integration | 6 | 442 | 0 |
| **TOTAL** | **219** | **620** | **1** |

wall-clock drift: 4 file(s)(declared=medium / measured=large の既存申告差。本 intent が追加したテストは含まれない)

## 3. 本 intent が追加したテストの個別結果(同 run 内)

| ファイル | 結果 |
|---|---|
| `tests/unit/t448-autonomy-statusline-segment.test.ts` | PASS |
| `tests/unit/t449-autonomy-flag-parse.test.ts` | PASS |
| `tests/unit/t450-autonomy-flag-apply.test.ts` | PASS |
| `tests/unit/t451-semi-authority.test.ts` | PASS |
| `tests/unit/t452-authorize-interaction-semi.test.ts` | PASS |
| `tests/unit/t454-semi-policy-carrier.test.ts` | PASS |
| `tests/unit/t457-advisory-auto-resolve.test.ts` | PASS |
| `tests/unit/t459-advisory-receipt.test.ts` | PASS |
| `tests/integration/t450-autonomy-flag-branch.test.ts` | PASS |
| `tests/integration/t453-semi-ladder-runtime.integration.test.ts` | PASS |
| `tests/integration/t455-semi-policy-cli.integration.test.ts` | PASS |
| `tests/integration/t456-question-carveout-predicate.test.ts` | PASS |
| `tests/integration/t458-advisory-auto-resolution.integration.test.ts` | PASS |

## 4. 初回 run の赤とその帰属(切り分け記録)

同スイートの**初回**実行は `RESULT: FAIL`(exit 2、pass 11,490 / fail 4)。失敗は 4 件すべて no-silent-drop で、実文は

```
"code": "BASELINE_INVALID",
"detail": "current baseline previousDigest does not bind the trusted base bytes"
```

- 失敗ファイル: `tests/integration/no-silent-drop-gate.test.ts`、`tests/integration/no-silent-drop-repository-adoption.test.ts`
- 原因: PR #2355 の squash コミット(`c03a1e1fd`)を本クローンへ cherry-pick した際、同コミットに含まれる**main の base バイトへ再束縛済みの台帳**(`baseline.json` / `exemptions.json`)を取り込んだこと。本クローンの HEAD 系譜では当該束縛が成立しない。
- 是正: 台帳 2 ファイルを本クローン自身の束縛(cherry-pick 前 = `74b70f40b^`)へ戻した。対象 2 ファイルの単独実行で **74 pass / 0 fail**(254 expect)。
- 是正後のスイート全体が上記 §2 の `RESULT: PASS`。

本件は実装の欠陥ではなく、クローン間で台帳束縛が異なることによる record 面の状態差である。PR #2355 側では同一スイートが CI で `Tests SUCCESS`、fix worktree のローカル full CI でも `RESULT: PASS` を実測している。

## 5. formal-model-check(advisory 経路)

ladder が本 intent の pending advisory を **run-now** で自動裁定したため、engine の `await-advisory-choice`(`run_required: true`)が指定したコマンドを相関 3 フラグ付きで実行した。

```
run-model-check: NOT_DETECTED   (exitCode 0, errorCode null, counterexampleIdentity null)
runId: ef9a54da-80de-4ecf-97ec-f39eba17036f
```

- 対象: `specs/tla/FormalElection.tla` + `FormalElection.cfg`
- 相関: `--advisory-target specs/tla` / `--advisory-spec-identity sha256:60d8302c…` / `--advisory-instance 72a03174-2dc8-4c2f-8e5e-9a6997aabc36`
- 実行環境の逸脱申告: provider auto は JDK バージョン pin(`openjdk version "26.0.1"`)不一致で `ENVIRONMENT_UNAVAILABLE`。mise 環境では `bun` shim が `JAVA_HOME` を上書きするため、`mise x java@temurin-26.0.1+8 -- bun …` で JDK を固定して実行した。TLC の探索意味論に関与しない実行環境の固定であり、モデル・cfg・相関フラグは指令の逐語どおり。
- 実行後に `next` を再実行して advisory が解消(`await-advisory-choice` が消え `run-stage build-and-test` が返る)ことを実測。

## 6. 申し送り(未検証面)

- **本クローンの base 前進**: conductor クローンは origin/main に対して behind であり、本スイートは cherry-pick 済みの `#2355` 修正を含む状態で回している。main 上の最終形は PR #2355 の CI(全 check SUCCESS)で確認済み。
- **coverage 判定**: Project / Patch Coverage Gate の判定は CI を正とする(本 intent の実装は 7 PR すべてで CI green を通過して着地済み)。本ローカル run では coverage を計測していない(同一 worktree の coverage は単独所有者を要するため)。
- **wall-clock drift 4 件**: 既存申告差であり本 intent の追加テストは含まれない。
