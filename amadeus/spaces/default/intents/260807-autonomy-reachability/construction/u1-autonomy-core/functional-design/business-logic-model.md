# Business Logic Model — u1-autonomy-core

上流入力(consumes 全数): requirements.md(FR-2a〜2d の受け入れ基準)、components.md(C2/C3 責務)、component-methods.md(縮約契約)、unit-of-work.md(境界)、unit-of-work-story-map.md(フロー1〜4 は u1 の物語3行を実現する)、services.md(フロー2 の同期 emit と audit ロック契約の継承元)。補助参照: component-dependency.md(依存の根としての u1)、decisions.md(ADR-2/3)。

## フロー1: mode 適用の canonical 化(FR-2c、ADR-3)

```
HumanAutonomyCommand
  → applyProductionAutonomyMode
      1. 既存: 検証(provenance・digest・遷移妥当性)
      2. 既存: audit transaction(INTENT_AUTONOMY_TRANSACTION_COMMITTED)commit
      3. 新設: StateAutonomyFields を state ファイルへ書込(3フィールド)
  → 呼び出し元(C13 / handleSetAutonomy)は state を書かない
```

- **原子性契約**(cid:functional-design:audit-batch-before-state-atomicity 適用): audit が先・state が後。audit commit 成功後の state 書込失敗は loud error で報告し、**再実行で state へ収束**する(audit は冪等スキップ: projectionRevision 一致なら transaction を重複発行せず state のみ書く)。失敗注入テストで両境界を固定
- handleSetAutonomy(`amadeus-bolt.ts:1075-1081`)は書込列を削除し呼出しへ縮約(verb 契約不変)

テキストfallback: 適用 = 検証 → audit → state の直列3手。state 失敗時は再実行が audit をスキップして state だけ書く。

## フロー2: 拒否の可視化(FR-2a、ADR-2)

```
productionStageAutonomy
  → authorizeInteraction → { authorized: false, reason }
  → autoApprove = false 確定点(:227-231)
  → 新設: emitAuthorizationRefusal(occurrence, reason, mode)
      — AutonomyRefusalEvent を audit へ 1行 emit
      — emit 失敗は stderr 警告のみ(fail-open — 認可判定を巻き込まない)
  → 既存: presence guard へ(不変)
```

## フロー3: preview 列挙(FR-2b)

`previewProductionAutonomyGrant` の出力に `nonAutoDecidedKinds` を追加。値は `ALL_INTERACTIONS − allowedInteractionKinds` の集合差で導出(定数の手書き複製禁止)。CLI 表示は preview の既存様式に1行追加。

## フロー4: 6読み手の一貫性検証(FR-2d)

integration テスト: C13 相当の canonical 適用 → (1) state 実読で 3フィールド反映 (2) `isQuestionCarveoutIntent`(`amadeus-stop.ts:196-198`)true(semi) (3) `autonomySegment`(`amadeus-lib.ts:4942`)非空 (4) `readAutonomyMode`(`amadeus-orchestrate.ts:1894-1899` — swarm scheduling 読み手)反映 (5) `stopContinuationDefaultCap`(`amadeus-stop.ts:150-154`)= 8 (6) `stopBudgetMode`(`amadeus-stop.ts:160-162`)非 interactive、加えて (7) `isAutonomousMode`(`amadeus-log.ts:180` — Construction Autonomy Mode 読み手)の一貫 — を1テストで直列 assert(読み手は関数直呼び、実 FS は integration 層 — fs-tests-integration-first。6読み手の正本は component-dependency.md FR-2d 表 — Review iteration 1 FOLLOW-UP 是正: 全項目に file:line を明示)。

## エラー分類(error-classification)

- state 書込失敗 = 回復可能(再実行収束)→ loud error+再実行手順の提示
- refusal emit 失敗 = 観測欠落(回復可能・非致命)→ fail-open 警告
- 検証失敗(provenance 等)= 既存どおり fail-closed

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T15:21:34Z
- **Iteration:** 1
- **Scope decision:** none

FR-2a〜2d+C3縮約を過不足なくカバー・原子性契約は norm 整合・fail-open は emit 1箇所限定。FOLLOW-UP 1(flow4 の読み手 file:line 欠落)・NIT 1(イベント名の確定/候補併記)

### Findings

- FOLLOW-UP | business-logic-model.md:39 — flow4 の6項目のうち readAutonomyMode に file:line 引用がなく、swarm scheduling と log 読み手のどちらを指すか一意でない — 明示追記が必要
- NIT | domain-entities.md:17 — イベント名の「確定:候補」併記が曖昧 — FD 内で確定させてから CG へ渡す
