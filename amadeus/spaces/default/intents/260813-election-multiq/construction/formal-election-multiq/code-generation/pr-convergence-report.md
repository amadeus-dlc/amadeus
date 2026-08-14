# 収束レポート — formal-election-multiq

## 判定

**READY（local U7 implementation scope）**。既存 FormalElection の多問 state / I1–I8 を維持したまま、rebase 後の live identity 束縛と FR-FML-1 の established / held-only mutant 反証を閉じた。U7 所有テスト、現行 FormalElection の TLC `NOT_DETECTED`、typecheck、lint、source-only は成功した。

リモート review thread、mergeability、必須 check rollup は本 directive の対象外であり、外部状態の照会・更新は行っていない。このレポートは local U7 code-generation の検証断面だけを示す。

## 観測断面

- observed at: `2026-08-14T06:46:06Z`
- HEAD: `a94c655704ea`
- branch: `enhancement-election-cli-cli-per-question-choice`
- scope: `self-feature`（Amadeus self-development の機能拡張）
- rebase: `origin/main` 上へ 12 commit を rebase。codekb 見出しと `intents.json` の双方意図を残して衝突を解消した。

## 実行証拠

| Command | Result |
|---|---|
| `bun test --timeout 120000` t557 + t404 + t-formal-verif-tla-model | exit 0、23 pass / 0 fail |
| `bun test --timeout 120000` t380 | exit 0、12 pass / 0 fail |
| `AMADEUS_RUN_REAL_TLC=1` FormalElection production | `NOT_DETECTED`、exit 0 |
| `AMADEUS_RUN_REAL_TLC=1` EstablishedImmutable / HeldOnlyTargets / PerQuestionIsolation mutants | いずれも COUNTEREXAMPLE |
| `bunx @biomejs/biome check`（U7 test 2 files） | exit 0、diagnostic なし |
| `bun run typecheck` | exit 0 |
| `bun run source-only:check` | exit 0、source-only boundary clean |
| `git diff --check`（U7 所有ファイル） | exit 0 |
| completeness sensor | `{"pass":true,"findings_count":0,"findings":[]}` |

## 収束対象

- Contract gap: rebase 後も FormalElection identity は一致していたが、live 再計算の回帰と FR-FML-1 AC1 の established / held-only mutant が無かった。
- Fix: `t557` で live identity / completeness を固定。REAL TLC 面に EstablishedImmutable wipe と HeldOnlyTargets rerun の COUNTEREXAMPLE を追加。
- Evidence gap: formal-model-check の旧 receipt は現行 FormalElection bytes と不一致。
- Fix: 現行 source で `NOT_DETECTED` を取り直し、旧 receipt は上書きしない。
- Change isolation: FormalElection source / model-map は無変更。追加は test 2 files と宣言済み stage artifacts。Intent state と commit は変更していない。

## 未収束面

- repository-wide `bun run test:ci` は本 unit では実行していない。U7 所有外の既知失敗を BLOCKER に転嫁しない。
- coverage gates、隔離2回 reproducible-build、外部 repository hosting の review/check 状態は本 U7 code-generation directive では個別実行・照会していない。
- REAL TLC performance 測定は `AMADEUS_RUN_REAL_TLC_PERFORMANCE` 未設定のため skip。

## Blocker

なし。
