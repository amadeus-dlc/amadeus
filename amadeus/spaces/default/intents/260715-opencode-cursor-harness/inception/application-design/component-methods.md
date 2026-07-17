# Component Methods — opencode / Cursor harness 対応

intent: `260715-opencode-cursor-harness`。上流: `../requirements-analysis/requirements.md`(AC-1b の意味論適合照合を本書で実施)、codekb の architecture.md / component-inventory.md、`../practices-discovery/team-practices.md`(Code Style 変更なし)。

## C1/C2 共通: manifest の型契約

| メンバ | 型(`scripts/manifest-types.ts` 準拠) | opencode | cursor |
| --- | --- | --- | --- |
| `name` | string | `"opencode"` | `"cursor"` |
| `harnessDir` | string | `".opencode"` | `".cursor"` |
| `coreDirs` | `{src,dst}[]` | tools/amadeus-common/knowledge/sensors/scopes/agents/hooks 同名 + rules→amadeus-rules | 同左 |
| `harnessFiles` | `{src,dst,projectRoot?}[]` | `dot-gitignore` → `.gitignore`(projectRoot、codex 前例) | 同左 |
| `rulesRename` | string | `"amadeus-rules"` | `"amadeus-rules"` |
| `authoredExempt` | `RegExp[]`(**必須** — 型に `?` なし、`package.ts:668` が optional chaining なしで `.some()` を呼ぶため未設定は TypeError で即クラッシュ) | `[/^hooks\/amadeus-opencode-[^/]+\.ts$/]`(アダプタを持たない場合は空配列 `[]` を明示) | `[/^hooks\/amadeus-cursor-[^/]+\.ts$/]`(codex manifest.ts:60-63 と同型 — core 投影 hooks/ 配下に置く authored アダプタを orphan スキャンから除外) |
| `skipRunnerGen` | boolean | `true`(skills は emit が `.opencode/skills/` へ合成 — codex の `.agents/skills/` 前例と同判断) | `true`(Cursor に skills ディレクトリはなく、runner 相当は commands で表現) |
| `emit` | `(ctx: EmitContext) => EmitResult` | 実装する | 実装する |

## AC-1b 意味論適合照合(引用元エラー方針 vs 本要件)— 明文照合の記録

- **引用元の実測**: `emit` 契約は同期関数 `(ctx) => EmitResult` で、呼び出し側 `scripts/package.ts:459-461` は **try/catch なしで直接呼ぶ** — emit 内の throw はビルド全体を loud に失敗させる(fail-fast)。codex emit.ts(368行)も throw を握りつぶす分岐を持たない
- **本要件との照合結果**: **一致(意図的相違なし)**。FR-4(無回帰)と検証劇場 Forbidden の下では「emit の部分失敗を黙って続行」は偽 green を作るため、fail-fast は本 intent の要件とそのまま適合する。新設 emit も同方針: 合成入力の不在・書き込み失敗は throw し、フォールバック分岐を作らない(要求されない互換・フォールバック禁止のノルムとも整合)

## emit の write⇔check 対称設計(C1/C2 共通 — dist:check の実装可能性担保)

`EmitContext.check: boolean`(`manifest-types.ts:44-48`)と `EmitResult.problems: string[]` の対称ペアを codex emit.ts:350-367 の既習様式で実装する:

1. 各 emit 関数は「合成内容の文字列」を返す純関数とし、**書き込みも検証も共通の emission table**(`{dst, content}` の配列)から駆動する
2. `ctx.check === false`(build): table を書き込み、`EmitResult.written` に dst を登録
3. `ctx.check === true`(dist:check): 書き込み禁止 — dst の実在と byte 一致を照合し、不在は `problems.push("MISSING emission: <dst>")`、差分は `problems.push("DIFFERS emission: <dst>")`
4. これにより AC-1a/AC-3a/AC-4a(dist:check exit 0)と FR-5 AC-5a(--check 自動編入)の保証が emit 面まで貫通する(symmetric-pair-review の write⇔check 対を設計段で閉じる)

## C1: opencode emit の関数構成(設計)

