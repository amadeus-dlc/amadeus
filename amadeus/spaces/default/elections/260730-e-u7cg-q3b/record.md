# Election Record — E-U7CG-Q3B

- question: U7 互換 Adapter の AppendAuditResult 忠実性(post-complete の appended:false arm)。旧 writer は完了済み intent への append を抑止し {appended:false, reason:"intent-complete"} を返す(amadeus-audit.ts:426 付近、#1248)。実消費者3箇所(amadeus-grant-authorization.ts:787、amadeus-presence-reservation.ts:332、amadeus-mirror-state-store.ts:407 — いずれも if (!result.appended) 分岐)。canonical 経路では appendJournalRecordV2(amadeus-audit.ts:390 付近)が同じ seal を見て抑止するが void を返すため、emitEvent 経由の Adapter には抑止が観測できない。制約: 無条件 appended:true は実行結果から導出しない偽の成功報告(org.md Forbidden 検証劇場)に該当。Adapter 側での intentStatusForAudit 先読みは performance-design「委譲経路に I/O・ロック・動的 import を追加しない」に反する。各自 上記 file:line、appendJournalRecordV2 の実装、3消費者の分岐実文を実測して投票せよ。

裁定: appendJournalRecordV2 を「抑止したか」を返す形に拡張し、AuditLogExporter.exportCanonicalEvent → emitEvent へ伝播させる(U3/U4 所有コードの cross-unit 契約変更を本 Bolt で実施、3消費者が移行可能になる)(choice 1 — tie 裁定)
- 留保(subagent-2, GoA2): cross-unit 契約変更につき U3/U4 所有コード(appendJournalRecordV2 / AuditLogExporter)への変更は申告付き逸脱として本裁定を根拠に最小差分で行い、戻り値追加後も既存 void 消費呼出しが型的に壊れないこと(戻り値無視の互換)を typecheck で確認すること。
- 留保(subagent-1, GoA2): 留保: 案1は実測で前提不成立(3消費者は withAuditLock 内 lock-held 呼出しかつ明示 intent 指定であり、emitEvent は非再入 acquireAuditLock 自前取得+intent 引数なしのため、戻り値伝播だけでは移行不能)、案2の恒久 allowlist 保持は BR-8 shrink-only ratchet / BR-9 残存ゼロ=U8 削除ゲート FR-MIG-4(c) / BR-1 恒久 dual-write 禁止の承認済み要件変更に該当するため、正準リスト(4)によりユーザー裁定が必要。
票タイムライン: 配信 2026-07-30T10:11:29Z → 配信 2026-07-30T10:11:29Z → subagent-2 2026-07-30T10:13:52Z(受理 2026-07-30T10:14:32Z) → subagent-1 2026-07-30T10:15:41Z(受理 2026-07-30T10:15:59Z) → 開票 2026-07-30T10:16:16Z
GoA[E-U7CG-Q3B]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0

- hold 裁定履歴: tie → choice:1(2026-07-30T10:18:49Z、復帰先 tallied)
