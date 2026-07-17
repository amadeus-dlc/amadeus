# OpenCode 上の AI-DLC

> 言語: [English](opencode.md) | **日本語**

`dist/opencode/` は、**OpenCode** ハーネス向けの、フレームワークのハーネス
ディストリビューションの 1 つです。1 つの決定論的なコア、多数のハーネス:
エンジン、ステートマシン、監査ログ、グラフ、swarm レフェリー、learnings ゲートは
すべてのディストリビューションでバイト単位で同一であり、異なるのはシェルだけです。
このツリーは `bun scripts/package.ts opencode` によって
`packages/framework/core/` + `packages/framework/harness/opencode/` から
**生成** されます。手編集しないでください(ドリフトガードが CI で失敗します)。

## 前提条件

- **OpenCode** — `.opencode/` のコマンド・エージェント・設定サーフェスを持つ
  最近のリリース。
- **bun** — Claude ハーネスと同じ要件です。すべてのツールとフックは bun 経由で実行されます。
- **モデルプロバイダ** — OpenCode は通常設定されたプロバイダとモデルを使います。
  同梱の `opencode.json.example` はどちらもピンしません。

## インストール

このハーネスにはまだ **インストーラがありません** — ディストリビューションを
手動でプロジェクトにコピーしてください(Issue
[#1048](https://github.com/amadeus-dlc/amadeus/issues/1048)):

```bash
cp -r dist/opencode/.opencode/ your-project/.opencode/
cp -r dist/opencode/amadeus/   your-project/amadeus/    # ワークスペースシェル — .opencode/ の兄弟であり、中ではない
cp dist/opencode/AGENTS.md      your-project/AGENTS.md  # または既存のものにマージ
cp -n your-project/.opencode/opencode.json.example your-project/.opencode/opencode.json
```

`amadeus/` ディレクトリはワークスペースシェルです — エンジンが読み込む
事前ビルド済みの `amadeus/spaces/default/memory/` メソッドツリーを同梱します。
これは `.opencode/` の **兄弟** なので、別途コピーしてください(または
`dist/opencode/` ツリー全体を一度にコピー)。

OpenCode の既定の権限は全許可です。同梱の `opencode.json.example` は
`edit`・`bash`・`webfetch` を `ask` に絞り込みます。ゲートに関わる操作で
確認プロンプトを表面化させるため、この例の適用を推奨します。

## 使い方

オーケストレーターを `$amadeus` コマンド(`.opencode/commands/amadeus.md` に
記述)にスコープまたは説明を続けて起動します。他のすべてのハーネスと同じ
決定論的な転送ループを実行します。`AGENTS.md` は、再開したセッションが読む
セッション再開のオンボーディングを担います。

## 同梱物(機能単位)

| 単位 | 状態 |
| --- | --- |
| 配布 | `dist/opencode/` — 手動配置、インストーラなし([#1048](https://github.com/amadeus-dlc/amadeus/issues/1048)) |
| オーケストレーター | `.opencode/commands/amadeus.md`(`$amadeus` コマンド) |
| オンボーディング | `AGENTS.md`(セッション再開導線) |
| 設定例 | `.opencode/opencode.json.example` — `$schema` + 権限絞り込み(`edit`/`bash`/`webfetch` = `ask`) |
| セッションスキル | 4 本(`session-cost`・`replay`・`outcomes-pack`・`grilling`)— per-stage runner 32 本は初期スコープ外 |
| フック | **未配線(8 中 0)** — 工程0 対応表([#1049](https://github.com/amadeus-dlc/amadeus/issues/1049))で Cursor 相当の core hook 8 target を OpenCode の JS プラグイン API へ実測: **配線 0・条件付き 5・未対応 3**。下記 [フック対応表](#フック対応表-1049) を参照 |
| `promote:self` | 本ハーネスは非対象 |

## Claude Code との相違点

- **フック未配線**: OpenCode にはシェルコマンド型のフック機構がありません —
  拡張サーフェスは JS プラグインです。他ハーネスでフックに乗る監査発行・
  センサー発火・presence mint はここでは**動作しません**。工程0 対応表
  ([#1049](https://github.com/amadeus-dlc/amadeus/issues/1049))でプラグイン API を
  実測し、8 target のいずれも配線しませんでした。下記 [フック対応表](#フック対応表-1049) を参照。
- **`$amadeus --version`** は `amadeus 0.1.2` を報告します(exit 0)。
- **`$amadeus --doctor`** は advisory のみに劣化します — `.claude` 前提ブロックの
  誤発火と他 worktree の非列挙があり、いずれも正しさには影響しません。
- **セッションスキルのみ**: 読み取り専用のセッションスキル 4 本を同梱します。
  per-stage runner は初期スコープから除外されています。

## フック対応表 (#1049)

工程0 実測で、Cursor 相当の core hook 8 target を OpenCode のプラグイン API へ
分類しました(導入済み型定義を verbatim に実測)。**2026-07-17、
`@opencode-ai/plugin@1.18.3`(依存 `@opencode-ai/sdk@1.18.3`)で測定。**

| Cursor target | OpenCode 状態 | 確定条件 / 根拠 |
| --- | --- | --- |
| audit-and-sensors | ⚠ 条件付き | `tool.execute.after` の seam は確定。だが tool 語彙(`ToolIds = Array<string>`, enum 不在)と `args`(`args: any`)が型面未確定 — ライブランタイム実測が必要(別 intent) |
| runtime-compile | ⚠ 条件付き | 同上(`tool.execute.after`、語彙・args が型面未確定) |
| session-start | ⚠ 条件付き | `event`(`session.created`)に `source` フィールドがなく、`additionalContext` 注入 seam も OpenCode に不在。副作用のみ配線は不採用(偽対応を作らない) |
| session-end | ⚠ 条件付き | `event`(`session.deleted`)/ `dispose` は `reason` を運ばず、意味もセッション終了と異なる。副作用のみ配線は不採用 |
| validate-state | ⚠ 条件付き | `event`(`session.compacted`)は圧縮**後**発火。core hook は**圧縮前**バリデータで時機が逆 |
| mint(HUMAN_TURN) | ❌ 未対応 | phantom HUMAN_TURN 封鎖のため **fail-closed** 維持: `UserMessage` に machine 注入判別フィールドがなく、AskUserQuestion 応答が `chat.message` を経由するかも未検証。human-presence は現行 delegate 運用を維持 |
| log-subagent | ❌ 未対応 | subagent 停止 + `agent_type` / `agent_id` を運ぶイベントが無い |
| stop | ❌ 未対応 | ターン終了ゲートのイベントが無い(`session.idle` はアイドル遷移でありターン境界ではない) |

条件付き 5 行はすべて同一の未確定事実 — OpenCode の tool 語彙と `args` 構造が
型面で未確定 — に依存し、ライブランタイム実測が必要なため別 intent へ送りました。
各行の verbatim 型引用を含む完全な根拠は intent record の `mapping-table.md` に
あります。

## 再生成

```bash
bun scripts/package.ts opencode      # packages/framework/core + harness/opencode から dist/opencode を再生成
bun scripts/package.ts --check       # CI ドリフトガード(全ハーネス)
```

## 次のステップ

方法論はどのハーネスでも同じです — 中立な章から続けてください:

- [最初のワークフロー](../02-your-first-workflow.ja.md) — 注釈付きのエンドツーエンド実行。
- [フェーズとステージ](../04-phases-and-stages.ja.md) — 5 フェーズと 32 ステージ。
- [スコープ、深度、テスト戦略](../05-scopes-and-depth.ja.md) — 実行の適正化。
- [用語集](../glossary.ja.md) — すべての用語の定義。

他のハーネス: [ハーネスファミリー索引](README.ja.md)。
