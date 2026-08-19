# Code Generation Plan — bolt-pr-attestation

**Scope**: `self-fix` / depth `Minimal`  
**Input**: `inception/requirements-analysis/requirements.md`（units-generation は scope により意図的に欠落）  
**Test strategy**: Standard（要件・リスク駆動の unit / integration test）

## 実装手順

- [x] **Step 1: falling proof を固定する** — 2 Unit / 1 Bolt が単一 PR を共有できず、2件目の Unit で provenance または completion が失敗する現行挙動を focused integration test で再現する。既存の単一 Unit 正常系と改ざん拒否もベースラインとして実行する。
- [x] **Step 2: Delivery Bolt の正規 member Unit 集合を導入する** — Unit slug の重複拒否・昇順正規化・空集合拒否を共通境界へ追加し、単一 Unit の既存 title/body 表現を byte-compatible に保ったまま、multi-Unit provenance を一意に render / parse / validate する。
- [x] **Step 3: CLI と attestation を Bolt 集合モデルへ接続する** — `create/status/report` が同じ Intent / Bolt / member Units / PR / head tuple を用い、owner Unit ごとに別 report、body digest、attestation id、audit receipt を生成・再開できるようにする。欠落、部分集合、foreign Bolt/Intent/Unit、stale/copied/replayed evidence は fail-closed を維持する。
- [x] **Step 4: sensor と Construction completion を合成する** — report sensor が canonical body、owner path、owner Unit、完全な member Unit 集合、attestation、audit receipt を順に検証し、Delivery Bolt の全 member Unit 証跡が揃った場合だけ code-generation completion を許可する。DAG batch を Bolt identity の代用にしない。
- [x] **Step 5: 回帰・統合テストを完成させる** — 2 Unit / 1 Bolt、2 Unit / 2 Bolt、1 Unit / 1 Bolt carry-forward、入力順逆転 resume、partial/foreign/tamper/copy/replay/stale/head mismatch、`full` で人間向け PR 選択を発生させない経路を追加する。既存 test configuration を再利用し、設定変更が不要であることを確認する。
- [x] **Step 6: 契約文書と配送面を同期する** — one-Bolt-one-PR の member Unit 契約と CLI usage を正本へ反映し、`bun run build`、focused tests、typecheck、lint、source-only、隔離 build、coverage gate を実行する。生成された `dist/` と自己インストール面はコミット対象外とする。

## 要件トレース

- Step 1 → FR-BPA-5、FR-BPA-6、NFR-BPA-3
- Step 2 → FR-BPA-1、FR-BPA-2、FR-BPA-3、NFR-BPA-2
- Step 3 → FR-BPA-2、FR-BPA-4、FR-BPA-7、NFR-BPA-1
- Step 4 → FR-BPA-4、FR-BPA-5、FR-BPA-7
- Step 5 → FR-BPA-6、FR-BPA-7、FR-BPA-8、NFR-BPA-3、NFR-BPA-4
- Step 6 → FR-BPA-9、NFR-BPA-3

## 計画承認

- 判定: 承認（`approve-plan`）
- 自動判断: `auto-decision-8caa5c3033be0a350e7096e38f514297`（Intent grant `intent-grant-11f41ffa00eb23e01636af162b1fd093`）
- 選択肢: `approve-plan` / `request-changes`

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** `amadeus-architecture-reviewer-agent`
- **Date:** 2026-08-14
- **Iteration:** 1
- **Scope decision:** なし
- owner Unit ごとの report payload digest が同一になる点、単一 Unit projection の検証を迂回できる点、Unit 解決不能時に completion guard が fail-open になる点を修正対象とした。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** `amadeus-architecture-reviewer-agent`
- **Date:** 2026-08-14
- **Iteration:** 2（Quality Repair closure）
- **Scope decision:** なし
- owner-bound payload、singleton projection の検証、Unit 解決不能時の fail-closed を実装した。Delivery Planning が scope 上 SKIP となる self-fix では、状態・scope・SKIP 理由・単一 construction Unit の digest に拘束した `engine-singleton` authority だけを許可し、legacy fallback、承認済み plan との混同、multi-Unit 要求、改ざんを拒否することを確認した。
