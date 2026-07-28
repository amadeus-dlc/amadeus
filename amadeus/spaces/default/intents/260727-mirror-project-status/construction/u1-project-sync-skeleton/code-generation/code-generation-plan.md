# Code Generation Plan — u1-project-sync-skeleton(walking skeleton)

上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements

U1 = 単一の設定済み Project・既定マッピングでの最小 end-to-end(unit-of-work)。story-map ジャーニー1「intent 開始でボードに Ideation が現れる」への traceability を各 Step に付す。実装は **main から切った隔離 worktree の Bolt ブランチ**(`bolt/u1-project-sync-skeleton`)で行う(solo-bolt-worktree-required、org.md Way of Working)。正本は `packages/framework/core/tools/`、dist は再生成のみ。

## 実装ステップ

- [ ] **Step 1: C0 型追加**(amadeus-mirror-types.ts)— `MirrorProjectRef` / `MirrorPhaseKey` / `MirrorProjectStatusNames` / `MirrorProjectTarget` / `MirrorProjectSyncEntry`(U1 は synced のみ書込)/ `MirrorProjectStatusField` / `MirrorProjectItem` / `ExpectedProjectStatus` + gateway 新メソッド型 + permit の mutation 種別拡張(component-methods C0 verbatim)。〔ジャーニー1 の型面〕
- [ ] **Step 2: C1 config 最小 parse**(amadeus-mirror-config.ts)— allowlist へ `mirror-projects` 追加(:335-339 既存様式)、U1 は単一要素のみ受理、closed-schema 検証(unknown key/phase 拒否 — FR-5b (i) の最小面)。〔設定なし → 全 skip = BR-U1-1〕
- [ ] **Step 3: C2 policy**(amadeus-mirror-policy.ts)— `DEFAULT_PROJECT_STATUS_NAMES` 定数(FR-3a の表の canonical 1定義)+ `expectedProjectStatus(snapshot, boundaryKind, statusNames)` 純関数(keep / done / フェーズ名の3分岐 — ADR-5)。
- [ ] **Step 4: policy unit テスト** — expectedProjectStatus の3分岐+exact match 照合(BR-U1-4)の純関数直叩き(fs-tests-integration-first)。
- [ ] **Step 5: C5 gateway**(amadeus-mirror-gateway.ts)— `graphqlArgv`(gh api graphql の argv 族)+ `interpretGraphqlResult`(HTTP 200 + body errors の解釈層 — 写像表は実 gh 応答実測で確定し BR-U1-7 へ追記)+ 4メソッド(listProjectItems / resolveProjectStatusField / addProjectItem / updateProjectItemStatus — mutation は permit 必須 = BR-U1-8)。
- [ ] **Step 6: gateway テスト** — fake runner+実 gh GraphQL envelope の od -c golden(既習様式)/ `implements MirrorGitHubGateway` 4箇所(t279/t282/t284/t300)の interface 追従+t280 手動確認 / negative assert: PR・release・deploy・削除・アーカイブ系 API 経路の不在(BR-U1-10、FR-10a)。
- [ ] **Step 7: codec+reducer 最小形** — `projectSync` サブオブジェクトの keys/validate/render(ADR-3 最小)+ synced entry の upsert transition。write⇔read round-trip テスト。
- [ ] **Step 8: C6 executor 直線経路**(amadeus-mirror-executor.ts)— business-logic-model の8ステップ(設定解決 → 一括所属照会 → 冪等追加 → Status 解決 → 期待導出 → exact match → 冪等適用 → synced 台帳 upsert)を create/sync チェーン内へ配線。照会失敗 = unsynchronized 警告のみで継続(BR-U1-9)、解決不能 = skip+診断(期待名+実在一覧、redact 流儀 — BR-U1-5/FR-6c)。
- [ ] **Step 9: executor/integration テスト** — lifecycle runtime 注入で二重実行の mutation 総数不変(NFR-1)・既一致 no-op(BR-U1-6)・設定なし全 skip(BR-U1-1)・safety-blocked 観測の診断 golden(秘匿 0 hit 含む)。per-Project 呼び出し回数(照会1+mutation≤2)の history assert(NFR-3)。
- [ ] **Step 10: 検証一式** — `bun run typecheck` / `bun run lint` / dist 7ハーネス再生成+`bun run promote:self` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` / push 前 local lcov で diff 追加行の未カバー 0(local-lcov-pre-push)。
- [ ] **Step 11: 実 Project 実証+落ちる実証** — 実 Project #5 で add/update mutation の成立を実測(R-3。A-4 の選択肢不在状態なら safety-blocked の正観測でも検収可)。落ちる実証: 「存在しない選択肢名」注入 → safety-blocked 化+診断内容の赤を確認 → revert まで不可分1セット(falling-proof-injection-one-set、注入面 = policy 入力)。
- [ ] **Step 12: PR 発行+code-summary.md** — Bolt ブランチから PR(1 Bolt = 1 PR)。deslop 実行後に全検証コマンド再実行。code-summary.md へ files/決定/テスト被覆/逸脱を記録。

## トレーサビリティ

全 Step はジャーニー1(story-map)と FR-1a/1b, FR-2, FR-3a/3b/3e, FR-6a/6b(最小), FR-11 — 受入条件 1, 2, 10(部分), 13, 14, 18(unit-of-work の U1 割付)へ写像。設計逸脱の必要に気づいたら実装前に停止して報告(deviation-stop-before-implement — 既存様式準拠と判断する場合も停止対象)。

## テスト戦略

Standard(プロジェクト既定)— コードと並行してテスト作成、最低ラインカバレッジ80%+codecov patch ゲート。新規テストは unit=純関数直叩き / 実 FS・runtime 注入=integration 層(fs-tests-integration-first)。テスト番号は既存 tNNN の最大値+1 から事前予約して衝突を避ける。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T13:09:56Z
- **Iteration:** 1
- **Scope decision:** none

実装は FD 8手順・E-U1CG 裁定・BR 全数と一致し無申告逸脱なし。テストは実効(冪等・予算・秘匿・closed-schema・禁止動詞 sweep+vacuity guard)、dist/allowlist 同期正。

### Findings

- None
