# Phase Check — construction(Intent 260807-tla-specs-relocation)

- Date: 2026-08-08(UTC)
- Phase: construction 境界(build-and-test 完了時点。self-refactor scope では ci-pipeline / operation フェーズは SKIP のため、build-and-test が construction 最終ステージ)
- 方法論: `.claude/knowledge/amadeus-shared/verification.md` に基づく traceability 検査
- 測定 ref: `worktree-tla-specs-space-relocation` HEAD = `bb12d0a74c81aac54b22d595928055093759da92`

## Construction → (Operation SKIP)チェック(All units built and tested)

self-refactor scope では ci-pipeline(3.7)以降が SKIP。単一 Unit `tla-specs-relocation` の実装・レビュー・検証の完結を確認した。

| チェック | 結果 | エビデンス |
|---|---|---|
| 要件が実装へトレースされる | PASS | `build-and-test-summary.md` の要件トレース表が FR-1〜9 / NFR-1〜4 の全件に担保面を対応付け。孤児 FR なし |
| 設計が実装へトレースされる | PASS | `code-summary.md` が E-1〜6 / BR-1〜15 の実装所在を file 単位で列挙。設計逸脱4件は同書「Key implementation decisions」と stage diary の Deviations に申告済み |
| Unit 成果物の完備 | PASS | `construction/tla-specs-relocation/code-generation/` に `code-generation-plan.md` / `code-summary.md` / `pr-convergence-report.md` の3件が実在(engine の produces 宣言と一致) |
| code-generation §12a | PASS | amadeus-architecture-reviewer-agent、iteration 1、verdict READY(BLOCKER 0、FOLLOW-UP 1=チェックボックス反映、是正済み)。Review projection が `code-generation-plan.md` へ append 済み |
| build-and-test 成果物の完備 | PASS | 7成果物すべて実在(instructions 5点 + summary + results) |
| センサー | PASS | required-sections 7/7 PASSED、upstream-coverage 7/7 PASSED(初回 FAILED 5件は上流入力ヘッダ欠落 → 本文の実参照とともに追記して再発火し全 PASS)。linter / type-check は code-generation 段で PASSED |
| 検証の実行 | PASS | typecheck exit 0、lint exit 0、source-only `clean`、graph invariants `OK (i)-(v)`。詳細は `build-test-results.md` |
| テストスイート | 条件付き PASS | ローカル `--ci` は 888 files / 11,864 assertions で failed files 3。3件すべてを未改変ベースとの分離 worktree 比較で ambient(active intent 実在)起因と立証。同一 SHA の CI `Tests` は pass |
| 形式検証(advisory) | PASS | `formal-model-check` never-run advisory(instance 38fed498)に対し engine 供給コマンドを相関3フラグ付きで実行 → `NOT_DETECTED` / exit 0。初回の ENVIRONMENT_UNAVAILABLE は mise の JAVA_HOME 上書き(Issue #2410)で、JDK 固定して再実行 |
| PR 収束 | PASS | PR [#2419](https://github.com/amadeus-dlc/amadeus/pull/2419) head = ローカル HEAD、`MERGEABLE` / `CLEAN`、必須チェック全件 pass、レビュー糸 9/9 解決。`pr-convergence-report.md`(plugin CLI 機械生成)が `converged: true` |
| §13 学習 | PASS | E-TSR-CGS13(2-0 established、GoA 2x2)で c2/c4/c6 を採用、c1/c3/c5/c7 を不採用。`amadeus-learnings.ts persist` が project.md へ3件を書き込み(`rule_learned: 3`) |

## 裁定の系譜

RE 差分 scan → E-TSR-RA1(4問一括、2-0)+ decide-question 4件 → requirements §12a READY → functional-design §12a READY → code-generation 実装・§12a READY(iteration 1)→ PR #2419 収束 → §13 選挙 E-TSR-CGS13(2-0)→ code-generation ゲート承認(autonomy full grant `intent-grant-648b88290755876fdc10272210387e4a`)→ build-and-test。

## 未解決事項 / 申し送り

- **ローカルスイートの ambient 依存3件**(`t17` / `t-runtime-dispatch-seam` / `t66`): active intent が存在するワークスペースでのみ再現する既存挙動。`lookup next-stage` が引数 scope より active intent の runtime graph を優先解決すること、および `runtime-graph.json` の実在が exit code を分けることに起因。本 intent のスコープ外のため未修正。立証手順は `build-test-results.md` を参照
- **wall-clock drift 5件**: いずれも本 intent の変更対象外ファイル。フルスイート並走時の負荷起因で、CI 側は pass
- **PR マージ**: 人間の明示承認が必要(no-AI-merge)。本ステージでは実行しない
