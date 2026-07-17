# Feasibility Assessment — 260717-state-mirror-fixes

上流入力(consumes 全数): intent-statement.md

## 技術的実現可能性(architect 視点)

intent-statement.md の Problem Statement が特定する2欠陥は、いずれも機序が実測で確定しており、技術的実現可能性は**高**。

### #1170: state 巻き戻り(P2/S3)

- 機序確定済み(クロスレビュー e2 のコード裏付け): `amadeus-sync-statusline.ts` → `amadeus-utility.ts handleSetStatus`(前進・後退の判定なし)→ `amadeus-lib.ts setCheckbox`(`\[[ xSR?-]\]` が `[x]` を含む任意状態にマッチして置換)。単調性ガードが存在しないことがコード上で確認済み
- 修正方向の候補は Issue に留保付きで記録済み(後退方向書き込みガード / state 書き込みの単調性検査。e2 所見: `setCheckbox` のマッチ集合縮小だけでは Current Stage/Status の巻き戻りが残るため `handleSetStatus` 側ガードが適切 — **設計判断は後続ステージへ持ち越し、ここでは確定しない**)
- 対象は正本 `packages/framework/core/` 配下+dist×6/self-install の再生成面 — 既存の `bun scripts/package.ts` / `bun run promote:self` の同期機構で機械的に反映可能(project.md Mandated の既定手順)
- 検証可能性: 巻き戻りの再現形(古い activeForm を持つ TaskUpdate → set-status spawn)は in-process seam でテスト可能。リグレッションテストの実現性に技術的障害なし
- 付随作業: 現 origin/main HEAD で intent 260717-mirror-issue-tool の record が巻き戻ったまま(コミット 5a0cd1e6e で `[-] nfr-requirements` 固定)— 修正時に state 修復(`[x]` への復帰)が必要(クロスレビュー e3 実測)

### #1172: mirror の SKIP 分母混入(P3/S4)

- 機序確定済み(クロスレビュー e2 の再現実行): `scripts/amadeus-mirror.ts:100` は `[S]` マーカーのみ分母除外、実データのスコープ SKIP 様式 `- [ ] <stage> — SKIP` は素通り。in-process 直接適用で `{"approved":17,"total":32}` を再現済み(正 = 分母 18)
- 修正は1行条件追加+unit テスト(両様式 fixture: `[S]`+`— EXECUTE` と `[ ]`+`— SKIP`)— 軽量
- ライブ再現の追加確認: 本 intent 自身の mirror Issue #1179 の状態行が `approved 3/32` と表示(2026-07-17T17:43Z sync 実測)— 欠陥の現存を本 intent でも確認済み

## リスク分析(要約 — 詳細は raid-log.md)

- 主リスク: #1170 のガード設計が並行セッションの正当な前進書き込みまで抑止する過剰ガードになる可能性 → 設計ステージで前進/後退の判定基準を明確化して緩和
- 実装面の既知罠: bun coverage の spawn 盲点(hooks はspawn 経由)→ in-process seam 設計を実装時点で行う(bun-coverage-spawn-blindspot 既決ノルムの適用)

## AWS ランドスケープ評価(aws-platform 視点)

**N/A** — 本プロジェクトはデプロイ基盤を持たず、リリースは npm パッケージ配布+GitHub Actions のみ(project.md Deployment 既決)。本 intent はフレームワーク内部のフック/ツール/スクリプト修正であり、クラウドリソースへの影響なし(反証可能根拠: project.md「デプロイ基盤は持たず」、質問ファイル Q6)。

## 規制スキャン(compliance 視点)

**該当なし** — 扱うデータは record/state ファイル(ワークフロー工程記録)のみで、PII・決済・医療・輸出規制データを含まない。project.md に規制要件の記載なし(質問ファイル Q2)。監査ログ(audit シャード)の append-only 性は org.md の内部規範であり外部規制ではない — 本修正は audit 形式に触れない。

## 総合判定

**GO(実現可能)** — 両欠陥とも機序実測済み・修正案が Issue+クロスレビューに具体化済み・既存スタック内で完結・検証手段実在。Ideation 時点で実現可能性を否定する材料はない。
