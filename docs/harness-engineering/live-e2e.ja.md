# 実ハーネスのエンドツーエンド検証

> 言語: [English](live-e2e.md) | **日本語**

このランブックは、Amadeus のハーネス配布物を実際の CLI とモデルに対して検証するための、opt-in かつローカル限定のジャーニーを説明します。型付きレジストリが静的な一次情報、JSONL 台帳が実行の事実の記録であり、以下のマトリクスは両者から生成されるビューです。

## 安全境界

ライブジャーニーは、opt-in 変数が設定されていても GitHub Actions 上では決して実行しません。各アダプタは専用の opt-in を持ち、受理する値は厳密な文字列 `1` だけです。子プロセスは新規に構築した許可リスト環境と短命のクレデンシャルリースを受け取ります。ソースの認証ファイル、ユーザー設定、ユーザーフック、ソースのホームパス、プロンプト、stdout/stderr の全文を、永続的な証跡として受け取ることも複製することもありません。

`codex-exec` アダプタは `AMADEUS_CODEX_EXEC_LIVE=1`、Codex CLI 0.139.0 以上、`dist/codex`、および `OPENAI_API_KEY` のクレデンシャルリースを要求します。`claude-print` アダプタは `AMADEUS_CLAUDE_PRINT_LIVE=1` を、`claude-tui` アダプタは `AMADEUS_TUI_LIVE=1` と tmux を要求します。`claude-print` と `claude-tui` はいずれも、計測済みのフラグを備えた Claude Code 2.1.220 以上と `dist/claude` を要求します。`claude-sdk` アダプタは別途 `AMADEUS_CLAUDE_SDK_LIVE=1`、Claude Agent SDK 0.3.158 以上、および `dist/claude` を要求します。Claude SDK と TUI の認証には短命の `ANTHROPIC_API_KEY` バインディングが必要です。Claude print は代わりに、検証済みのネイティブキーチェーンログインを使用できます。ソースの `HOME`、`CLAUDE_CONFIG_DIR`、ユーザー/ローカルの設定は、いずれの場合も転送しません。SDK アダプタは隔離されたワーカーグループ内で SDK クライアントとストリームを所有し、環境クレデンシャルを長さプレフィクス付きの stdin フレーム1本で転送し、クリーンアップの前に abort を TERM、KILL へとエスカレートします。

`kiro-tui` アダプタは `AMADEUS_KIRO_TUI_LIVE=1`、tmux、Kiro CLI 2.6.0 以上、および `dist/kiro` を要求します。Kiro は認証情報をユーザーのホーム配下のオンディスクデータベースに保持し、ホームごとのパスからチャットランタイムを再実行するため、環境クレデンシャルリースは存在しません。代わりにスクラッチホームがこの2つのソースエントリを参照でバインドします。クレデンシャルのバイト列がユーザーのホームを出ることはなく、スクラッチへ何も複製されず、アダプタがソースホーム配下へ書き込み・編集・削除を行うことはありません。スクラッチツリーを削除すればバインディング全体が消えます。ソースの `HOME`、`XDG_DATA_HOME`、`KIRO_HOME`、および周囲の AWS クレデンシャルを子プロセスへ転送することはありません。

クリーンアップは、もう1つの記録される結果ではなくバリアです。クリーンアップのエラー、リークの検出、リソースの残存は `cleanup-barrier-failed` を返し、実行とアサーションが成功していても台帳への追記を抑止します。`executed/asserted → cleanup-barrier-closed → ledger-appended|already-present → closure-committed` の順序だけが、PASS のレシートまたはサポートされたマトリクスへの投影を解放できます。

## ライブジャーニーの実行

Codex の直列ジャーニーは、クリーンなローカル worktree からのみ実行してください。

```bash
AMADEUS_CODEX_EXEC_LIVE=1 OPENAI_API_KEY='…' \
  bun test --timeout 180000 tests/e2e/t-exec-codex-kernel.serial.test.ts
```

