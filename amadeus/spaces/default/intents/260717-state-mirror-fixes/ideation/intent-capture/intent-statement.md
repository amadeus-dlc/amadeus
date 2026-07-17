# Intent Statement — 260717-state-mirror-fixes

上流入力(consumes 全数): (なし — 本ステージは consumes 宣言なし。入力はユーザー記述 $ARGUMENTS と Issue #1170 / #1172 の実読)

## Problem Statement(解決するビジネス課題)

amadeus フレームワークの dogfooding 運用中に実測された不具合 2 件を修正する fix バッチ intent である(質問ファイル Q1=C の裁定)。

1. **Issue #1170(bug / P2 / S3-MAJOR)**: per-unit Construction 中、並行セッションの `amadeus-sync-statusline` フックが、自セッションの古い TaskUpdate/activeForm 由来スナップショットで共有 `amadeus-state.md` の `Current Stage` / Stage Progress checkbox を上書きし、audit(正本)と乖離する方向へ繰り返し巻き戻す。ユーザーの追加実測(2026-07-17T17:05:58Z コメント)で書き手が特定済み(state の `Last Updated` と `.amadeus-hooks-health/sync-statusline.last` が秒単位で一致 — 確定度: 高)。実害: `amadeus-learnings.ts surface` 等の Current Stage 依存ツールが slug mismatch で拒否され、手動修復(checkbox/set)を強いられる。3回実測。
2. **Issue #1172(bug / P3 / S4-MINOR)**: `scripts/amadeus-mirror.ts:100` の `countStageProgress` が `- [S] ` 行のみを分母から除外し、スコープ SKIP の実様式である `- [ ] <stage> — SKIP`(空白チェックボックス+行末サフィックス)を除外しない。intent 260717-mirror-issue-tool(in-scope 18 ステージ全承認)の sync 実測で `approved 18/32` と誤表示(期待 18/18)。表示のみの実害。

### クロスレビュー成立と追加実測(2026-07-17T17:36:17Z leader 共有)

両 Issue とも e2/e3 の独立2名クロスレビューが成立済み(全件実在確認・P/S ラベル妥当の verdict、issue-cross-review 充足)。追加実測:

- **#1170 の3回目巻き戻りが git 履歴に固定**(e3): コミット 5a0cd1e6e(session-close checkpoint)で `[x]→[-]`・`In Progress: none→nfr-requirements`・`Active Agent: quality→architect` の diff — nfr-requirements 当時の断面がそのまま書き戻された形状で、古スナップショット上書き説と整合。**乖離は現 origin/main HEAD で継続中**であり、修正時は現 record の state 修復も併せて必要
- **機序のコード裏付け**(e2): `amadeus-sync-statusline.ts` → `amadeus-utility.ts handleSetStatus`(前進・後退の判定なしで無条件書き込み)→ `amadeus-lib.ts:3792-3796 setCheckbox`(正規表現が `[x]` を含む任意の既存状態にマッチして置換)— 単調性ガードがコード上に一切なく、機序が構造的に成立
- **2バグの相互裏付け**(e2): 現 HEAD で `countStageProgress` の approved が起票時 18 でなく 17 になるのは #1170 の巻き戻り由来(#1172 の欠陥とは独立)。乖離が表示系まで実害を出している傍証
- **#1172 のテスト設計示唆**(e2/e3 レビュー所見、留保付き持ち越し): fixture に「`[S]` かつ `— EXECUTE`」(ジャンプ skip)と「`[ ]` かつ `— SKIP`」(スコープ skip)の両形式を含め、様式取り違えの再発を封じる

## Target Customer(誰がどう恩恵を受けるか)

質問ファイル Q2=A の裁定より:

- **amadeus をチームモードで運用する開発チーム**(一次): 並行セッション稼働下でも state が巻き戻らず、手動修復作業(2026-07-17 に3回発生)が不要になる
- **mirror Issue の閲覧者**(二次): GitHub 側の状態行が正しい in-scope 分母で進捗を示す

## Success Metrics(成功の定義・計測可能な指標)

質問ファイル Q3=A の裁定より:

- **#1170**: 並行セッション稼働下で `amadeus-state.md` の Current Stage / checkbox が後退方向(approved 済みステージへの巻き戻し・Completed→Running)へ書き戻されないこと。Issue 記載の再現手掛かり(sync-statusline の周期同期 vs 進行セッションの書き込み)で非再現+リグレッションテスト green
- **#1172**: `— SKIP` サフィックス行が分母から除外され、in-scope 分母(例: 18/18)で表示されること。unit テスト green
- 共通: `bun run typecheck` / `bun run lint` / 既存テストスイート green を維持(org.md バグ修正規範: リグレッションテスト追加+既存スイート green 維持)

## Initiative Trigger(なぜ今か)

質問ファイル Q4=A の裁定より: dogfooding(intent 260717-mirror-issue-tool の実運用)中に実測された不具合であり、#1170 は同日中に3回再発+書き手特定まで完了、#1172 は修正案まで Issue に明記済み。着手はユーザー指示による(issue-selection-user-decides 準拠。scope=amadeus はユーザーの明示指示 — 2026-07-17T17:32:39Z leader 経由訂正)。

## Initial Scope Signal(初期スコープシグナル)

- スコープ: **amadeus**(Self-hosted Amadeus framework development without infrastructure operations、18 ステージ)— bugfix-scope-for-bug-intents の既定に対するユーザー明示の例外切替
- 本 intent は Ideation フェーズまで実施して park する(leader タスク割当 2026-07-17T17:32:09Z)。割当時点ではクロスレビュー未成立が park 理由だったが、17:36:17Z に両 Issue とも2名成立 — park 方針自体は割当指示のとおり維持し、Construction 進入の可否・時期は leader/ユーザーの判断に委ねる
- 修正対象の想定面: `.claude/hooks/` の sync-statusline(正本は `packages/framework/core/hooks/`)+ `scripts/amadeus-mirror.ts`(repo ローカルツール)。詳細な修正方式(後退方向書き込みガード vs 単調性検査)は後続ステージの設計判断とする(#1170 コメントの「修正方向の示唆」は留保付きで持ち越し — citation-reservation-preservation 準拠)
