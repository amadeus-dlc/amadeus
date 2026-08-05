# Code Summary — fix-2285-cross-harness-resume

上流入力(consumes 全数): requirements.md

## 実装コミット(ブランチ worktree-tla-kimi-repro)

- `73bf309fd` fix(auth): make caller denials diagnosable and add a cross-harness recovery path
- `f31156e2a` chore(coverage): retire the two authorizeMainConductor patch waivers

## 変更ファイル(requirements.md FR 対応)

| ファイル | 内容 | FR |
|---|---|---|
| `packages/framework/core/tools/amadeus-caller-authorization.ts` | `:36` `CallerDenialReason` union(deny-latch / marker-absent / session-mismatch / active-role の4値)、`:54` `denied()`、`:146` `SESSION_TAKEOVER_VERB`、`:168` `callerAuthorizationError(denial)` = 原因+復旧手順付きメッセージ | FR-1 / FR-2 |
| `packages/framework/core/tools/amadeus-session-takeover.ts`(新設) | `:100` `planSessionTakeover`(純関数の判定)、`:145` `readSessionTakeoverFacts`、`:196` `applySessionTakeover`(fail-closed 順序の書込) | FR-4 |
| `packages/framework/core/tools/amadeus-state.ts` | `:923` 非ゲート verb リストへ `session-takeover` 追加、`:1019` dispatch、`:4283` `humanTurnGroundsTakeover`(1 HUMAN_TURN = 最大1 takeover)、`:4313` `handleSessionTakeover` | FR-4 |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | `:2405` 消費側更新(原因値対応) | FR-1 |
| `packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts` | `:251` `establishKimiMainBaseline` へ残存 `.lock` 除去を追加(FR-3 のギャップ実測→同 FR 内是正) | FR-3 |
| `packages/framework/core/otel/event-registry.ts` | `RECOVERY_COMPLETED.optionalAttributes: ["Reason"]` | FR-4(d) |
| `audit-format.md` / `docs/reference/12-state-machine{,.ja}.md` | emitter/属性の doc 同期 | FR-4(d) |
| `docs/guide/11-session-management{,.ja}.md` | 「Cross-Harness Handover」手順書(en+ja、原因別対応表含む) | FR-5 |
| `tests/integration/t448-caller-denial-reason.integration.test.ts`(新設) | FR-1 AC: (i) C1/C2/C3/C5 が互いに異なる原因値 (ii) C6=C1 同一の (b)、C4=authorized。FR-2 AC: 各原因値のメッセージに復旧コマンド名 | FR-1 / FR-2 |
| `tests/integration/t449-kimi-session-start-recovery.integration.test.ts`(新設) | FR-3 AC: C1/C2/C3 合成 → SessionStart 相当 → authorized の閉包 | FR-3 |
| `tests/integration/t450-session-takeover.integration.test.ts`(新設) | FR-4 AC (a)〜(f) — (f) は拒否状態 → verb → unpark 成功の経路テスト | FR-4 |

## verb の確定(requirements 未解決事項の解決)

- 名称: `session-takeover`、配置: `amadeus-state.ts`(`bun .claude/tools/amadeus-state.ts session-takeover --confirm [--confirm-roles <csv>] [--session-id <id>] [--project-dir <path>]`)
- 配置根拠: audit イベントは既存 `RECOVERY_COMPLETED` を使用し、`docs/reference/12-state-machine.md:214`「Every event has exactly one tool or hook emitter」(t48 の逆検査で強制)を維持するため、宣言済み emitter ファイルへ site する。認可ガードの明示 pass-list(get/count/lookup)へ `session-takeover` を追加(非ゲート verb のレビュー可能な一覧)
- 人間確認 UI: `--confirm` フラグ+audit 台帳の HUMAN_TURN 接地検査(`humanTurnGroundsTakeover` — 直前 takeover 以降の実 HUMAN_TURN を要求。1承認 = 最大1回)

## TDD 実測(Red → Green)

| Step | Red | Green |
|---|---|---|
| FR-1/FR-2(t448) | 10 fail / 2 pass | 12 pass |
| FR-3(t449) | 1 fail / 3 pass(fail は FR-3 が例示した `.lock` 残存そのもの) | 4 pass |
| FR-4(t450) | 10 fail / 3 pass | 13 pass |

## 検証(最終変更後、builder 実行+conductor 裏取り)

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0(conductor 再実行でも 0) |
| `bunx biome check`(tests/ packages/ scripts/ plugins/) | 0 |
| `bun run build`(8ハーネス+self-install) | 0 |

### conductor 裏取り(パス実在を ls で確認し、`Ran ... across N files` を指定数と照合。cid:build-and-test:test-path-set-completeness)

