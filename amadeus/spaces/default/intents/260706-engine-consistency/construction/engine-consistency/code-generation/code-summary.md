# コード生成サマリ — unit: engine-consistency

対象 Issue: [#547](https://github.com/amadeus-dlc/amadeus/issues/547) / [#548](https://github.com/amadeus-dlc/amadeus/issues/548) / [#555](https://github.com/amadeus-dlc/amadeus/issues/555)

## 変更ファイル

| ファイル | Bolt | 内容 |
|---|---|---|
| `.agents/amadeus/tools/amadeus-state.ts` | B001 | complete-workflow に Current Stage: none 設定と、touched 全件 `[S]` の phase の Phase Progress → Skipped + `PHASE_SKIPPED` emit を追加 |
| `.agents/amadeus/tools/amadeus-orchestrate.ts` | B001 随伴 | `next` Branch 10 で closed-workflow sentinel `none` を done に解決（advance finalize 経路由来の潜在バグ） |
| `dev-scripts/evals/engine-e2e/check.ts` | B001 | RED 先行ケース「#547 末尾 skip 連続」追加（Current Stage=none / Operation=Skipped / PHASE_SKIPPED 記録を検証） |
| `skills/amadeus-validator/validator/lifecycle-v2.ts` | B002 | RE produces へ共有 codekb 直接解決（stub 不在時に `codekb/<repo>/<artifact>.md` の実在で pass）を追加。source 側 |
| `.agents/skills/amadeus-validator/validator/lifecycle-v2.ts` | B002 | 同上（昇格先） |
| `skills/amadeus-validator/validator/AmadeusValidator.ts` | B002 | `listDir` context 配線と `listDirNames` helper 追加。source 側 |
| `.agents/skills/amadeus-validator/validator/AmadeusValidator.ts` | B002 | 同上（昇格先） |
| `dev-scripts/evals/docs-codekb-guards/check.ts` | B002 | RED 先行ケース「#548 stub なし codekb 直接解決」追加 |
| `.agents/amadeus/hooks/amadeus-log-subagent.ts` | B003 | `activeIntentIsComplete` による完了ガードと、agent_type 空文字の `unknown` 既定を追加 |
| `dev-scripts/evals/hooks-state-bugfix/check.ts` | B003 | RED 先行ケース 3 件（完了済み no-op / 進行中維持 / 空文字 unknown）追加 |
| `dev-scripts/data/parity-map.json` | FR-4 | `hooks/aidlc-log-subagent.ts` を engineFileExceptions へ追加、#547/#555/#547 随伴の理由 entry 追加 |

## TDD 証跡

| Bolt | RED | GREEN |
|---|---|---|
| B001 (#547) | engine-e2e #547 ケースが実装前 FAIL（Current Stage が最終 stage のまま / Operation Pending / PHASE_SKIPPED 未記録）。随伴分は pdm-scope eval (f) が `stage "none" not found in compiled graph` で FAIL | engine-e2e ok、pdm-scope ok |
| B002 (#548) | docs-codekb-guards #548 ケースが実装前 FAIL（stub 削除で validator が produces 不在 fail） | docs-codekb-guards pass（既存 stub 付きケースも pass 維持 = FR-2.2） |
| B003 (#555) | hooks-state-bugfix #555 ケース 1・3 が実装前 FAIL（完了済みでも shard 成長 / Agent Type 空） | hooks-state-bugfix pass 3/3 |

## FR-3.2 実測結果（audit を書く hook 6 個）

| hook | emit | 判定 | 根拠 |
|---|---|---|---|
| amadeus-mint-presence.ts | HUMAN_TURN | 適用済み（#479） | — |
| amadeus-log-subagent.ts | SUBAGENT_COMPLETED | 本 Intent で適用 | 完了済み Intent への残渣が #476 系実害 |
| amadeus-audit-logger.ts | ARTIFACT_CREATED/UPDATED | 見送り | 完了済み record への編集はそれ自体が異常であり、痕跡が audit に残るほうが検出に有用 |
| amadeus-session-start.ts | SESSION_STARTED/RESUMED | 見送り | session 境界の観測イベント。#476 系実害は未観測。適用は後続 Issue 候補 |
| amadeus-session-end.ts | SESSION_ENDED | 見送り | 同上 |
| amadeus-validate-state.ts | SESSION_COMPACTED | 見送り | 同上 |

## 検証結果

- `npm run typecheck`: pass
- `npm run parity:check`: ok（39 skills、199 engine files、基準 commit b67798c3）
- `npm run test:all`: pass（engine-e2e / docs-codekb-guards / hooks-state-bugfix / pdm-scope / rename-leftovers 含む全 eval）
- validator（`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-engine-consistency`）: build-and-test ステージで最終記録

## 逸脱

- 要求が名指しするファイルに加えて `amadeus-orchestrate.ts` を修正（FR-1.1 の帰結。memory.md Deviations / parity 例外 entry に記録）。
