# Code Summary — u2-state-reconcile-hardening

上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements

## 実装概要

U2 = 失敗・再試行セマンティクスの完全化(unit-of-work の U2 割付)。Bolt ブランチ `bolt/u2-state-reconcile-hardening`(bolt/u1-project-sync-skeleton be404c29c に stacked)、コミット列: bbeafd85a(実装)→ 1fc3c5335(テスト)→ 358c084b9(dist 再生成+complexity gate 是正)。

## 変更ファイル(正本、測定 ref = bolt/u2 HEAD 358c084b9)

- `packages/framework/core/tools/amadeus-mirror-state-reducer.ts` — `mark-project-pending` / `mark-project-safety-blocked` transitions 追加(reducer.ts:98-99 型、:845-847 dispatch)。business-logic-model 手順3の3種完全化(Step 1)
- `packages/framework/core/tools/amadeus-mirror-executor.ts` — reconcile ループ化: `reconcileTargets`(:1520、所属 ∪ 設定対象の非対称 FR-3f)、`syncProjects`(:1549、per-Project try 境界の失敗封じ込め BR-U2-2)、`holdForProjectSync`(:1653、未完残存時の operation receipt pending 保留 BR-U2-5)(Steps 2-4)
- `packages/framework/core/tools/amadeus-mirror-types.ts` / `amadeus-mirror-state-codec.ts` — `projectSyncHold` フィールドと receipt 不変条件(hold は pending のみ許可)(Steps 3-4)
- `packages/framework/core/tools/amadeus-mirror-policy.ts` — hold 分類の policy 連携(safety-blocked を receipt に書かない — policy.ts:61-65 terminal-block 回避)
- 冪等 reconcile: 台帳起点の一律再評価(9セル写像 — 現在状態非依存)、synced かつ期待一致で mutation 0(BR-U2-4)(Step 5)

## テスト(Step 6)

- `tests/unit/t344-amadeus-mirror-project-reconcile.test.ts` — reducer 9セル遷移 unit 直叩き
- `tests/integration/t345-amadeus-mirror-project-reconcile.integration.test.ts` — 部分成功(A 成功+B retryable → B のみ pending → 次回収束)/ 二重実行 mutation 総数不変 / per-Project 照会1+mutation≤2 history assert(BR-U2-7)/ 秘匿トークン注入 → 台帳 0 hit(BR-U2-8)/ synced→safety-blocked 遷移対照
- 実行結果: 59 pass / 0 fail(2ファイル、bun test 直叩き)

## 検証(Step 7 — 全て実測 exit code)

- `bun run typecheck` = 0 / `bun run lint` = 0(warning のみ、error 0)
- `bun scripts/package.ts` = 0(dist 7面)/ `bun run promote:self` = 0 / `bun run dist:check` = 0 / `bun run promote:self:check` = 0
- `bash tests/run-tests.sh --ci` — 赤は `t132-hooks-doc-count-sync` のみ = 既存赤 #1594(main 由来、assertion 実文で NaN 機序一致を確認、u2 非関与)。plan で許容宣言済み
- `bun tests/complexity-gate.ts --check` = 0

## Complexity gate 是正(引き継ぎ後の追加作業)

- 機序: complexity gate の naive TS parser が viewLinkedIssue 以降の関数分割に失敗(Promise<> 内マルチライン object union+ternary 内マルチライン call が原因)し、751行を1関数として集約計測 — u1 時点で既に CCN 15 ぎりぎり、u2 追加で 16 へ超過
- 是正: (1) `LinkedIssueViewResult` 型エイリアス化+ternary→if/else で parser 分割を回復(viewLinkedIssue 実 CCN 4)(2) `checkReceiptStatusInvariants`(実 CCN 20)を timestamp/hold の2ヘルパーへ分割(3) 分割回復で初めて計測可能になった `classifyCreateState`(CCN 21、main 由来 2bb63f6b8・u2 非接触)を baseline へレビュー済み例外として記録

## トレーサビリティ

FR-3f, FR-7 全補, FR-6b(完全)— 受入条件 6, 10, 11。宣言外の要件・設計逸脱なし(complexity gate 是正は検証ゲート充足のための実装内リファクタ、挙動不変をテスト green で確認)。
