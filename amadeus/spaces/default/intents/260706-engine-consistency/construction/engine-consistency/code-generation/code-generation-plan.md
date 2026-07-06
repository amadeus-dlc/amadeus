# コード生成計画 — unit: engine-consistency

上流入力は requirements.md（FR-1〜FR-4、NFR-1〜NFR-3、AC 5 行）である。
scope bugfix により functional-design は SKIP（設計どおりの不在）。設計判断は本書に記録する。
Test Strategy は Minimal（要件駆動。TDD: RED 先行）。実行単位は Bolt 3 本の同一 worktree 直列（NFR-1）、1 PR である。

## トレーサビリティ

| Step | 対応要求 | 対象 |
|---|---|---|
| Step 1 | FR-1.3 | RED 先行: engine-e2e に「末尾 skip 連続で完了する workflow」ケースを追加 |
| Step 2 | FR-1.1 / FR-1.2 | B001 実装: `amadeus-state.ts` complete-workflow の Current Stage クリアと Phase Progress Skipped 整合 + `PHASE_SKIPPED` emit |
| Step 3 | FR-1.1 随伴 | `amadeus-orchestrate.ts` `next` の closed-workflow sentinel `none` を done 解決（pdm-scope eval (f) が RED として検出） |
| Step 4 | FR-2.3 | RED 先行: docs-codekb-guards に stub なし Intent（codekb 直接解決）ケースを追加 |
| Step 5 | FR-2.1 / FR-2.2 | B002 実装: validator `lifecycle-v2.ts` の RE produces 判定へ共有 codekb 直接解決を追加（source + 昇格先の両側） |
| Step 6 | FR-3.3 | RED 先行: hooks-state-bugfix に SubagentStop 完了ガード 3 ケースを追加 |
| Step 7 | FR-3.1 + gate 追加指示 | B003 実装: `amadeus-log-subagent.ts` の完了ガードと agent_type 空文字の unknown 既定 |
| Step 8 | FR-3.2 | audit を書く他 hook（6 個）の適用可否実測と根拠記録 |
| Step 9 | FR-4 | parity-map 例外宣言（log-subagent 追加 + state/orchestrate reason 明記）と skills/ 正準反映（validator 両側） |
| Step 10 | AC-4 / AC-5 | 検証一式（parity:check、test:all、validator） |

## 実行ステップ

- [x] **Step 1: engine-e2e へ #547 ケース追加（FR-1.3、RED）** — 隔離 workspace で feature scope を birth し、21 stage completed + 末尾 8 stage（ci-pipeline + Operation 群）を skipped に設定、phase-check fixture を配置して complete-workflow を実行するケースを追加。実装前に「Current Stage が最終 stage のまま」「Operation の Phase Progress が Pending のまま」「PHASE_SKIPPED 未記録」で FAIL することを確認した（RED）。
- [x] **Step 2: B001 実装（FR-1.1 / FR-1.2）** — `handleCompleteWorkflow` へ (a) `Current Stage: none` の設定（advance finalize 経路 = state.ts:1243 の既存規約と同形）、(b) 完了 phase 以外で Phase Progress が Pending/Active のまま、かつ計画 stage の touched 全件が `[S]` の phase を `Skipped` へ更新し `PHASE_SKIPPED` を emit する処理を追加。not-started 混在 phase は対象外（既存挙動維持）。
- [x] **Step 3: `next` の none 解決（FR-1.1 随伴）** — Step 2 の `Current Stage: none` により、完了後の `next` が `none` を stage slug として解決し internal error になることが pdm-scope eval (f) で判明（advance finalize 経路由来の潜在バグ）。Branch 10 の checkbox 解決前に `currentSlug === "none"` を done として emit するガードを追加。
- [x] **Step 4: docs-codekb-guards へ #548 ケース追加（FR-2.3、RED）** — 実 record 260705-steering-learnings と共有 codekb を隔離 workspace へコピーし、stub 9 件を削除（memory.md は残す）した状態で validator が pass することを検査するケースを追加。実装前 FAIL を確認した（RED）。
- [x] **Step 5: B002 実装（FR-2.1 / FR-2.2）** — `lifecycle-v2.ts` の reverse-engineering produces 判定へ、record stub 不在時に `spaces/<space>/codekb/<repo>/<artifact>.md` の実在で pass させる分岐を追加（#501 の参照解決型判定の適用範囲拡大）。stub があれば従来どおり stub 判定（既存 record 非破壊 = FR-2.2）。`AmadeusValidator.ts` に `listDir` context を配線。source（skills/amadeus-validator）と昇格先（.agents/skills/amadeus-validator）の両側へ同一反映。
- [x] **Step 6: hooks-state-bugfix へ #555 ケース追加（FR-3.3、RED）** — SubagentStop hook を隔離 workspace で駆動する 3 ケース（完了済み Intent → no-op、進行中 Intent → SUBAGENT_COMPLETED 追記、agent_type 空文字 → `Agent Type: unknown`）を追加。実装前に 1・3 が FAIL することを確認した（RED。2 は既存挙動で pass）。
- [x] **Step 7: B003 実装（FR-3.1 + gate 追加指示）** — `amadeus-log-subagent.ts` へ (a) audit 存在チェック直後に `activeIntentIsComplete(projectDir)` ガード（#479 が mint-presence / stop hook に入れた判定と同一述語）、(b) `agent_type` 空文字を `unknown` に倒す既定変更（`??` は空文字を素通しするため truthiness 判定へ）を追加。GREEN 3/3 を確認。
- [x] **Step 8: FR-3.2 実測** — audit へ書く hook 6 個を grep で列挙し適用可否を判定。適用済み: mint-presence（#479）、log-subagent（本 Intent）。見送り（根拠つき、memory.md Interpretations に記録）: audit-logger（ARTIFACT_* は完了後編集の痕跡として有用）、session-start / session-end / validate-state（SESSION_* は session 境界の観測イベントで実害未観測。適用は後続 Issue 候補として gate 報告で申し送り）。
- [x] **Step 9: FR-4 parity 宣言と正準反映** — `engineFileExceptions` へ `hooks/aidlc-log-subagent.ts` を追加し、`exceptions` へ #547/#555/#547 随伴（orchestrate）の理由 entry を追加。skills/ にエンジン tools/hooks の正準コピーは存在しないため反映対象なし（find で実測）。validator は Step 5 で両側反映済み。
- [x] **Step 10: 検証一式** — `npm run parity:check` ok（199 engine files）、`npm run test:all` pass（engine-e2e / docs-codekb-guards / hooks-state-bugfix / pdm-scope 含む）。validator（Intent 指定）は commit 後に実行し code-summary.md に記録する。

## 設計判断（bugfix scope の設計確定地点）

1. **`next` の完了判定は Current Stage === "none" 比較で行う（Status 併用しない）。** `none` を書くのは advance finalize と complete-workflow の 2 終端経路だけであり、Status: Completed かつ Current Stage が実 slug という中間状態は存在しない。最小の精密なガードを選んだ。
2. **Phase Progress の Skipped 昇格は「touched 全件 skipped」に限定する。** not-started 混在 phase（未着手で閉じた phase）を Skipped にすると、scope 除外由来の Pending と区別がつかなくなる。#547 の実害（末尾 skip 連続）に対応する最小変更。
3. **codekb 直接解決は reverse-engineering の produces に限定する（FR-2 スコープ外条項どおり）。** 他ステージの produces 判定は変更しない。
4. **SESSION_* hook への完了ガード拡大は見送る。** 実害未観測であり、Right-Sizing 防護規定（暫定機構への作り込み禁止）に従う。後続 Issue 候補。