| 関数 | シグネチャ | 契約 |
| --- | --- | --- |
| `emit` (default) | `(ctx: EmitContext) => EmitResult` | 下記合成の一括実行。失敗は throw(fail-fast、照合済み) |
| `emitAgentsMd` | `(ctx) => string` | AGENTS.md 本文(セッション再開・/amadeus 導線・AMADEUS_RULES_DIR 相当の指針)。`.md` トークン置換は package.ts 側の既存機構に従う |
| `emitOpencodeJsonExample` | `() => string` | `opencode.json.example` — permission 絞り込み例(既定全許可の差分対策)+ `$schema` 付与。**コメント不可(JSON)のため説明は AGENTS.md/README 側**(E-CS1 Q2 と同判断の再適用) |
| `emitCommand` | `(ctx) => string` | `.opencode/commands/amadeus.md` — orchestrator forwarding loop の起動導線 |
| skills 合成 | codex emit の skill 合成関数群を**様式として**参照(コピーでなく同型実装) | 配置先 `.opencode/skills/`。**session skills 4本(session-cost/replay/outcomes-pack/grilling)のみ**を合成し、orchestrator は Bolt 1 出荷済みの `.opencode/commands/amadeus.md` に据置(E-OC16 裁定 C — 旧記述「orchestrator skill を core 原本から合成」は実在しない機構の引用で上流訂正、E-CS8 書誌クラス)。runner 群は初期スコープ外 |

## C2: cursor emit の関数構成(設計)

| 関数 | シグネチャ | 契約 |
| --- | --- | --- |
| `emit` (default) | `(ctx: EmitContext) => EmitResult` | 同上(fail-fast) |
| `emitEntryRule` | `() => string` | `.cursor/rules/amadeus.mdc` — frontmatter `alwaysApply: true` の1枚エントリ。本文は `amadeus-rules/` チェーンへの参照(方式は ADR-2) |
| `emitHooksJsonExample` | `() => string` | `hooks.json.example` — 写像表: `sessionStart`→amadeus-session-start 系 / `beforeSubmitPrompt`→user-prompt-submit 系 / `postToolUse`→post-tool-use(センサー発火)/ `stop`→stop / `sessionEnd`→session-end。各エントリは既存 core hooks/ の該当スクリプトを `bun` で起動する command 型。**stdin スキーマ差(Cursor は hook_event_name/workspace_roots 形)を吸収する薄いアダプタ** `hooks/amadeus-cursor-adapter.ts` を harnessFiles で追加(codex の stdin shim `amadeus-codex-adapter.ts` の既習様式 — エラー方針の意図(advisory 側=fail-open に倒す)は同一だが exit 値は異なる: codex は exit 0(amadeus-codex-adapter.ts:83-87)、Cursor は契約上 exit 2 のみが deny のため「2 以外の非ゼロ」を使う。**意図的相違の明文化**: Cursor の hook 契約は「その他 exit = fail-open」であり、ゲート強制を hook に依存しない設計(監査はツール所有)のため fail-open が安全側)。**実装前提(未実測)**: Cursor の `postToolUse`/`preToolUse` が渡す `tool_name` の値集合が Claude 語彙(`Bash`/`Write`/`Edit` 等)と一致するかは AC-3d の実測範囲(seam の存在確認)を超えており未検証 — codex アダプタは「Codex already names the shell tool "Bash"」を明示前提として検証している(amadeus-codex-adapter.ts:41-43)。よって (a) アダプタは envelope 変換に加えて **tool_name の正規化写像表**を持つ設計とし (b) code-generation 前の Bolt 内検証項目として「Cursor 実機 or 公式 docs で tool_name 語彙を実測し写像表を確定する」を必須とし (c) 実測で写像不能なイベントが出た場合はその hooks.json エントリを出荷せず機能表の該当行を「未対応」へ降格する(無音の matcher 不一致 = 偽グリーンを構造的に排除) |
| `emitAgentsMd` / `emitCommand` | 同型 | AGENTS.md / `.cursor/commands/amadeus.md` |

## C4: smoke test の契約

- `tests/smoke/t<NNN>-opencode-cursor-dist-structure.test.ts`(1本): dist/opencode/・dist/cursor/ の主要ファイル実在(manifest 経由生成物の存在表)+ harness.json の rulesSubdir 値 + package.ts --check の対象編入を検証
- in-process seam: 生成物の存在検査は fs 直読(spawn 不要)。package.ts の buildTree 系を import しない(ビルドは事前実行前提)— spawn-blindspot 回避のため検査対象は「生成結果」に限定

## 検証コマンド(全コンポーネント共通、FR-4 AC-4a)

`bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` すべて exit 0。