ランナーは新しい Git プロジェクトと独立した Codex ホームを作成し、`dist/codex` だけをインストールし、`codex exec --json --ephemeral` プロセスを1つ起動し、exit・スキーマ・ファイルのアンカーを検査し、プロセスを回収し、クレデンシャルバインディングを破棄し、スクラッチリソースを削除します。opt-in、CLI、配布物、バージョン、クレデンシャルのいずれかが欠けている場合は、スクラッチを確保する前に機械可読なスキップを返します。

Claude print の直列ジャーニーは、クリーンなローカル worktree からのみ実行してください。

```bash
AMADEUS_CLAUDE_PRINT_LIVE=1 ANTHROPIC_API_KEY='…' \
  bun test --timeout 120000 tests/e2e/t-claude-print-kernel.serial.test.ts
```

Claude Code に使用可能なネイティブキーチェーンログインがある場合は `ANTHROPIC_API_KEY` を省略してください。ランナーはスクラッチを確保する前にネイティブクレデンシャルを検証します。`dist/claude` を新しい Git プロジェクトへコピーし、プロジェクトの `.claude/settings.json` へ厳密に `{ "hooks": {} }` を書き込み、新しい `HOME` と `TMPDIR` を設定し、`claude -p --setting-sources project --tools "" --no-session-persistence --output-format json --json-schema … --max-budget-usd 0.25` を起動します。成功には、クリーンアップと台帳への永続追記の前に、exit がゼロであること、`is_error=false`、ターンが1つ以上あること、そして閉じた構造化出力 `{ "amadeus_live_e2e": "ok" }` が必要です。

Claude Agent SDK の直列ジャーニーは、print のジャーニーとは独立に実行してください。

```bash
AMADEUS_CLAUDE_SDK_LIVE=1 ANTHROPIC_API_KEY='…' \
  bun test --timeout 120000 tests/e2e/t-claude-sdk-kernel.serial.test.ts
```

親プロセスは SDK クライアントを一切 import しません。新しいプロジェクト/ホームを作成し、SDK を所有するワーカーグループを1つ起動し、実行に束縛されたクレデンシャルフレームを1回だけ送信し、プロジェクト限定の設定でリテラルな `echo ok` プロンプトを駆動します。ワーカーは境界付きでサニタイズされた JSON イベントだけを発行します。成功には、終端の成功結果がちょうど1つ、正のターン数、パーミッション拒否がゼロ、順序付いた state/audit の観測、そして空でない tool-result または assistant バイトの証跡が必要です。90秒のデッドラインで SDK の abort を要求し、10秒待ってから TERM へ5秒、KILL/回収へ5秒とエスカレートします。単一イベントが 65,536 バイトを超える、イベント出力の合計が 1 MiB を超える、イベントが 4,096 個を超える、インメモリキューが 16 イベントまたは 256 KiB を超える、終端の重複や遅着、あるいはクリーンアップ/クレデンシャルのリークがあれば、いずれも非グリーンです。

Claude TUI の直列ジャーニーは、クリーンなローカル worktree からのみ実行してください。

```bash
AMADEUS_TUI_LIVE=1 ANTHROPIC_API_KEY='…' \
  bun test --timeout 180000 tests/e2e/t-claude-tui-kernel.serial.test.ts
```

TUI ランナーは、実行専用の `tmux -S` サーバーとセッションの内側で、プロジェクト限定の設定とスクラッチに閉じた `acceptEdits` パーミッションを与えて Claude を起動します。ペインが描画されるのを待ち、128 ビットの実行 ID に束縛されたプロンプトを1つ送信し、当該実行のファイルアンカーを厳密に検証し、境界付きのペインダイジェストだけを保持し、その後に台帳を呼び出せるようになる前へセッション・サーバー・クレデンシャル・スクラッチの各リソースを閉じます。デフォルトの tmux サーバー上のセッションを列挙・アタッチ・kill することは決してありません。

Kiro TUI の直列ジャーニーは、クリーンなローカル worktree からのみ実行してください。

```bash
AMADEUS_KIRO_TUI_LIVE=1 \
  bun test --timeout 240000 tests/e2e/t-kiro-tui-kernel.serial.test.ts
```

