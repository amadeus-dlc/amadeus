# Code Generation Plan — u2-state-reconcile-hardening

上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements

U2 = 失敗・再試行セマンティクスの完全化(unit-of-work)。story-map ジャーニー2「一時障害があっても次の節目で追いつく」。実装は U1 Bolt(bolt/u1-project-sync-skeleton、be404c29c)に **stacked** した Bolt ブランチ `bolt/u2-state-reconcile-hardening` の隔離 worktree で行う(U1 マージ後は rebase --onto で移植 — rebase-onto-squash-stacked)。

## 実装ステップ

- [x] **Step 1: reducer transitions 追加** — `mark-project-pending` / `mark-project-safety-blocked`(business-logic-model 手順3の3種を完全化。U1 の upsert-project-entry は既存)。ReducerResult 既存様式(changed/unchanged/invalid、不変時 unchanged)。
- [x] **Step 2: executor の reconcile ループ化** — U1 の単一対象直線経路を「所属 ∪ 設定対象」の per-Project 独立ループへ一般化(business-logic-model 手順1〜2 — FR-3f の非対称: 同期=所属全 Project / 追加=設定対象のみ)。1 Project の失敗を try 境界で封じ込め他へ波及させない(BR-U2-2)。
- [x] **Step 3: 失敗分類の台帳書込** — retryable(rate-limit/network/api)→ pending / 解決不能(フィールド・選択肢未解決、permission)→ safety-blocked / 成功・既一致 → synced(business-logic-model の写像表)。一律再分類(domain-entities の 9セル — 現在状態に依存しない)。書込は reducer 経由のみ(BR-U2-3)。
- [x] **Step 4: 操作 outcome 集約(層分離)** — 未完(pending/safety-blocked)残存時は operation receipt を `pending`(IN_PROGRESS 分類)に留め、safety-blocked を receipt に書かない(BR-U2-5 — policy.ts:61-65 の terminal-block 恒久停止回避)。既存 coordinator 集約経路は無変更(回帰テスト対象)。
- [x] **Step 5: 冪等 reconcile** — 次 boundary / manual sync で台帳起点の再評価。synced かつ期待一致は mutation 0(BR-U2-4)。
- [x] **Step 6: テスト(t344〜)** — reducer 9セル遷移の unit 直叩き / failure injection integration: 部分成功(A 成功+B retryable → B のみ pending → 次回収束)・二重実行 mutation 総数不変・per-Project 照会1+mutation≤2 history assert(BR-U2-7)・秘匿(GraphQL errors に固有トークン注入 → 警告・診断・台帳 0 hit — BR-U2-8)・synced→safety-blocked(構成破壊)等の遷移対照。
- [x] **Step 7: 検証一式** — typecheck / lint / dist 7面 regen+promote:self / dist:check / promote:self:check / run-tests --ci(t132 既存赤 #1594 は許容)/ patch gate(base = bolt/u1 head be404c29c)未カバー 0。
- [x] **Step 8: deslop → 全検証再実行 → コミット**(push は conductor)。

## トレーサビリティ

FR-3f, FR-7 全補, FR-6b(完全)— 受入条件 6, 10, 11(unit-of-work の U2 割付)。逸脱は実装前停止(既存様式準拠と判断する場合も停止対象)。

## テスト戦略

Standard — reducer=unit 純関数 / reconcile・injection=integration(fs-tests-integration-first)。FakeGateway 差し替えの既習様式(本番コードにテスト分岐を置かない)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T14:31:04Z
- **Iteration:** 1
- **Scope decision:** none

BR-U2-1〜8 トレース一致、59 pass / 0 fail、typecheck/dist:check/complexity-gate exit 0、検証劇場・互換シム・無申告逸脱なし。

### Findings

- None
