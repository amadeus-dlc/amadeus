# Code Generation Plan — docs-drift-repair

上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, requirements.md (注: nfr-design / infrastructure-design 系 consumes は amadeus-document スコープが当該ステージを SKIP するため設計上不在 — degrade 構成の documented fallback)

依拠箇所: 実行手順は business-logic-model.md の5段プロセス、表記・閉包規則は business-rules.md BR-1〜BR-6、対象集合・真実源・乖離レコード正規形は domain-entities.md、受け入れ基準は requirements.md FR-1〜FR-7/NFR に従う。

## Step 1: 再接地(段1)

- [x] `git fetch origin main`、最新 origin/main SHA を測定 ref として確定
- [x] 上流成果物の file:line 引用のシフト有無を確認(upstream-cite-reresolve-on-shift)

## Step 2: 二層照合と乖離目録(段2-3、developer subagent・read-only+ledger 書込)

- [x] 機械照合4スイープ(件数語・列挙・パス/コマンド実在・EN/JA ペア)を README*.md + docs/ 全域へ実行
- [x] 精読照合(区間ホットスポット+機械照合ヒット文書)
- [x] `drift-ledger.md` を本 CG ディレクトリに確定(正規形・件数は機械再計算)

## Step 3: PR-1 実装(クラスタ A+B、worktree 分離)

- [x] README.md / README.ja.md: Kimi 行追加+件数更新(BR-2 隣接列挙原則)
- [x] docs/guide/19-plugins{,.ja}.md: 7/5 正値化+kimi 列挙追加 — 着手時実測で **PR #1568 により解消済み**と確定(監査で「是正の模範形」判定)、本 intent での修正は不要
- [x] 受け入れ基準 grep(FR-1/FR-2)を実行し出力転記
- [x] CI ローカル検証 → PR 発行(タイトル・本文日本語、コミット英語)

## Step 4: PR-2 実装(クラスタ C+D+E+FR-6 残余、worktree 分離)

- [x] FR-3: EN twelve の count-free 化+JA 4ファイル count-free 化+JA roster 5ファイルへ plugin-compose 追加+8ファイル EN/JA 同期
- [x] FR-4: 01-architecture{,.ja}.md:60 の agent ファイル数修正+FR-6 検出の既存乖離修正
- [x] FR-5: team-messaging.ja.md / publishing-setup.ja.md 新規作成(EN 同期・H2 節数照合)
- [x] 受け入れ基準 grep(FR-3/FR-4/FR-5)を実行し出力転記
- [x] CI ローカル検証 → PR 発行(検出量超過につきユーザー裁定で 3 PR 編成へ変更 — #1576/#1577/#1578)

## Step 5: 検証と閉包(段5)

- [x] 乖離目録の全行閉包(修正コミット or Issue 番号、残余 0)
- [x] EN/JA ペア照合(各 PR diff の片側変更 0)
- [x] CI 検証 — 3 PR とも GitHub CI「CI Success」pass(docs-only につき重ジョブは path filter で skipping、集約ゲート green)。ローカル全スイートは PR 側 CI に委譲
- [x] code-summary.md 作成

## 制約(全 subagent ディスパッチに焼き込み)

- 割当 worktree 外での git 操作(checkout/stash/reset)禁止、本線絶対パス非混入(cid:code-generation:c2)
- state 変更コマンド(amadeus-orchestrate.ts report / amadeus-state.ts / amadeus-log.ts / amadeus-bolt.ts)の実行禁止 — ゲート・レビュー・§13 は conductor のみ(cid:build-and-test:cg-subagent-state-mutation-ban)
- 逸脱(要件・設計から外れる必要)は実装前に停止して conductor へ報告(cid:code-generation:deviation-stop-before-implement)。既存様式への準拠と判断する場合も停止対象
- 検証は同期で完遂し、モニタ/バックグラウンド待ちでターンを終了しない(cid:code-generation:builder-prompt-sync-completion)
- 実装コード変更ゼロ(NFR-2)。実装側欠陥は Issue 起票のみ(BR-6)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T08:44:12Z
- **Iteration:** 1
- **Scope decision:** none

FD/requirements から plan/summary までの写像整合・件数機械検算一致・逸脱申告済みで READY。Minor 2件は同 iteration 内で code-summary へ追記済み。

### Findings

- [Minor] code-summary の README 表形式変更に BR/FR 引用なし — 是正: base-advance-regrounding(段1)+FR-1a/BR-3/BR-4 の引用を追記(同 iteration 内閉包)
- [Minor] PR 別件数とクラスタ表の対応トレース欠落 — 是正: クラスタ→PR 配分節を追記、22+14+61+1=98 の機械検算併記(同 iteration 内閉包)
