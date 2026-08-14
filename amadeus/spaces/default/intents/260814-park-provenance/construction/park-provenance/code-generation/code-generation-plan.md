# Code Generation Plan — park-provenance

Unit: Issue [#3016](https://github.com/amadeus-dlc/amadeus/issues/3016)(FR-1〜FR-6、NFR-1〜4)。Scoped from `requirements.md`(user-stories SKIP のため FR へ直接トレース)。

Traceability(step → FR): S2-S3 → FR-1, FR-2 / S4 → FR-3 / S5 → FR-4 / S6 → FR-5 / S7 → FR-6 / S8 → NFR-3 / S9 → NFR-4。

RA レビュー FOLLOW-UP の反映: (a) upstream-coverage の3語参照は本 plan の成果物 summary 起草時に requirements 側とあわせ整合を確認 (b) `tests/.coverage-registry.json:897-905` の `WORKFLOW_PARKED` → `t17.test.ts` 対応は S2 のテスト書き換えで維持されることを S8 で照合。Open question の裁定: `WORKFLOW_PARKED` へ**新規属性は足さない** — turn の消費は presence ledger の順序(park イベントが resolution として後置される)から導出でき、event-registry / audit-format / docs の同期コストを避ける(NFR-3 の registry 同期は非発火)。

- [ ] Step 1: Bolt worktree 準備 — origin/main 起点の `bolt-3016-park-provenance` を作成し `bun install` + `bun run build`
- [ ] Step 2: RED(slice 1) — `t17.test.ts:1222-1235` の一律拒否テストを新契約へ書き換え: (a) autonomous + 未消費 HUMAN_TURN(`mintHumanPresence` fixture、seed は `Construction Autonomy Mode` フィールドを持つ state fixture — `cid:code-generation:c2` に従い `state-construction.md` 系 + `resetOtelPerProject`)→ 受理(exit 0・`Parked` marker・`WORKFLOW_PARKED`)。現行実装で赤を実測 (b) turn 不在 → 拒否維持(既存挙動)
- [ ] Step 3: GREEN(slice 1) — `handlePark`(`amadeus-state.ts:1583-1587`)を置換: autonomous のとき fail-closed 述語(`outstandingHumanTurns` 系、active-scope fail-open と env バイパス不使用)で未消費 turn を判定し、あれば受理。拒否文面は「fresh な人間ターンが無い」ことを述べる形へ更新。虚偽コメント(`:1573` 付近)を実態へ是正
- [ ] Step 4: RED→GREEN(slice 2, consume-once) — 受理された park が当該 turn を消費する(park 後の再 park が turn 不在拒否になる)テストを先に赤で実測し、`WORKFLOW_PARKED` を presence ledger の resolution として消費計上する最小実装で green(新規イベント属性は追加しない)
- [ ] Step 5: RED→GREEN(slice 3, resume+grant) — park → `--resume`(Branch 2.6)往復で `Intent Autonomy Mode` / grant Id 不変のテストを追加(既存挙動なら characterization として green 確認、赤が出た場合のみ最小修正)
- [ ] Step 6: RED→GREEN(slice 4, engine 層) — orchestrate `park` 経路の受理/拒否パススルーを固定する統合テストを新設(現状全域不在を R2 で実証済み)。t122 の該当断面(`:504-546`)と行ピン drift コメント(`:496`/`:519`)を新契約へ是正
- [ ] Step 7: docs 4面同期 — `docs/reference/12-state-machine.md`/`.ja.md`(`:139` 付近)、`06-hooks-and-tools.md`/`.ja.md`(`:260`/`:258` 付近)を新契約(fresh turn 受理・unattended 拒否・grant 保持)へ同一コミットで更新
- [ ] Step 8: 台帳 resync — `bun plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts updateModelMap --impl-only`(model-map の実装ハッシュピン4件。手編集禁止)。coverage allowlist は state 側 `handlePark` に免除エントリ無しを確認(orchestrate 側 4 件は行シフト時のみ semantic selector 再アンカー)。`coverage-registry.json` の `WORKFLOW_PARKED`→t17 対応の維持を照合
- [ ] Step 9: 検証 — `bun run build`(追跡ファイル不変)/ `bun run typecheck` / `bun run lint` / `bun run source-only:check` / `bun run distribution:check` / フルスイート `bash tests/run-tests.sh --ci`(テスト新設のため必須)/ `coverage-patch-quick` advisory

Test strategy: Comprehensive(self-fix: 対象バグへのリグレッション必須 + 既存 green 維持)。TDD は S2→S3、S4、S5、S6 の vertical slice で適用(各 slice で Red 実測 → 最小実装 → Green)。
