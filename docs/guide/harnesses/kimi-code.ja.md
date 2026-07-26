# Kimi Code 上の AI-DLC

> 言語: [English](kimi-code.md) | **日本語**

`dist/kimi/` は、**Kimi Code** ハーネス向けの、フレームワークのハーネス
ディストリビューションの 1 つです。1 つの決定論的なコア、多数のハーネス:
エンジン、ステートマシン、監査ログ、グラフ、swarm レフェリー、learnings ゲートは
すべてのディストリビューションでバイト単位で同一であり、異なるのはシェルだけです。
このツリーは `bun scripts/package.ts kimi` によって `packages/framework/core/` +
`packages/framework/harness/kimi/` から **生成** されます。手編集しないでください
(ドリフトガードが CI で失敗します)。

## 前提条件

- **Kimi Code CLI ≥ 0.28.1** — 実測されたフロアです。フックイベント/マッチャーの
  ペイロード契約(実機の 0.28.1 に対して全フックイベント種をキャプチャ)、
  `.kimi-code/skills/` のディスカバリ、`AskUserQuestion` はすべてこのリリースで
  検証されています。`/skill:amadeus --doctor` がこのピンを強制します。
  `kimi --version` で確認してください。
- **bun** が PATH 上にあること — すべてのツールとフックは bun 経由で実行されます。
- **動作する Kimi CLI のセットアップ** — kimi は config に `default_model`、
  managed provider、models テーブルが無いとセッションを開始しません。また
  `kimi login` による OAuth クレデンシャルは `$KIMI_CODE_HOME`(デフォルトでは
  `~/.kimi-code`)配下に置かれます。今日 `kimi` でセッションを開始できているなら、
  これはすでに満たしています。

## インストール

setup CLI がディストリビューションをインストールし、kimi ハーネスの場合のみ、
同じ実行の最後でフック配線を行います:

```bash
bunx @amadeus-dlc/setup install --harness kimi --target your-project
```

これにより `.kimi-code/` ツリー(skills、agents、scopes、tools、hooks、
knowledge、sensors)、`amadeus/` ワークスペースシェル(エンジンが読み込む
事前ビルド済みの `amadeus/spaces/default/memory/` メソッドツリー — `.kimi-code/` の
**兄弟** であり、中ではない)、そして `AGENTS.md` オンボーディングファイルが
配置されます。ファイルペイロードの検証後、インストーラは次節のフック配線を
実行します。`upgrade` も同じ配線ステップを再実行するため、マーカーが剥がれた
(後述)managed block は再包装され、重複追加はされません。

## フック配線

Kimi Code には **プロジェクトレベルの config ファイルがありません**。このハーネスが
必要とする `[[hooks]]` と `[[permission.rules]]` は **ユーザーレベル** の
`$KIMI_CODE_HOME/config.toml`(デフォルトでは `~/.kimi-code/config.toml`)に
置かれます。1 回の配線でマシン上のすべてのプロジェクトをカバーします。

- **単一の正本。** 配線内容の正本は同梱の snippet
  `.kimi-code/hooks/amadeus-hooks.snippet.toml` です(ディストリビューション内では
  `dist/kimi/.kimi-code/hooks/amadeus-hooks.snippet.toml`)。本ガイドは snippet を
  転記せず参照とします — 正確なエントリはファイル自体を読んでください。
  マーカーで囲まれたブロックは、Kimi のフックイベントを
  `.kimi-code/hooks/amadeus-kimi-adapter.ts` アダプタ経由で配線し、決定論的コアの
  厳密なコマンドプレフィックスと Bolt worktree フローが必要とする git 動詞の
  `[[permission.rules]]` 事前許可を追加します。
- **インストーラのマージ方法。** インストーラはマージ計画を差分レポートとして
  表示し、明示的な対話確認を求め、既存の config をバックアップし(隣に
  タイムスタンプ付きコピー)、マージ結果をアトミックに書き込みます。既存の
  ユーザー独自の `[[hooks]]` エントリは保持されます。`# >>> amadeus-kimi-hooks >>>`
  と `# <<< amadeus-kimi-hooks <<<` の間の managed block だけが、置き換え・
  除去の対象になります。
