# Code Summary — issuance-guard(U2、Bolt 2)

上流入力(consumes 全数): code-generation-plan.md、business-rules.md、domain-entities.md、requirements.md

- 着地: conductor ブランチへ --no-ff マージ(`e52ff3b24`)。finalize verdict: converged 1 / failed 0(HEAD 非前進を conductor 明示マージで回収 — cid:code-generation:c2、ls-files -u 0・shard は prefix 実測で ours 採用)。

## 実装(FR-1 / FR-2 / FR-4 / FR-6)

- **C3(amadeus-lib.ts +133)**: `guardMessage(parts)` 3部 assembler、`GUARD_OBSERVED_MARKER`/`GUARD_WEIGHT_MARKER`/`GUARD_EXIT_MARKER` 公開定数、`PLAN_DRIFT_WEIGHT`/`PLAN_CORRECTION_EXIT`/`AUTONOMY_LADDER_EXIT`(1定数1行)。
- **C2**: `SwarmDecline`(6アーム)+`PlanIntegrityVerdict`(ok/redirect/violation)+純関数 `planIntegrityVerdict(decline, pendingBatch)`。default アームは fail-closed(将来の decline 追加が無音直列化せず violation で停止 — BR-U2-3。意図的に never 網羅チェックなし)。`planGuardMessage(verdict, batchNumber)` が prose 合成の単一入口。
- **C1(amadeus-orchestrate.ts +141)**: `tryEmitSwarm` を boolean → `SwarmEmitOutcome`(emitted/declined{decline, pendingBatch})化、DAG 読みを autonomy 判定より前へ移動(既存 read の移動、追加 I/O なし)。`emitSwarmOrPerUnit` が2箇所の呼び出しを置換する単一 chokepoint: ok→emitForSlug(不変)、redirect→ask、violation→error。`declaredBatchOf` が 1-origin batch 番号の唯一の適用点。
- **E-CPG-U2ABS 裁定適用(e98d6187c)**: no-dag アームの未消費 `absence` フィールドと `readBoltDagAbsence` ガード経路呼び出しを除去(2-0、Forbidden 準拠・BR-U2-12 整合)。留保転記は FD domain-entities の申告付き是正に固定。readBoltDagAbsence は U1 成果物として存続(t399 pin)、bolt_dag_absence の production consumer ゼロの残余は BT で再確認。
- lcov 帰属是正: fail-closed default アームを1行化(bare case label が union merge で DA:0 — bun-inbody-comment-da0 の case label 変種)。

## テスト

- 新規 `tests/unit/t403-plan-integrity-guard.test.ts`(改番後19 tests)+`tests/integration/t403-issuance-guard.test.ts`(10 tests)。t400/t401 は HEAD 占有につき t403 採用(t402 は Bolt 3 予約)。
- BR-U2-4 非発動6行の全数固定(AC-1c)。AC-1a violation は純 seam の unenumerated decline で駆動(FD D-3 留保保存 — 新 violation トリガーは発明しない)。
- pin 棚卸し: 宣言集合 t133/t186/t211/t113/t135/t247/t251/t367/t212/t248/t399 = 191 pass、改訂 0(AD 予測の t133 改訂は Bolt 1 で着地済み)。t135 2b は redirect 経由でも `toContain("set-autonomy")` を満たす(BR-U2-9 予測どおり)。
- 落ちる実証3注入(injection-surface-verify 準拠、テストが import する lib 面へ): (1) exit 部欠落→4赤 (2) `case "autonomy-unset": ok` = #1892 欠陥復元→4赤 (3) default 開放→1赤。全て revert 完遂・diff 残渣なし。

## 検証(最終ツリー、全 exit 0)

typecheck / lint / dist:check / promote:self:check / coverage:ci PASS / patch gate **93/93 covered・allowlist 追加 0** / complexity / registry。allowlist 機械 remap 2回(55+25エントリ、difflib 直読照合)。

## 逸脱申告(全て裁定済み)

1. 未消費 absence → E-CPG-U2ABS choice 1(選挙)。
2. t403 改番・planGuardMessage 合成位置 → conductor 執行裁定(一次証拠から一意)。
3. builder が coverage:ci を PENDING のまま終了 → conductor が c5 引き取り(差分検分+全検証再実行)で完遂。
