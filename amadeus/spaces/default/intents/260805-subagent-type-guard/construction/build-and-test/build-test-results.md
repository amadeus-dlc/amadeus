# Build and Test Results — Issue #2279

**測定日時**: 2026-08-06T05:0xZ(本ステージ実行時)
**対象**: ブランチ `260805-subagent-type-guard`(HEAD `e62b7fa33`)
**上流入力**: 3 Unit の `code-generation-plan.md` / `code-summary.md`

全数値は実際のコマンド出力からの転記である(検証劇場 Forbidden)。

## ビルド

| コマンド | exit | 備考 |
|---|---|---|
| `bun run build` | **0** | 8 ハーネス面を再生成 + promote-self 同期(NFR-1 parity) |
| `bun run typecheck` | **0** | 本体 + tests の 2 プロジェクト |
| `bun run lint` | **0** | warning 426(既存ベースラインの cognitive-complexity 等)、**エラー 0** |

## 受入ゲート

| ゲート | 結果 |
|---|---|
| `bun tests/complexity-gate.ts --check` | **OK** — 0 new violations / 0 regressions(baseline 34 entries, worst CCN 38) |
| `bun tests/gen-coverage-registry.ts --check` | **exit 0**(fresh) |
| `bun tests/callsite-guard.ts --check` | **OK** — 0 new call sites / 0 remaining(shrink-only) |
| `bun run source-only:check` | **clean** |

## テスト — Issue #2279 の対象集合

```
bun test tests/unit/t451… t453… t460… tests/integration/t452… t454… t461…
```

| ファイル | 件数 | 結果 |
|---|---|---|
| `t451-subagent-type-classify`(unit) | 13 | pass |
| `t453-subagent-model-resolve`(unit) | 10 | pass |
| `t460-subagent-stats-compose`(unit) | 18 | pass |
| `t452-subagent-observability`(integration) | 10 | pass |
| `t454-subagent-model-attribution`(integration) | 13 | pass |
| `t461-subagent-stats`(integration) | 9 | pass |
| **合計** | **73** | **73 pass / 0 fail / 678 expect** |

## テスト — CI スイート全体

```
bun run test:ci   # = bun tests/run-tests.ts --ci
```

| 指標 | 値 |
|---|---|
| Test files | 848 |
| Failed files | **5** |
| Total assertions | 11,257 |
| Failed assertions | **10** |
| exit code | 5(FAIL) |

### 失敗 5 ファイルの切り分け — **既存事象・本 Intent 起因ではない**

失敗は no-silent-drop センサス / mechanism ratchet / unchecked-cast allowlist 系に
集中している。本 Intent が `catch` を追加しているため起因を疑い、**変更前コミット
`413e67523` の分離 worktree で同一ファイルを実行して比較**した。

| 対象 | 変更前(413e67523) | HEAD | 判定 |
|---|---|---|---|
| `no-silent-drop-repository-adoption` + `no-silent-drop-gate` | 70 pass / 8 fail | 70 pass / 8 fail | 失敗集合が**完全一致** |
| `t-coverage-mechanism-ratchet` + `t413-no-silent-drop-ci-adoption` + `t420-unchecked-cast-guard-cli` | 25 pass / 12 fail | 25 pass / 12 fail | 失敗集合が**完全一致** |

失敗テスト名の差分は `diff` で **0 件**。したがって 5 ファイルは変更前から赤であり、
本 Intent の変更による回帰ではない。

**根本原因(観測)**: no-silent-drop ゲートは信頼できるベース revision を要求する
(`bun tests/no-silent-drop-gate.ts check` → `BASELINE_INVALID: check mode requires a
non-zero trusted base revision`)。本ブランチは origin/main と 13 / 51 コミット分岐
しており、ベース解決に依存するこれらのガードがこの作業ツリーでは成立しない。
リポジトリ側の課題であり、本 Intent のスコープ外。

### 参考: スイート単位の内訳(個別実行)

| スイート | 結果 |
|---|---|
| `tests/smoke` | 368 pass / 0 fail(16 ファイル) |
| `tests/unit` | 898 pass / 0 fail |

## 性能(受け入れ基準ではない — 観測記録)

**測定 ref**: シャード 216 / audit 行 127,715 / 6,874 completed + 65 started

| 測定 | 実測 |
|---|---|
| 集計 CLI 全走査 | **0.163s** real |
| 空スコープ起動 | 0.049s real |

## 形式手法(advisory)

| 項目 | 結果 |
|---|---|
| `run-model-check --provider docker`(`FormalElection`) | **NOT_DETECTED / exit 0**(反例なし、1m48s) |
| 診断ランナー `FormalElection` | 完了 — 生成 5,203,730 states / distinct 529,692 / depth 9 |
| 診断ランナー `MirrorLifecycle` | 完了 — 生成 208,628 / distinct 89,099 / depth 18 |

**既知の環境問題**: macOS の既定 provider(`auto` → sandbox-exec)は
`ENVIRONMENT_UNAVAILABLE` で失敗する(env-receipt の planner が
`sandbox-exec-unavailable`、全 inspection が `not-run`)。`--provider docker` を
明示すると正常に完走する。本 Intent のスコープ外だが、後続の課題として残す。

## 判定

- **ビルド**: 成功
- **本 Intent のテスト**: 全数 green(73/73)
- **CI スイート**: 5 ファイル赤だが、変更前と同一の失敗集合であり回帰なし
- **未修正で残る失敗**: 上記 5 ファイル(リポジトリ既存の課題、ベース revision 依存)