- **非対話実行では配線が中断されます。** 対話ターミナルのない実行 — `--yes` を
  含みます。これは同意と **見なされません** — はレポートと手動手順を表示してから
  exit 1 になります。部分的に配線された kimi セットアップが成功と報告されることは
  ありません。
- **手動のフォールバック。** エディタで `$KIMI_CODE_HOME/config.toml` を開き、
  `.kimi-code/hooks/amadeus-hooks.snippet.toml` から
  `# >>> amadeus-kimi-hooks >>>` と `# <<< amadeus-kimi-hooks <<<` の間
  (両端を含む)のすべてをファイル末尾にコピーして保存します。
- **kimi CLI は config.toml を再シリアライズしてコメントを落とします**(実測)。
  このため managed block は 2 つの方法で識別されます — マーカー行と、アダプタの
  コマンド行シグネチャです。マーカーが剥がれたブロックも存在として検出され、
  二重追加はされず、次回の install/upgrade で新しいマーカーが再包装されます。
- **フックコマンドはセッションのプロジェクトディレクトリを cwd として実行**
  されるため、各エントリの相対アダプタパスはプロジェクトごとに解決されます。
  プロジェクトがインストールされていない場所では、アダプタは fail-open です。
- **フックは補助的な機構です。** 未配線の config でもワークフローはブロック
  されません — エンジンは同じ決定論的ループを実行し、フックは presence の
  mint、監査同期、セッションライフサイクルイベントを供給するだけです。
  doctor の probe チェックは、発火を検証できない場合にまさにこの旨を表示します。

## Doctor

```bash
bun .kimi-code/tools/amadeus-utility.ts doctor     # または: /skill:amadeus --doctor
```

kimi アームは 4 つのことを検査します:

1. **アダプタの存在** — プロジェクトの `.kimi-code/hooks/` にフック roster の
   `amadeus-kimi-adapter` エントリがあること。
2. **Managed block** — ユーザーレベル config の配線状態。完全な欠落(config
   ファイル不在を含む)は、インストーラ再実行/手動手順の fix 付きで失敗です。
   マーカーが剥がれて内容のみで検出される場合(CLI の再シリアライズによる)は
   advisory のパスで、次回の install/upgrade で再包装されます。重複・不対・逆転した
   マーカーは loud fail です。別の advisory スキャンは、managed block が検出
   されない状態で残っている managed 流の git 事前許可ルールを指摘します
   (不完全に除去されたブロックの残留の可能性 — 手動で確認してください)。
3. **バージョンフロア** — PATH 上の `kimi` が ≥ 0.28.1 であること。バイナリが
   見つからない場合はインストールのヒント付きで `kimi CLI on PATH` 行が失敗し、
   古いバージョンはアップグレードのヒント付きで失敗します。
4. **フック probe(advisory)** — アダプタを直接発火させます。「adapter fired」
   または「unverified … (advisory; hooks are auxiliary, the workflow still runs)」
   — probe の失敗がワークフローをブロックすることはありません。

## 使い方

オーケストレーターは `/skill:amadeus` にスコープや作りたいものの説明を続けて
起動します — 他のハーネスと同じユーティリティ群(`--status`、`--doctor`、
`--stage`、`--phase`、`--depth`、`--test-strategy`、`compose`)が使えます。
ステージごとのランナー(`/skill:amadeus-application-design` など)、スコープごとの
ランナー(`/skill:amadeus-feature` など)、読み取り専用のセッションスキル
(`/skill:amadeus-session-cost`、`/skill:amadeus-replay`、
`/skill:amadeus-outcomes-pack`、`/skill:amadeus-grilling`)は同じ
`.kimi-code/skills/` ツリーに同梱されています。ヘッドレス実行は print チャネル
経由で動作します: `kimi -p "/skill:amadeus --status"`。

## このハーネスでの相違点

- **Claude ハーネスに最も近い**: 本物のフックサーフェスと
  `AskUserQuestion` による構造化ゲート。`AskUserQuestion` が使えない場面
  (auto permission モード、ヘッドレスの `kimi -p`)では、ゲートは番号付き
  prose のフォールバックで描画されます。どちらの経路も human-presence guard が
  要求する監査可能な `HUMAN_TURN` を mint します。