ランナーは `dist/kiro` を新しい Git プロジェクトへコピーし、新しい `HOME` と `TMPDIR` を設定し、ソースの認証データベースとチャットランタイムをスクラッチホームへバインドし、実行専用の `tmux -S` サーバーとセッションの内側で `kiro-cli chat --agent kiro_default --trust-all-tools` を起動します。組み込みエージェントを固定するのは意図的です。このジャーニーが計測するのは TUI のトランスポートであって同梱の conductor ではなく、conductor 自身のワークフロージャーニーは `tests/e2e/t-tui-kiro-*` にあります。実行専用のソケットは、スクラッチルート内に入れ子にするとプラットフォームの UNIX ドメインソケットのパス長制限を超えるため、システムの一時ディレクトリ配下に実行を識別する短い名前で作成し、クリーンアップで unlink します。trust-all の確認ピッカーを1回クリアし、入力フッターが描画されるのを待ち、128 ビットの実行 ID に束縛されたプロンプトを1つ送信し、当該実行のファイルアンカーを厳密に検証し、境界付きのペインダイジェストだけを保持し、その後に台帳を呼び出せるようになる前へセッション・サーバー・バインディング・スクラッチの各リソースを閉じます。デフォルトの tmux サーバー上のセッションを列挙・アタッチ・kill することは決してありません。認証は存在の有無だけを調べます。先に `kiro-cli login` を実行してください。また、このジャーニーは短いターン1回分の実際の Kiro クレジットを消費します。

## 台帳とマトリクス

記録された実行は `tests/harness/live-e2e/runs.jsonl` へアトミックに追記されます。記録されるレシートにはアダプタ/バージョン/SHA/時刻/結果と境界付きのダイジェストが含まれ、生のクレデンシャル、ソースの絶対パス、プロンプト、出力の全文は決して含まれません。永続化の pending マーカーはグリーンの証跡ではありません。投影する前に、同一のレシートを回復してください。

派生マトリクスの描画・更新・検査は次で行います。

```bash
bun tests/harness/live-e2e/project-matrix.ts render
bun tests/harness/live-e2e/project-matrix.ts update
bun tests/harness/live-e2e/project-matrix.ts check
```

ライブテストが更新するのは台帳だけです。メンテナが明示的に `update` を実行し、生成されたブロックをレビューしてから `check` を実行します。ブロック内部の手編集はドリフトであり、コントラクトテストが失敗します。

生成されたマトリクスは英語版(`docs/harness-engineering/live-e2e.md`、冒頭の言語切替リンクから辿れます)が保持します。`project-matrix.ts` が書き込むのはそのファイルだけなので、最新の内容はそちらを参照してください。

## 配布物変更のトリガー

`dist/<harness>`、ハーネスドライバ(Claude の print・SDK・TUI を含む)、またはインストーラを変更する intent を完了する前に、レジストリ上で影響を受けるアダプタをすべて特定し、それぞれのローカルライブジャーニーを1回実行してください。完了の証跡は、台帳上の pending を含まないレシートと、クリーンなマトリクス検査です。ユニットテストと fake を使った統合テストは、このライブの証跡を代替しません。

## トラブルシューティング

- `CI_FORBIDDEN` または `OPT_IN_REQUIRED`: CI は無効のままにし、意図したローカル実行のときだけアダプタ固有の opt-in を設定してください。
- `BINARY_MISSING`、`VERSION_UNSUPPORTED`、`DIST_MISSING`: サポート対象の CLI をインストールするか、フレームワークのソースから配布物を再生成してください。`dist/` を直接編集しないでください。
- `AUTH_UNAVAILABLE`: 文書化された環境クレデンシャルリースを与えてください。ランナーをユーザーの認証/設定ディレクトリへ向けないでください。
- `pending-durability`: 記録されたレシートを厳密に使って回復を再実行してください。マーカーやロックを手で削除しないでください。
- `lock-timeout`: 所有者を調べてください。カーネルが自動的に回収するのは、死んでいると証明できる所有者か、スタンプのない stale なロックだけであり、生存中または不明な所有者を強制削除することはありません。
- `generated-block-drift`: マトリクスの更新を明示的に実行し、差分をレビューしてから検査を再実行してください。
