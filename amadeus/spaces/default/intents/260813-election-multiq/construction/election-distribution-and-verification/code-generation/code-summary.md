# Code Summary — election-distribution-and-verification

## 結果

正本 `amadeus-election` skill は単問 `question` だけの起動説明だった。4 節構造と禁止語彙は維持したまま、multi-question definition、`responses[]`、mixed result、hold-only rerun の指令転送を追加した。`bun run build` で Claude / Codex 投影を同期し、生成面は直接編集していない。

公開 CLI トークン `amadeus-election.ts` は、定義または保存済み選挙が明示的な `schemaVersion: 2` のときだけ v2 CLI へ転送する。legacy（`schemaVersion` なし）は既存の `--result` ループのまま残し、v2 store の dual-read を奪わない。

`cid:requirements-analysis:always-elect` の「1選挙1質問」は、t558 の Red（skill / dispatch 欠落）を先に固定したあと、検証済みの複数 question / question 単位回答 / mixed / hold-only rerun 契約へ更新した。active memory に `E-SRA-RAS13` と `election-cli-canonical` は再出現していない。

## 変更ファイル

| Path | 変更 |
|---|---|
| `packages/framework/core/skills/amadeus-election/SKILL.md` | multi-q definition、`responses`、`targetQuestionIds` / `held` / `preservedResultDigest`、v2 は `--file` 転送、hold-only rerun は verb を字義実行 |
| `packages/framework/core/tools/amadeus-election.ts` | 明示 v2 だけを `amadeus-election-v2-cli.main` へ peek-and-forward |
| `amadeus/spaces/default/memory/team.md` | `always-elect` を検証済み multi-q 契約へ更新 |
| `tests/integration/t558-election-distribution-packaging.integration.test.ts` | skill 語彙、投影、memory scan、公開 CLI の v2 / legacy ループ |
| `.../code-generation/code-generation-plan.md` | Standard-depth plan と実結果に基づく完了状態 |
| `.../code-generation/code-summary.md` | 本実装・検証結果 |
| `.../code-generation/pr-convergence-report.md` | local convergence evidence |

## 要件トレーサビリティ

| Requirement / rule | 実装・検証 |
|---|---|
| FR-OBS-2 AC1 | 正本 skill が `questions` / `responses` / `targetQuestionIds` / `held` / `preservedResultDigest` / mixed / hold-only を説明。t558 + t242 |
| FR-OBS-2 AC2 | 単問 legacy は t558 / t237。1問 canonical は `questions[]` 1要素として skill が説明 |
| FR-NORM-1 | `always-elect` から「1選挙1質問」を除去し、複数 question / 混在 / hold 中 rerun を記述。t558 |
| FR-NORM-2 | `amadeus/spaces/default/memory/` の source scan で `E-SRA-RAS13` / `election-cli-canonical` 0 hit。t558 |
| NFR-2 意味互換 | t237 と t558 legacy ループが単問を完走。t553 / t554 / t555 が mixed / hold-only を完走 |
| NFR-2 性能 | 未検証。U8 は skill / peek / norm の包装であり、parse→tally 経路の 30 回 p95 比較は未実施 |
| NFR-5 | focused tests、typecheck、lint、build、source-only、coverage registry、completeness。model-map は U8 で FormalElection impl を変更していない |

## TDD 証拠

- t558 追加直後: skill 語彙・投影・always-elect・v2 dispatch が Red。memory scan と非対象 harness 省略は既存状態で Green。
- skill / dispatch / norm 適用後: `bun test --timeout 120000` t558 + t242 + t237 は exit 0、18 pass / 0 fail。
- mixed / hold-only walking skeleton: t553 + t554 + t555 は exit 0、6 pass / 0 fail。

## 検証結果

| Command | Result |
|---|---|
| focused t558 / t242 / t237 | exit 0、18 pass / 0 fail |
| t553 / t554 / t555 | exit 0、6 pass / 0 fail |
| `bun run build` | exit 0。Claude / Codex 投影が multi-q 語彙を保持 |
| `bun run typecheck` | exit 0 |
| `bunx @biomejs/biome check`（U8 所有 2 ts + skill + team.md） | exit 0。`handleReport` の既存 complexity warning のみ（本差分外） |
| `bun run source-only:check` | exit 0、source-only boundary clean |
| `bun tests/gen-coverage-registry.ts --check` | exit 0、registry OK |
| completeness sensor | `{"pass":true,"findings_count":0,"findings":[]}` |
| `git diff --check`（U8 所有ファイル） | exit 0 |

## 計画からの逸脱

- 公開 CLI に明示 v2 だけの thin dispatch を追加した。skill が同じトークンを名指しするため、包装の正直さに必要だった。tally / store は再実装していない。
- NFR-2 の baseline/treatment 30 回 p95 は未実施。包装差分の測定面ではないため未検証面へ記録する。
- repository-wide `bun run test:ci` と隔離 2 回 reproducible-build は本 unit では実行していない。
- API / repository / DB / frontend / deployment は U8 境界に存在しないため生成していない。
