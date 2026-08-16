# Code Generation Plan — unit waiting-interruption(U3)

## 拘束

- R-1 / FR-3 / ADR-4: `Construction Autonomy Mode` が autonomous で未消費 HUMAN_TURN が0件でも `park` は成功する。`amadeus-state.ts:1600` の拒否条件を撤去する。
- R-6 / ADR-4: waiting は engine 発行専用。AI/利用者が直接呼べる CLI verb を持たない。
- R-7a: `WaitingCause` の永続面は Intent autonomy トランザクション台帳のみ — record 配下の専用ファイル・Runtime State 新フィールド・監査イベント属性のいずれにも事由本体を書かない。
- R-19: waiting へ格納した `WaitingCause` は resume 時に同内容の `RulingPresentation` として再提示される(round-trip プロパティ、台帳往復に束縛)。オラクルは進入時に実際に生成した値と突き合わせ、独立再実装しない(project.md `pbt-oracle-cancellation`)。
- R-21 / R-22: マーカー2種追加は四集合(`VALID_EVENT_TYPES`/`EVENT_HEADINGS`/event-registry/audit-format.md)を同一変更で同期し、event union と codec/形状ガードは変更しない。

## TDD 順序(実施順、base `swarm-int-rfc0001@54baec9ce`)

1. `bun install && bun run build` を先行実施。
2. ベースライン実測: park guard の既存 pin(t17:1261/:1283、t3016-park-provenance の2ケース)、1turn=1park 会計の所在(`amadeus-lib.ts:3923`)、既存イベント数 96/22 の各所ピン(t28:85、t81:242、audit-format.md:32/34)を file:line で確認。
3. FP-1(park guard、R-1〜R-5): `t1241-park-guard-removal.test.ts` を先に作成 → Red(4 fail / 2 pass)→ guard + 前提コメント除去 → Green(6 pass)。
4. FP-2/FP-3(waiting domain): `t1241-waiting-cause.test.ts` → Red(モジュール不在)→ `amadeus-waiting.ts` 実装 → Green(26 pass)。
5. FP-5(監査語彙): `t1241-waiting-audit-vocabulary.test.ts` → Red(6 fail、unmapped event type)→ 四集合 + count pin(96→98)同期 → Green(6 pass)。
6. FP-6(台帳往復、型不能): `typecheck` で Red(コーディネータ・union に waiting 判別子が無い)→ union + coordinator + `resumeInterruption` 実装 → Green(16 pass)。
7. R-14(waiting directive): `t1241-waiting-directive.test.ts` → Red(10 fail)→ 4つの directive table 実装 → Green(10 pass)。
8. engine path(production): `t1241-waiting-engine.integration.test.ts` → Red(`waitingDirectiveFor` export 不在)→ production entry/reader/resume + orchestrate 分岐 → Green(8 pass)。
9. 途中で2件の空虚述語を発見し是正(bolt.ts の dispatch table 読取修正、rate constraint テストの対象修正)— 実装欠陥ではなくテストの検査対象修正。

## 検証・配送

- swarm batch 2(completion-report / waiting-interruption)。
- referee: `b69be09db integrate bolt-waiting-interruption (batch 2)` で `swarm-int-rfc0001` へ収束。
- worktree: `.amadeus/worktrees/bolt-waiting-interruption`、branch `bolt-waiting-interruption`、base `swarm-int-rfc0001@54baec9ce`(batch 1 統合断面)、HEAD `69a78b714`。
