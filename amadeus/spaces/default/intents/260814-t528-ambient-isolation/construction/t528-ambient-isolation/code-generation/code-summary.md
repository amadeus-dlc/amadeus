# Code Summary — t528-ambient-isolation(Issue #2981)

## 変更ファイル

- `tests/integration/t528-report-ack-kind.integration.test.ts`(+68 / −4。`git diff --stat` 転記)— 唯一の変更。production コード(`packages/`)不変。

## 実装内容(FR 対応)

- **FR-1**: テスト #3 を `proj = freshProject()` の explicit projectDir 渡しへ修正(旧: `handleReport(..., undefined)` の ambient フォールバック)。テスト名を `a failed result remains a typed error directive without a repair loop` に改名し分岐対の片側であることを明示。
- **FR-2**: 新テスト `a failed result under a repair loop asks for the typed failure` を追加。`semiAutonomyProject()` ヘルパは production 書込 API のみ使用(`mintHumanPresence` → `applyProductionAutonomyMode({mode:"semi"})`。`runsQualityRepair` の再実装なし — PBT オラクル相殺の回避)。seed は `Construction Autonomy Mode` フィールドを持つ `state-construction.md`(strict field writer が不在フィールドの挿入を拒否するため。コメントに理由記載)。
- **FR-4**: `beforeEach` に `STOCK_GRAPH` 実在の前提検査を追加。不在時: `stock stage graph missing at <path> — run \`bun run build\` to generate dist/ before this test`。

## TDD / 落ちる実証(すべて実測、scratch: `<session-scratchpad>/cg/`)

- **修正前の赤(FR-3)**: 本 worktree の baseline で未修正 t528 が `5 pass / 1 fail`(exit 1)— cwd 祖先 marker が本 worktree を解決し active intent(260814、full autonomy)で `runsQualityRepair`=true。verbatim: 期待 `Unknown --result "failed"` / 実際 `report --result failed requires --failure <detail> — the typed failure the stage's referee returned.`。env 注入不要で再現(注入セット: env のみ・ファイル残渣なし)。semi fixture(`readProductionAutonomyProjection(F)?.mode === "semi"` 実測)経由の再現も別途実施。
- **FR-2 の反転実証**: 新テストの fixture を `freshProject()` に落とす変形で赤(`Expected to contain: "requires --failure"` / `Received: "Unknown --result \"failed\"..."`)→ revert、diff IDENTICAL 確認。
- **FR-4 の落ちる実証**: `STOCK_GRAPH` を不在パスへ向けた変形で `0 pass / 7 fail` 全件新メッセージ → revert、`grep -c "stage-graph-absent"` = 0 で残渣ゼロ確認。

## 検証(実測 exit code)

| コマンド | 結果 |
|---|---|
| `bun test tests/integration/t528-report-ack-kind.integration.test.ts`(env なし) | exit 0、7 pass / 0 fail |
| 同(`CLAUDE_PROJECT_DIR=<semi fixture>`) | exit 0、7 pass |
| 同(`CLAUDE_PROJECT_DIR=$PWD` = full autonomy 実 intent) | exit 0、7 pass |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0(error 0。warning 463 / info 17 は既存水準) |
| conductor 独立再実測(env なし / `CLAUDE_PROJECT_DIR=$PWD`) | exit 0、7 pass ×2 |
| 実 record 監査純度 | テスト実行前後で本 intent audit shard の md5 不変(conductor 実測 `c21bc636ef18551a70cb7a8e9efe0726`)。builder 実測時の shard 差分はセッション自身の PostToolUse センサーフック由来(`amadeus.sensor.*` 行のみ)でテスト由来書込ゼロ |

## 計画からの逸脱

- Step 1 の落ちる実証は「scratch fixture への env 注入」を予定していたが、本 worktree の baseline がそのまま赤(機序 A の自然発火)であり、env 注入なしの素の実測+semi fixture 実測の両方を記録した(計画より強い証拠)。
- `semiAutonomyProject()` に `resetOtelPerProject()` を挿入(OTel の one-workspace-per-process 不変量対応)。`afterEach` 側へのリセット追加はスコープ外として見送り(残課題として記録)。

## 残課題

- FR-5(Issue #2981 への機序 B 実測追記、E2 の新 Issue 起票)は gh create/comment の人間承認境界(project.md Mandated)に従いドラフトを最終報告で提示する。
- `afterEach` での `resetOtelPerProject()`(テスト実行順変更への堅牢化)は将来変更時の検討事項。
