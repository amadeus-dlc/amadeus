# Code Generation Plan — fix-2297-wiring

上流入力(consumes 全数): requirements（`inception/requirements-analysis/requirements.md` FR-A/AC-A 系が本 unit の正本。unit-of-work.md 不在は scope 設計どおり consumes_absent expected:true）

- Unit: fix-2297-wiring（#2297 — live PreToolUse 配線）
- トレーサビリティ: 全ステップは #2297 と requirements FR-A1〜A4 / AC-A1〜A4 へ遡る（user stories SKIP のため intent 直結 — code-summary へ引き継ぐ）

## 実装ステップ（TDD 順序）

- [x] Step 1: 新規 drift ガードテストを作成し **Red を実測** — `tests/integration/t483-claude-live-settings-inclusion.integration.test.ts`（採番は作成時 tests/ 実測で確認。**t481/t482 使用禁止**）。内容:
  - 正本 `packages/framework/harness/claude/settings.json.example`（ground truth・tracked）と live `.claude/settings.json` を JSON parse し、正規化キー `(event, matcher, hook script 名)` の3つ組で「example 集合 ⊆ live 集合」の包含を検査（dispatcher 形は slug → amadeus-dispatch.ts の HOOK_PATHS 解決 basename、直接形は command 中の `amadeus-*.ts` 抽出）
  - 既知欠落 allowlist: `plugin-compose`（SessionStart）1件のみ。**Issue 参照 + 理由の2フィールド必須・空文字拒否**（AC-A4 の負ケーステスト同梱）。Issue 番号は conductor が起票後に確定値へ差し替えるまで `TBD-plugin-compose-issue` プレースホルダ（テストは値の非空検査 — プレースホルダで通る形にせず、conductor 差し替えを待って最終 green とする… ただし CI を塞がないため、暫定は「非空文字列 + `#` 形式または TBD- 接頭辞可」とし、code-summary に差し替え義務を明記）
  - **実装前の Red**: 現行 live には PreToolUse が無い → 包含検査が log-subagent-start の欠落を検出して FAIL（これが TDD Red — AC-A1 の逆面）
- [x] Step 2: Red 実測記録（assertion 実文・exit code）
- [x] Step 3: `packages/framework/harness/claude/hooks/amadeus-dispatch.ts` の HOOK_PATHS へ `"log-subagent-start": ".claude/hooks/amadeus-log-subagent-start.ts"` を追加（FR-A1）
- [x] Step 4: live `.claude/settings.json` へ PreToolUse エントリ（matcher `^Task$`、dispatcher 形 `bun "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/amadeus-dispatch.ts" log-subagent-start`）を追加（FR-A2）
- [x] Step 5: `bun run build`（self-install 面へ dispatcher 変更を反映）→ Step 1 テスト **Green 実測**（AC-A1）
- [x] Step 6: AC-A3 落ちる実証 — live から PreToolUse エントリを一時除去 → ガード赤実測 → 復元 → 残渣ゼロ確認（1セット不可分・falling-proof-injection-one-set。コミット前なので作業ツリー注入で可 — ガードはファイル現物を読む）
- [x] Step 7: AC-A2 — 既存 dispatcher 挙動の不変確認: `bun test tests/integration/t131-hooks-settings-fire.test.ts tests/smoke/t03-settings-json.test.ts tests/integration/t40-settings-hook-config.test.ts tests/unit/t132-hooks-doc-count-sync.test.ts tests/integration/t327-hook-wiring-xor-closure.integration.test.ts` green（example 対象群 — dispatcher スロット追加の波及なし）
- [x] Step 8: `bun run typecheck` / `bun run lint` / build 後 `git status`（tracked 差分 = 意図した編集のみ）
- [x] Step 9: テスト設定 — 既存ランナー乗り（integration 層自動発見）。実 FS 読みのため integration 配置・`// size:` 注釈適切に

## 逸脱裁定 E-SSP-CGDEV（2-0 採用 choice 1）

実装前停止 → 裁定 → 再開。FR-A1/FR-A2 は `tests/integration/hook-dispatcher.integration.test.ts` の
ピン留め（KNOWN_SLUGS 10 要素のハードコード・`toHaveLength(11)`・`writeCompleteHookTree` が自前の
10 slug しか書かない）と構造的に両立せず、注入実測で 9 pass → 3 pass / 6 fail を確認した。
裁定により同ファイルを許可集合へ追加し、以下の導出形へ改訂した。

- `KNOWN_SLUGS` = `Object.keys(HOOK_PATHS)`（dispatcher 側 `HOOK_PATHS` を export 化。export は
  `HOOK_PATHS` のみで、`parseHookSlug` / `resolveHookPath` 等の内部ヘルパーは非 export のまま）
- `writeCompleteHookTree` は `Object.values(HOOK_PATHS)` の実パスを全数生成（スロット追加に自動追随）
- 件数 assert は `EXPECTED_HOOK_REFERENCES = KNOWN_SLUGS.length + DUPLICATE_SLUG_REFERENCES`

**要手動更新（全自動追随ではない）**: `DUPLICATE_SLUG_REFERENCES = 1` は「mint-presence が
UserPromptSubmit と PostToolUse{AskUserQuestion} の2箇所へ配線されている」という settings 側の
性質であり、`HOOK_PATHS` からは一意導出できない。**2つ目の重複 slug が現れた場合は手動で引き上げる**
必要がある。重複の所在は既存の mint-presence 2件 assert を `1 + DUPLICATE_SLUG_REFERENCES` へ
書き換えて pin し、件数とその原因が無言で乖離しないようにした。テスト名 `:107` の件数語
（"exactly 11 … fixed 10-slug table"）も同一変更で count-free 化した。

## 制約・逸脱規律

- 触ってよいファイル: `packages/framework/harness/claude/hooks/amadeus-dispatch.ts` / `.claude/settings.json` / 新規テスト1本のみ（Unit B の患部 amadeus-lib.ts・doc 群・既存 subagent テストは**禁止** — 並行 builder が作業中）
- 逸脱（既存様式準拠と判断する場合含む）は実装前停止・最終メッセージで報告
- 検証は同期完遂。git commit・state 変更コマンド禁止

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T15:25:07Z
- **Iteration:** 1
- **Scope decision:** none

FR-A1〜A4 / AC-A1〜A4 の全項目を file:line 実測確認。E-SSP-CGDEV の全留保遵守（導出式 :51-52 + count-free テスト名 :120 + export は HOOK_PATHS と main のみ）。fail-closed 保存・waiver 設計（#2426 anchoring 含む）・Unit B 患部非接触・変更5ファイル限定を確認。無申告逸脱・互換レイヤー混入なし。

### Findings

- None
