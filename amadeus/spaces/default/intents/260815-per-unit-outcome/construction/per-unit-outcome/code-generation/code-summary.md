# Code Summary — unit per-unit-outcome(Issue #3099)

> 実装: bolt worktree `.amadeus/worktrees/bolt-per-unit-outcome`(branch `bolt-per-unit-outcome`、base `78146f435a`)。builder subagent による TDD 実装。検証コマンドと結果は builder の実測報告からの転記(逐語)で、blocking 検証はリモート CI を正とする(push-first)。

## Commits(4)

- `3e4e1ac88` fix(orchestrate): settle per-unit Construction outcomes on the engine dispatch path
- `44260721d` test(orchestrate): pin pool precedence, batch join, idempotency and row integrity for settled per-unit outcomes
- `61310d044` docs(guide): document recovery for a Construction parked on producer-outcome-pending
- `1343b7545` docs(orchestrate): state what next's read-only contract covers

## 実装(選挙裁定 C/C2 準拠・逸脱なし)

- 新監査イベント `UNIT_OUTCOME_SETTLED`(OTel `amadeus.unit.outcome.settled`、category bolt)。attributes: `Stage / Unit / Batch / Outcome / Idempotency Key`
- 発行点: `emitPerUnitRunStage` の compiled-DAG 経路。covered かつ非 cancelled の unit へ、鍵 `<stage> <unit> <batch>` の既存行を読んでから append(冪等・now-only)
- 読み口: `readPerUnitConsumePopulation` の pool ループは逐語保存。追加読取は batch join + currentUnits 所属 + **pool 優先スキップ** + stage 別複数行の collapse
- 不変面: `amadeus-unit-pool-runtime.ts` / `CONSTRUCTION_AUDIT_EVENTS` / `amadeus-lib.ts:8416`(幅1 guard)

## TDD・落ちる実証(実測転記)

- **Red(主再現)**: `t533 …> settles per-unit Construction outcomes so a pool-free population fans out`(t533-per-unit-consume-fanout.integration.test.ts:371)— `producer-outcome-pending: unit-z, unit-a`、bun test exit 1(既存 14 ケースは Green のまま)→ 実装後 Green
- **Red(改竄 fail-closed)**: join 鍵を剥いだ settle 行 → `invalid-unit-outcome-audit-row` 期待の Red(:497)→ Green
- **注入 3 本(1 セット・残渣ゼロ機械確認)**: INJ1 pool 優先 de-dup 削除 → `producer-outcome-ambiguous` / INJ2 batch join 削除 → `producer-outcome-failed`(テストを識別可能ケースへ強化のうえ実測)/ INJ3 冪等読取削除 → settle 2 行。revert 後 t533 18 pass exit 0

## Green(実測転記・すべて exit 0)

- t533 integration 20 pass / targeted 16 ファイル 269 pass(実行前 全 path `test -f` 実在確認、実行後 "Ran 269 tests across 16 files" 一致)/ swarm guards 5 ファイル 98 pass
- `typecheck` / `lint` / `build`(追跡ファイル不変・`git status --short` 空)/ `source-only:check` clean
- 配送先実測: `.claude/tools/amadeus-audit.ts`・`dist/claude/…`・knowledge 投影の 3 面で `UNIT_OUTCOME_SETTLED` 実在

## 台帳・文書同期(FR-6)

event-registry(EXPECTED_CANONICAL_COUNT 92→93)/ amadeus-audit.ts(VALID_EVENT_TYPES・EVENT_HEADINGS・stale 85→93 是正)/ audit-format.md 正本(90→93 是正 + Construction Bolt Events 4→5)/ 12-state-machine.md + .ja / t28 ピン 92→93 / event-registry-drift ピン 6 箇所 / coverage-registry regen(--check 1→0)/ coverage-ratchet audit 44→45 / model-map impl ピン resync(`f3c8d32d5d68`)。allowlist 再アンカーは不要(t534/t535/t537 Green)

## FR-5(回復手順)

`docs/guide/15-troubleshooting.md` + `.ja.md` に「Construction Finished but the Next Stage Refuses (producer-outcome-pending)」節。回復 = `/amadeus --stage code-generation` でカーソルを戻し `/amadeus` で前向き settle(pool 捏造なし)。`--single` は settle しない(isolated 契約)ことをテストで実測固定

## 検証済み面 / 未検証面(verdict 用の書き分け)

- 検証済み: fanout 到達性(FR-1/2)・pool 優先 de-dup(留保4)・batch join 保存(FR-3)・冪等(留保1)・swarm 無退行(FR-7 対象スイート)・台帳同期(FR-6)・配送 3 面
- 未検証(受け入れ基準の外・申し送り): (1) **cancelled unit は per-unit 経路で settle 行を持たず pending が残る**(裁定 attributes が Outcome=succeeded のため設計逸脱を避けて未実装 — 別途裁定事項) (2) 回復手順中の `amadeus-jump.ts execute` 実駆動(テストはカーソル pivot を直接再現) (3) ローカルフルスイート・coverage(リモート CI 所有)
