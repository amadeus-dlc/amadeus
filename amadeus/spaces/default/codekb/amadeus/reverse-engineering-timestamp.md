# Reverse Engineering 鮮度ポインタ

## 最新観測

- Date: `2026-08-04`
- Observed commit: `7172aea8dacb2a187d71697cbc8561c1614e25a4`
- Repository: `amadeus`
- Project type: Brownfield
- Scope: 差分リフレッシュ(260804-tla-authoring、`self-feature`)。共有CodeKB 9成果物へTLA+ authoring断面を追加。
- Focus: [Issue #2161](https://github.com/amadeus-dlc/amadeus/issues/2161) — 要求・設計→適用判定→authoring→trace/staleness→proof/review→registration→既存executorの責務鎖、model-map/receipt/advisory、plugin配布閉包。

## 差分基点

- Base commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`(祖先性 exit 0、距離21 commits)
- 詳細メタデータ(全文保存): 下記「履歴: 260804-tla-authoring 実行メタデータ」

## 履歴: 260804-tla-authoring 実行メタデータ(observed `7172aea8d`)

- Date: `2026-08-04`
- Base commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`
- Observed commit: `7172aea8dacb2a187d71697cbc8561c1614e25a4`（= `origin/main` / worktree HEAD）
- Ancestry / distance: `git merge-base --is-ancestor 9458bbda85eb7257310a80882b4858dc6ce3d1fc 7172aea8dacb2a187d71697cbc8561c1614e25a4` はexit 0、距離21 commits。旧observed `be6a8085b9b8ff7e3b384dcaf34653cae29f307f`は新observedのancestorではない（exit 1、rebase履歴）。
- Scope: `self-feature`、Brownfield、単一repo `amadeus`、Depth: Standard、Test Strategy: Comprehensive。
- Focus: [Issue #2161](https://github.com/amadeus-dlc/amadeus/issues/2161)。要求・設計→適用判定→author/revise/impl-only/non-target→trace/staleness→proof/review→registration→既存executorの責務鎖、authoring owner、model-map/receipt/advisory、plugin配布閉包を調査。
- Differential size: base→observedは828 files、+61,315 / -2,642。旧observed→新observedは祖先差分ではなくtree deltaで6 commits / 73 files / +1,453 / -1,913。主なdeltaはstructured config導入と関連docs/testsで、#2161の核心は不変。PR #2176のselected-model receipt一般化とPR #2178の`--out`衝突契約も維持される。
- Current finding: 全33 stageでauthoring ownerは0件。model-map v2、2モデル、drift、`--impl-only`、TLC/receipt/proof実例は再利用可能だが、要求/design identity、trace coverage、staleness、proof/review receipt、atomic registrationは未配線。
- Tracked `BLOCKER` candidate: `plugin.json`が`tla-model-receipt.ts`と`tla-module-deps.ts`を登録していない。fresh canonical focused suite 44 pass / 168 expectに対し、composed Codexは最初のmissing importでexit 1。M7/M8への帰属と修復方式をRequirements Analysisへ送る。
- Verification: rebase後Developer delta scanでfocused formal 44 pass / 0 fail / 168 expect、composed Codex exit 1、静的検査`UNLISTED:tla-model-receipt.ts` / `UNLISTED:tla-module-deps.ts`。初回scanのtypecheck / lint / projection / graph結果は旧observedの履歴証拠であり、新observedでは再実行していない。
- Updated artifacts: 共有9成果物へ本断面を追加し、過去断面を本文保持。per-intent record `re-scans/260804-tla-authoring.md`を新設。
- Per-intent record: `re-scans/260804-tla-authoring.md`

## 履歴: 260804-live-e2e-phase2 断面(observed `499d706a2`、本ファイルを鮮度ポインタ形式へ移行した断面 — ブロック全文保存)

### 最新観測

- Date: `2026-08-04`
- Observed commit: `499d706a25f3cc2cc0c2b1671dc4b282e3a818e1`
- Repository: `amadeus`
- Project type: Brownfield
- Scope: repository全体の共有CodeKBをlive filesystemで更新。
- Focus: Kimi Code print driverとKiro CLI ACP/TUIの現行実装、test、distribution、auth/config/child-env境界、およびcommit `12bf94ea6`で導入されたcommon live E2E policy/lifecycleとの接続seam。

### 差分基点

- Base commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`
- 選定理由: このIntentに既存re-scanがないため、他の`re-scans/`で最新のobservedを候補とし、`git merge-base --is-ancestor` exit 0を確認。HEADからの距離は7コミット。
- Shared timestampは鮮度ポインタであり、次回のper-intent差分基点は`re-scans/<intent>.md`から選ぶ。

### 観測範囲

`packages/framework/core/`、`packages/framework/harness/{kimi,kiro}/`、`packages/setup/`、`scripts/{package,promote-self,harness-manifest}.ts`、`tests/harness/live-e2e/`、Kimi/Kiro legacy driversとe2e、root package/lock、CI、関連docsを確認した。Kiro IDE GUI/CDP、Cursor、OpenCodeの詳細調査はPhase 2 focus外としたが、全体CodeKBの配布一覧には現行構成として含めた。

### 検証制約

read-only reverse engineeringのため、課金を伴うKimi/Kiro live journey、full test suite、buildは実行していない。ローカルCLI versionはKimi `0.31.1`、Kiro `2.13.0`、Bun `1.3.13`を実測した。成果物の構造検査とdiff検査は更新後に実行する。

> マージ解消注記(2026-08-05): 並行 intent 間の re-timestamp 衝突を cid:reverse-engineering:re-timestamp-merge-resolution の定型で解消。最新観測 = observed が新しい 260804-tla-authoring(7172aea8d は 499d706a2 より後の main 系譜コミット)、双方のブロックを全文保存。260804-live-e2e-phase2 断面が導入した鮮度ポインタ形式(旧1400行履歴の圧縮)は維持し、旧履歴は git 履歴に残存。
