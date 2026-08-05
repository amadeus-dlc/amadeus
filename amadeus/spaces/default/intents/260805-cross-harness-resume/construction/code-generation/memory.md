<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-05T14:55:00Z — verb 配置は amadeus-utility.ts でなく amadeus-state.ts(session-takeover)— RECOVERY_COMPLETED の単一 emitter 契約(12-state-machine.md:214、t48 逆検査)を維持するため。builder の裁量2件(FR-5 は既存章拡張 / t450 assert の精密化)は conductor が妥当と判定
- 2026-08-06T00:20:00Z — §12a iteration 1 BLOCKER(「161 pass / 0 fail」と t10 既存赤2件の自己矛盾)の正体は **t10 が2ファイル存在すること** — 集計に入っていたのは tests/unit/t10-hook-session-start.test.ts(green)、既存赤は tests/e2e/t10-halt-and-ask-discard.test.ts。builder の短形表記が両者を同一視させた。是正: 全 run をフルパス+`Ran ... across N files` の指定数照合付きで再実測(A 113 pass/6 files、B 7 pass/1 file、C 22 pass/2 files)して確定値へ差し替え
- 2026-08-05T14:55:00Z — conductor 裏取りで builder 指定のテストパス誤り(t448-caller-denial-diagnosis→実名 t448-caller-denial-reason)により bun が1ファイルを無音除外(4指定→3実行)— ls 実測で正名確認し再実行、全4ファイル green(cid:build-and-test:test-path-set-completeness の実践)

## Open questions(申し送り)
- **週次蒸留ラウンドへの回付(E-CHR-CGS13 両票の留保)**: 短形 tNNN 表記に起因する誤帰属が RA(260723-fixture-shard-pollution)に続き本 CG でも再発 — 違反実例カウントとして `cid:requirements-analysis:weekly-distillation-round` へ回付する。再発が続く場合は prose 追補でなく機械化(検証エビデンス中の tNNN 短形を検出する lint/sensor)を蒸留で裁定するのが筋。検証エビデンス面で同型の自己矛盾がもう一度再発した時点で `cid:build-and-test:test-path-set-completeness` への追補へ昇格させる(条件付き)
- 既存赤 tests/e2e/t10-halt-and-ask-discard.test.ts 2 fail(WORKTREE_DISCARDED 行欠落)— 未改変 base で同一失敗集合を再現済み(自変更と無関係)。Issue 起票候補
- coverage patch gate の正規判定は PR CI で確定(allowlist waiver 2件除去の妥当性 = t448 の in-process driver 化)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
