# Reliability Requirements — fix-1170-retreat-guard(nfr-requirements)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要件

| # | 要件 | 根拠/検証 |
|---|---|---|
| R-1 | torn-write 防止は既存 writeStateFile(tmp+rename)を継承 — クラッシュ時に半書き state を残さない | amadeus-lib.ts:3562-3583(既存、変更しない) |
| R-2 | lost-update 防止は withAuditLock 参加で新規に獲得(本 unit の主目的)— ロック保持者間で TOCTOU が閉じる | FR-1d、BR-3 の並列 spawn テストで実証 |
| R-3 | ロック取得失敗・事前検証失敗はサイレントにしない(loud throw / die 継承)。後退 no-op は正常系であり advisory で可観測 | business-logic-model エラー処理節、BR-2 |
| R-4 | プロセス異常終了時のロック解放は withAuditLock の on-exit ハンドラを継承(ロック毒化 ~5s 上限) | amadeus-lib.ts:4274-4285(既存 — 本ステージ reviewer が :4283 removeLockDirIfOwned/:4285 process.on("exit") を実測。reviewer Minor 2 是正: 帰属を本ステージ実測へ訂正) |
| R-5 | audit 整合: 本経路は audit を emit しない現行挙動を維持 — audit-first 原則(state は audit から再構成可能)を壊さない | NFR-5/BR-6(audit 非追記 assert) |

## 前提(technology-stack 由来)

technology-stack.md の Bun ランタイム前提 — R-4 の on-exit ハンドラは Bun の process.exit が finally をスキップする実装差(bun-readfilesync 系と同クラスの Bun 固有挙動)への既存対策であり、これを継承する。
