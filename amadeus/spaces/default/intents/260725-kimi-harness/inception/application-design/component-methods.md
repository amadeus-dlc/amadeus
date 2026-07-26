上流入力(consumes 全数): requirements, architecture, component-inventory, team-practices

# Component Methods — 260725-kimi-harness

> 上流入力の使用箇所: requirements.md の FR-2/FR-3/FR-4/FR-9 のインターフェースを本ファイルに展開。component-inventory.md の現行節(cursor の adapter/lib 構造・3閉集合)を C2/C4 の形状の根拠として使用。architecture.md の現行節(packaging flow)を導入経路の根拠として使用。team-practices.md の Walking Skeleton(最初の Bolt = C1 スライス)が C1 の完了定義(`package.ts kimi` + `--check`)を定める。

各コンポーネントの公開インターフェース(高レベル。詳細な業務ルールは Functional Design へ)。

## C2. amadeus-kimi-lib.ts(変換ロジック)

| メソッド | 入出力 | 目的 / エラー方針 |
|---|---|---|
| `routeTarget(target: string): CoreHookCall[]` | target 名 → 0..n 件の core hook 呼出仕様 | 9 target の分岐表。未知 target は fail-open(空配列 + exit 0) |
| `normalizePayload(event: string, raw: unknown): ClaudePayload` | Kimi payload → Claude 契約 | フィールド欠落は既定値で補完(寛容)。`tool_input` の抽出はツール名別(Write/Edit=TodoList=Bash=AskUserQuestion) |
| `translateStopOutput(coreStdout: string): { exitCode: number; stderr?: string; stdout?: string }` | core hook stdout(Claude `{"decision":"block","reason"}`) → Kimi 契約(exit 2 + stderr または `hookSpecificOutput`) | block 契約の verbatim 中継のみ例外を fail-closed で扱う |
| `translateSessionStartOutput(coreStdout: string): string` | session-start の context 注入形式への変換 | live capture で確定した形式に従う |

## C2. amadeus-kimi-adapter.ts(shim)

| 振る舞い | 内容 |
|---|---|
| entrypoint | `bun .kimi-code/hooks/amadeus-kimi-adapter.ts <target>`。stdin を読み `routeTarget` で core hook を subprocess 呼出し。各 core hook の stdout/exit を `translate*` で中継 |
| エラー方針 | 全経路 fail-open(例外捕捉・exit 0)。subprocess 不在(未インストールプロジェクト)も exit 0 |

## C3. domain/kimi-hooks.ts(純粋ロジック)

| メソッド | 入出力 | 目的 / エラー方針 |
|---|---|---|
| `renderManagedBlock(snippet: string): string` | snippet 正本 → マーカー囲みブロック文字列 | BEGIN/END マーカーコメントで囲む |
| `planMerge(configText: string, block: string): MergePlan` | 現 config → {action: "add"|"replace"|"noop", diffText} | 既存ブロック検出で冪等。TOML 構文不正は loud fail(IoError) |
| `applyMerge(configText: string, plan: MergePlan): string` | 新 config 文字列 | 純粋変換。managed block 外はバイト保持 |
| `removeManagedBlock(configText: string): string` | managed block を除去した文字列 | マーカー不在は noop |

## C3. modules/kimi-hooks.ts(組込み)

| 振る舞い | 内容 |
|---|---|
| plan 連携 | install/upgrade の plan report(FR-007 相当)に managed block の差分を追加表示 |
| confirm 連携 | wizard の `confirm()` で承認を取り、拒否時は変更なし + 手動手順表示(BR-I18 流儀) |
| 書込み | 既存 `apply-write` port 経由で atomic。事前にバックアップファイル作成 |
| 除去 | `uninstall`/明示コマンドで managed block のみ除去 |

## C4. doctor arm(kimi)

| チェック | 内容 |
|---|---|
| adapter 実在 | `.kimi-code/hooks/amadeus-kimi-adapter.ts` の存在 |
| managed block 有無 | `~/.kimi-code/config.toml`($KIMI_CODE_HOME 考慮)のマーカー検出。不在時は手順 hint |
| バージョンフロア | `kimi --version` を semver 比較(下限 = 実装時の実測版。既存 arm 流儀で失敗扱い) |
| 機能 probe | 軽量な hook 発火確認(失敗してもワークフローは動く旨を advisory 表示) |

## C6. kimi-print-drive.ts

| メソッド | 入出力 | 目的 |
|---|---|---|
| `runPrintSession(args: { cwd: string; prompt: string; env?: NodeJS.ProcessEnv }): Promise<PrintResult>` | `kimi -p` を spawn し stdout/exit を回収 | journey の最小駆動プリミティブ |
| `skipReason(): string | null` | `AMADEUS_KIMI_PRINT_LIVE !== "1"` や kimi バイナリ不在で理由文字列 | 既存 driver と同じ契約 |