| run | 指定パス | 結果 |
|---|---|---|
| A | `tests/integration/t448-caller-denial-reason.integration.test.ts` / `t449-kimi-session-start-recovery.integration.test.ts` / `t450-session-takeover.integration.test.ts` / `t365-kimi-reviewer-boundary.integration.test.ts` / `t-kimi-adapter.test.ts` + `tests/unit/t10-hook-session-start.test.ts` | **113 pass / 0 fail / 494 expect、Ran across 6 files**(指定6=実行6) |
| B | `tests/unit/t28-audit-event-sync.test.ts` | 7 pass / 0 fail / 8 expect、across 1 file |
| C | `tests/integration/t48-audit-event-emitters.test.ts` / `t52-drift-meta-validation.test.ts` | 22 pass / 0 fail / 41 expect、across 2 files |
| — | `bun run typecheck`(conductor 再実行) | exit 0 |

**「t10」は2ファイル存在する**: 上表の t10 は `tests/unit/t10-hook-session-start.test.ts`(SessionStart 契約、green)であり、下記「既存赤」の `tests/e2e/t10-halt-and-ask-discard.test.ts` とは別ファイル。番号短形の同居は既知の生態(`cid:requirements-analysis:mechanism-cite-verify-at-draft` 追補)であり、本表はフルパスで一意化した。
| 宣言センサー(linter / type-check / event-registry-drift / self-scope-consistency) | SENSOR_FIRED 13 / PASSED 13 / FAILED 0(audit 実測) |

- t365 の既存 substring assert 全6件(:504/:536/:573/:646/:669/:689)は無改訂で green 維持(FR-2 AC 逐語充足)
- **NFR-1(env 非依存)の検証**: `grep -c AMADEUS_HARNESS_TYPE` の実測 = エラーメッセージ側 `amadeus-caller-authorization.ts` **0**、`amadeus-session-takeover.ts` **0**(復旧手段として案内していない)。手順書 `docs/guide/11-session-management{,.ja}.md` は各 **1** hit だが、その実文は `:153-155`「Setting `AMADEUS_HARNESS_TYPE` to a non-Kimi value also silences the guard, but it does so by switching the authorization boundary off rather than repairing anything — it is a known escape hatch, not a recovery route」であり、NFR-1 の「復旧手段として案内しない」+CON-4「既知の制約として文書化」を同時に満たす
- **FR-4 (a)〜(f) のテスト対応付け**(`tests/integration/t450-session-takeover.integration.test.ts` の test 名で一意化):
  - (a) 人間確認必須 → `:237` "refuses without --confirm and leaves the carrier and audit untouched" / `:253` "refuses when no human turn grounds the request" / `:264` "one human turn cannot authorize a second takeover"
  - (b) (a)(b)(c) 状態からの再バインド → `:368` "repairs the carrier named by --project-dir from an unrelated cwd"(marker 不在状態からの再バインド成功系。`:298` "an already-authorized session is a no-op, not a rebind" が冪等側の境界を固定)
  - (c) role 残存時の明示+確認 → 拒否側 `:311` "refuses and names the retained role when it is not acknowledged" / `:324` "rejects a --confirm-roles list that does not match the retained roles"、確認後の成功側 `:338` "rebinds once the retained role is acknowledged verbatim"
  - (d) audit 記録 → `:354` "appends a recovery row carrying the denial reason it repaired"
  - (e) `--project-dir` → `:368` "repairs the carrier named by --project-dir from an unrelated cwd"
  - (f) 実行後の疎通 → `:380` "next, park and unpark all pass after a takeover"
- NFR-4: `authorizeMainConductor` の allowlist waiver 2件は fingerprint 0-resolve の stale を実測 → 各 entry の `expiry` 条件(in-process driver 獲得時に除去)が t448 で成立したため**除去**(`f31156e2a`)。`parseActiveSubagents` entry は resolve OK で維持。no-silent-drop census 213/213/213 増加ゼロ。coverage の正規判定は PR CI(`cid:code-generation:local-lcov-pre-push`)
- 既存赤(自変更と無関係): `tests/e2e/t10-halt-and-ask-discard.test.ts` 2 fail(`WORKTREE_DISCARDED` 行欠落) — builder が未改変 base で同一失敗集合を再現して帰属確定(`cid:build-and-test:bt-20260730-2`)。上表の run A〜C には**含まれておらず**、したがって「0 fail」と両立する。Issue 起票候補として申し送り

## 逸脱

なし(`.lock` 是正は FR-3 本文が明示的に授権)。裁量2件を申告: (1) FR-5 手順書は新章でなく `11-session-management.md` の拡張(章番号空間の衝突回避 — shared-ledger-insert-collision)(2) t450 の当初過剰 assert(audit バイト不変)を要件の実契約(RECOVERY_COMPLETED 不在+state 不変)へ精密化