- **SessionEnd がネイティブに存在** — 次回起動時の reconcile ハックは不要です
  (Codex では、閉じられなかったセッションを次回起動時に推論します)。
- **0.28.1 には SessionStart のコンテキスト注入が存在しません**(実測: probe した
  すべての注入形式が不達でした)。UserPromptSubmit の stdout が唯一の動作する注入
  チャネルなので、resume/コンテキストのテキストはそれに乗ります。session-start
  フックは副作用のみです。
- **Stop ブロック = exit 2 + stderr**(実測: reason がモデルに verbatim で
  届きます)。
- **skills、agents、scopes は `.kimi-code/{skills,agents,scopes}/` から
  ディスカバーされます** — 別途の `.agents/` ツリーはありません。
- **ステータスラインもウェルカムメッセージもありません** — ステージの可視性は
  TodoList ツールと `/skill:amadeus --status` に乗ります。
- **PostCompact は Kimi に存在しますが、意図的に配線対象外です**(フック
  カバレッジ表がこれを除外しています)。
- **Construction swarm = subagent floor のみ** —
  `bun .kimi-code/tools/amadeus-swarm.ts resolve --harness kimi` は
  `AMADEUS_USE_SWARM` をバッチごとに 1 回読みます: 未設定は subagent floor、
  `claude-ultra` / `codex-ultra` は floor へ loud-degrade します(`SWARM_DEGRADED`
  が監査されます)— `kimi-ultra` は存在しません。その他の値は fail-closed で
  rejected です。

## 再生成とライブジャーニー

```bash
bun scripts/package.ts kimi          # packages/framework/core + harness/kimi から dist/kimi を再生成
bun scripts/package.ts kimi --check  # ドリフトガード
```

Amadeus の self repository では、`bun run promote:self` が `dist/kimi/.kimi-code/`
をルートの `.kimi-code/` へ promote します(dogfood 対象)。

2 つの opt-in の **ライブ print ジャーニー** が、同梱ツリーに対して実機の
`kimi -p` セッションを駆動します:
`tests/e2e/t-print-kimi-status.serial.test.ts`(status ジャーニー)と
`tests/e2e/t-print-kimi-doctor.serial.test.ts`(doctor ジャーニー)で、ドライバは
`tests/harness/kimi-print-drive.ts` です。これらは **Kimi クレジットを消費** し、
実機の `kimi login` を前提とします:

```bash
AMADEUS_KIMI_PRINT_LIVE=1 bun test tests/e2e/t-print-kimi-*.serial.test.ts
```

- `AMADEUS_KIMI_PRINT_LIVE=1` がゲートです — これが無ければジャーニーは理由付きで
  skip します(CI 安全)。
- `AMADEUS_KIMI_BIN` は kimi バイナリを上書きし、`AMADEUS_KIMI_MODEL` は
  使い捨て config に書き込むモデルを上書きします。
- 各ジャーニーは、生成された最小の非秘密 config(`default_model` + managed
  provider + models テーブル — kimi がセッションを開始するために必要な形状)を持つ
  一時的な `$KIMI_CODE_HOME` に対して実行されます。認証は `credentials/` と
  `oauth/` の **symlink** 経由で供給されます — OAuth のバイトは一切コピー
  されず、live 実走中のトークン refresh は実際のクレデンシャルストアへ
  書き戻されます(実認証を使うことの受容済みの帰結です)。

## 次のステップ

インストールと配線が完了しましたか? 方法論はどのハーネスでも同じです — 中立な
章を続けてください:

- [最初のワークフロー](../02-your-first-workflow.ja.md) — 注釈付きのエンドツーエンド実行。
- [フェーズとステージ](../04-phases-and-stages.ja.md) — 5 フェーズと 32 ステージ。
- [スコープ、深さ、テスト戦略](../05-scopes-and-depth.ja.md) — 実行の適正サイズ化。
- [用語集](../glossary.ja.md) — すべての用語の定義。

他のハーネス: [Codex CLI 上の AI-DLC](codex-cli.ja.md) · [ハーネスファミリーの索引](README.ja.md)。
