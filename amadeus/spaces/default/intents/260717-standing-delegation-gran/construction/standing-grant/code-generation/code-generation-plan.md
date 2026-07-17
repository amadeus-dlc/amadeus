# Code Generation Plan — standing-grant(Issue #1125 / Bolt 1)

上流入力(consumes 全数): `../functional-design/business-logic-model.md`、`../functional-design/business-rules.md`(R-1〜R-8)、`../functional-design/domain-entities.md`(StandingGrant 型・AD 契約 verbatim)、`../nfr-design/security-design.md`(層別 S-1〜S-4)、`../nfr-design/logical-components.md`(実装先写像)、`../../../inception/units-generation/unit-of-work.md`、`../../../inception/requirements-analysis/requirements.md`(FR-1〜8)

## 前提

- 単一 Bolt。builder は worktree 隔離(base=origin/main、#1138/#1140 込み)。並行 intent と正本非交差(bolt-plan の c6 — 着手時点の origin/main 実 diff で再確認済み: metrics=scripts 面 / TMB=team-up.sh 面)
- Test Strategy: Comprehensive。E-SDG-AD2 裁定 X(approve 側のみ)確定済み — reject 側へ触れる実装は逸脱

## ステップ

- [x] Step 1: C-5 taxonomy — amadeus-audit.ts の PRESENCE_PROTECTED_EVENTS(:766)へ GRANT_ISSUED/GRANT_REVOKED 追加+EVENT_HEADINGS 正式エントリ2行+knowledge/amadeus-shared/audit-format.md へ taxonomy 追記【ADR-6 / AC-7a】
- [x] Step 2: C-1 verb — amadeus-state.ts に handleGrantStandingDelegation / handleRevokeStandingDelegation+dispatch case。実行順: 接地ゲート(:1975 同型)→ AMADEUS_OPERATING_MODE==="team" 判定 → scope 検証(stage-gates のみ)→ TTL parse(数値検証・既定 DEFAULT_STANDING_GRANT_TTL_MS)→ GRANT_ISSUED emit(フィールド: Grant Id/Scope/Expires At/Includes Phase Boundary/Issuer 座標/User Input)。stdout JSON+stderr 人間可読行(フラグ名+既定=除外の明文)【AC-1a〜1e / AC-2a-b / S-2/S-3】
- [x] Step 3: C-2 受理検証 — amadeus-lib.ts に DEFAULT_STANDING_GRANT_TTL_MS(4h、裁定 cite コメント・env override なし)+StandingGrant 型(isExpired インスタンスメソッド+parse コンパニオン)+findActiveStandingGrant(projectDir, now): StandingGrant | null+standingGrantSatisfiesGate(grant, slug, stateContent, graph): boolean(分類内包: phase-boundary=findStageBySlug+nextInScopeStage 導出、skeleton=Skeleton Stance on+先頭 construction)【FD/AD 契約 verbatim】
- [x] Step 4: C-2 挿入 — assertHumanPresentForGateResolution(:1781)の approve 分岐のみ+handleDelegateApproval(:1975 系。targetRecord 解決を接地ゲートより前へ移動し宛先 state で判定)。humanActedSinceGate false 後のフォールバック(fail-open 非合流)。受理成立時の監査行に Grant Id 記載。handleDelegateRejection(:2069)は触らない【ADR-7 / AC-3a〜3c】
- [x] Step 5: C-4 doctor — amadeus-utility.ts に DoctorCheck 行(有効グラント有無/scope/残 TTL/Includes Phase Boundary/発行 intent。「なし」= pass)【AC-6a】
- [x] Step 6: C-6 テスト — tests/integration/t-standing-grant.test.ts(Comprehensive): 赤側6種(scope外=skeleton除外含む/TTL切れ/撤回後/ソロ発行+受理拒否/TTL型不正/opt-in なし phase-boundary 拒否)+R-8 mint 拒否+AC-5b 一時状態 fixture(TTL境界・撤回直後・HUMAN_TURN 欠落・ledger 不在での非実行=R-7)+決定性2回一致+白側(既存 delegate フロー退行ゼロの追加ケース+opt-in あり phase-boundary 通過)。fixture は E-SDG-IC C1 の一時状態明示【FR-5 全 AC】
- [x] Step 7: docs — delegate 運用記述面の棚卸し+フラグ名・既定=除外の明文(e2 留保)【AC-7b】
- [x] Step 8: 配布同期 — bun scripts/package.ts+bun run promote:self【AC-8a】
- [x] Step 9: 検証列 — typecheck / lint / dist:check / promote:self:check / run-tests --ci / runner-gen check / registry --check 全 exit 0+push 前 local lcov patch 未カバー 0【AC-5d】
- [x] Step 10: code-summary.md 作成(conductor)

## 逸脱規律(builder ディスパッチに明記)

deviation-stop(既存様式準拠と判断する場合も停止)/ c2(割当 worktree 外 git 操作禁止・本線絶対パス非混入)/ 同期完遂(モニタ待ち終了禁止)/ E-SDG-AD2 裁定 X の approve 限定は変更不可。

## トレーサビリティ

Step 1→AC-7a / Step 2→AC-1,2 / Step 3-4→AC-3,4 / Step 5→AC-6a / Step 6→AC-5a-c / Step 7→AC-7b / Step 8-9→AC-5d,8a(user-stories 非実行 — FR/AC を正とする)
