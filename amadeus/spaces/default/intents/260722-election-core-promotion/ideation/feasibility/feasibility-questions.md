# Feasibility 質問ファイル — チーム機能のコア昇格

> 判定: 本 intent の質問はユーザー直接回答で確定する(intent-capture ヘッダの判定を継承 — ユーザー宣言「選挙裁定不要です。私が答えます」)。
> 承認: ユーザー直接回答方式を承認(アンカー = WORKFLOW_STARTED 監査行 2026-07-22T22:24:58Z。各回答は QUESTION_ANSWERED 行で個別裏取り可能)
> 上流入力(consumes 全数): intent-statement(required)。optional の competitive-analysis / market-trends / build-vs-buy は market-research SKIP のため設計上不在(expected)

## Q0. 回答モードの選択

このステージの質問(見積り3〜5問)をどのモードで回答するか。外部依存(herdr / agmsg)の事実関係は feasibility:c1 に従い実ツールで直接検証し、質問は判断事項のみに絞る。

- A. Guide me(対話的)
- B. Grill me(1問ずつ深掘り・推奨付き)
- C. I'll edit the file(ファイル直接編集)
- D. Chat(自由議論から抽出)

[Answer]: B — Grill me(2026-07-23 ユーザー回答)

### Q1. agmsg の公開状況(estimate confirmation)

実測: ~/.agents/skills/agmsg は v1.1.6、git リポジトリではなく(fatal: not a git repository)、LICENSE ファイルも不在。herdr(OSS・herdr.dev で公開配布)と異なり、公開配布物の存在を自己調査で確定できなかった。推定: 「agmsg は現時点で公開配布されていない個人/チーム内ツール」(確信度: 中)。この真偽は依存宣言/取り込み/抽象化の選択空間を決める feasibility の根本制約。

- A. はい、推定どおり非公開(推奨 — 現物に配布元記録が無い実測と整合)
- B. いいえ、公開されている(場所を補足ください)
- X. その他(補足)

[Answer]: X — 「agmsg や herdr は外部依存ツールです。必須です。パスが通っていて使えればよいです」(2026-07-23 ユーザー回答 verbatim)。裁定: 両ツールは bun と同格の必須外部前提(prerequisite)として扱い、amadeus は同梱・取り込み・抽象化をしない。契約は「PATH 上に存在し使えること」。公開入手経路の docs 記載可否は RAID の依存事項として記録し docs 執筆時に確定する

### Q2. サポートプラットフォームの下限(クリーン環境 E2E の環境定義)

Q1 裁定(herdr/agmsg = PATH 前提の必須外部依存)を受け、成功定義「クリーン環境 E2E」の環境をどこまで保証するか。実測: herdr は macOS/Linux が stable、Windows は beta。amadeus 本体は native Windows PowerShell 対応を謳うが、チーム機能の起動系(team-up.sh)は bash。推奨は macOS+Linux — herdr の stable 面と bash 前提に整合し、Windows はチーム機能のみ「未サポート(amadeus 本体は動く)」と docs に明記する形。

- A. macOS + Linux(Windows はチーム機能対象外と明記)(推奨)
- B. macOS のみ(現ドッグフード環境と同じ)
- C. Windows も含む(bash 依存の解消が必要になる)
- X. その他(補足)

[Answer]: A(2026-07-23 ユーザー回答。macOS + Linux を下限、Windows はチーム機能対象外と docs 明記)

### Q3. クリーン環境 E2E の実証形態はどれか

成功定義(クリーン環境 E2E)の検証をどう実施するか。実測の制約: E2E は herdr のターミナル起動・複数エージェントセッション・人間の承認操作を含み、完全自動化はコスト大(既存 e2e 層は node-pty/@xterm ベースだが、herdr のペイン起動と複数 CLI セッションの自動駆動は未整備)。推奨は「手動実証+手順の docs 固定」— 実証1回の再現手順そのものが利用者向けセットアップガイドになり、成果物が二役を果たすため。CI 自動化は価値に対してコストが不釣り合いで、必要なら後続 intent。

- A. 手動実証1回+手順を docs に固定(検証記録を record に残す)(推奨)
- B. CI 自動化まで本 intent で行う
- X. その他(補足)

[Answer]: X — e2e テストに組み込む(2026-07-23 ユーザー裁定「手動?まさか。e2e テストに組み込むのでは?」→ conductor 再実測で既存基盤の実在を確認: tests/integration/t-team-msg.test.ts の fake herdr バイナリパターン+tests/e2e/ の node-pty/@xterm 駆動 serial 群+選挙系 t234〜t244。これらを再利用し、herdr/agmsg 実バイナリ面は fake-binary seam で CI 可能化、クリーン環境相当は temp HOME+隔離 PATH+self-install ツリーで構成。手動実証は不採用。当初推奨 A は既存資産の実測不足による誤り — conductor 自省)

### 合意サマリ確認(C-4)

- A. 確認した — 成果物生成へ進む(推奨)
- B. 修正したい

[Answer]: A(2026-07-23 ユーザー確認 — サマリ確定、成果物生成へ)
