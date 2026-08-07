# Code Generation Plan — U2 model-attribution(実効 model 属性と started 面)

**上流入力(consumes 全数)**: `unit-of-work`(U2 範囲・完了条件 AC-4/AC-5)/ `requirements`(FR-3・AC-4/AC-5・NFR-1〜4・CON-1〜4)/ `functional-design`(domain-entities / business-rules / business-logic-model — シグネチャと BR-U2-1〜8 の正本)/ `nfr-design`(logical-components / security-design — 障害ドメインと catch 配線点 1:1)/ `components`・`component-methods`・`services`(C-3/C-5/C-6 契約)/ `decisions`(ADR-3: harness > request > pin + source 併記、ADR-5: 欠落 = 属性不在)

**測定 ref**: 本 worktree 起点 `7667586f9`(U1 着地済み — `amadeus-subagent-observability.ts` / registry `Type Verdict` / completed 配線を再利用)

## 実装環境

- 専用 git worktree `.amadeus/worktrees/bolt-u2-model-attribution`(ブランチ `bolt-u2-model-attribution`)内で完結(cid:code-generation:solo-bolt-worktree-required)
- TDD 既定(NFR-2)— Red 実測 → 最小実装 → Green の vertical slice。テスト戦略 Comprehensive(self-feature): unit + integration

## 事前実測(BR-U2-4 の留保解消 — 済)

- `event-registry.ts` の U1 着地状態: STARTED optional = `["Agent ID","Purpose"]`、COMPLETED optional = `["Agent ID","Message","Type Verdict"]`。**U2 の差分は STARTED +3(`Type Verdict`/`Model`/`Model Source`)、COMPLETED +2(`Model`/`Model Source`)で確定**(二重登録なし)
- fixture 現物再読: `tests/fixtures/codex-hook-payloads/payloads.json` の `subagentStop` に逐語 `"model": "openai.gpt-5.5"`・`agent_type: "default"` を確認済み(BR-U2-7 の fixture 契約)
- persona frontmatter 現物: `packages/framework/core/agents/amadeus-developer-agent.md:11` に `model: opus`(無引用符 1 行形式)

## Steps

1. [x] **Red(AC-4 unit 層)**: `tests/unit/t453-subagent-model-resolve.test.ts` を新設 — `resolveEffectiveModel` の 4 ケース(harness / request / pin / unresolved)+ 優先順対照(harness と request 両在で harness 勝ち・source="harness"、request と pin 両在で request 勝ち)+ 空白のみは undefined 同義(trim 規約)。covers ヘッダ `function:resolveEffectiveModel`。t451 同様 `dist/claude/.claude/tools/` から import するため未ビルド時点で赤
2. [x] **Red(AC-4/AC-5 integration 層)**: `tests/integration/t454-subagent-model-attribution.integration.test.ts` を新設 — covers `function:resolvePersonaPin` + `hook:amadeus-log-subagent` + `hook:amadeus-log-subagent-start`:
   - `resolvePersonaPin` 実 FS 5+1 ケース(BR-U2-7): pin あり persona / **basename ≠ `name:` の対照**(basename 決め打ち実装なら赤)/ model 無し frontmatter(warnings 空)/ `name:` 一致不在(warnings 1件)/ dir 読取失敗(warnings 1件・throw しない)/ `name:` 重複(先勝ち + warnings 1件)
   - completed 面 AC-4 harness 段: Codex fixture(`subagentStop`)を hook へ注入し `Model: openai.gpt-5.5` / `Model Source: harness` を実測。fixture 断片の存在 assert を先に置く(BR-U2-8 の契約検知)
   - completed 面 pin 段: model ピン付き fixture persona を seed し `Model Source: pin`
   - completed 面 AC-5: model 無し payload + 非 persona 型(`general-purpose`)で `Model`/`Model Source` 両属性が欠落し SUBAGENT_COMPLETED が書かれる(emit 継続 — CON-3/ADR-5)
   - started 面(BR-U2-7): `tool_input.model` 明示で `Model Source: request`、persona 型 + 非明示で `Model Source: pin`、`Type Verdict` も記録、agents dir 不在でも fail-open で STARTED 行が書かれる
3. [x] **C-3 実装(FR-3a/ADR-3)**: `packages/framework/core/tools/amadeus-subagent-observability.ts` に `ModelSource` / `ModelResolution` / `ModelResolutionInput` / `resolveEffectiveModel`(純関数・harness > request > pin・空白は undefined 同義・値は逐語保持)と `PersonaPinResolution` / `resolvePersonaPin`(throw しない・`name:` 完全一致引き当て・basename 決め打ち禁止・重複は先勝ち+warnings)を追加。frontmatter 切出しは既存 `personaNameOf` と共通ヘルパへ抽出
4. [x] **FR-3c 型宣言**: `ClaudeCodeHookInput` に `model?: string` を追加(index signature 済みで非破壊)
5. [x] **C-6 registry(NFR-4)**: STARTED optional へ `"Type Verdict","Model","Model Source"`、COMPLETED optional へ `"Model","Model Source"` を追加。required・canonical count 不変
6. [x] **C-5 completed 配線(BR-U2-5)**: `amadeus-log-subagent.ts` の U1 差し込み点に `modelResolutionFor` を追加 — `harnessModel = parsed.model`(string 防御)、`requestedModel = undefined`(completed payload に tool_input 無し — コメントで契約可視化)、`personaPin` は verdict === "persona" のときのみ `resolvePersonaPin`(warnings は stderr へ)。外周 catch で null に縮退し属性スキップ・emit 継続(NFR-3)
7. [x] **C-5 started 配線(BR-U2-4)**: `subagentStartFields(payload, agentsDir?)` に U1 と同型の照合(`Type Verdict`)+ model 解決(`Model`/`Model Source`)を追加 — 既存3フィールド構成の後、try/catch で囲み失敗時は既存フィールドのまま継続。`amadeus-log-subagent-start.ts` が `join(projectDir, harnessDir(), "agents")` を渡し、fields literal へ3キーを同じ条件付き様式で追加(t385 admission guard の静的読取を維持)。CON-2 注意: Claude Code では休眠、kimi role-start 経路で発火
8. [x] **NFR-1 配布同期**: `bun run build` で dist 再生成(integration テストは dist から import —  stale 防止)
9. [x] **Green 確認**: `bun test tests/unit/t451-subagent-type-classify.test.ts tests/unit/t453-subagent-model-resolve.test.ts tests/integration/t452-subagent-observability.integration.test.ts tests/integration/t454-subagent-model-attribution.integration.test.ts` 全緑 + 既存 started 面テスト(`t-subagent-purpose` / `t-log-subagent-start`)無回帰
10. [x] **coverage registry 登録**: `bun tests/gen-coverage-registry.ts` で `.coverage-registry.json` 再生成(t451/t452 と同じ covers ヘッダ経由の機械登録)
11. [x] **静的ゲート**: `bun run lint` / `bun run typecheck` — 新規エラー 0(cognitive-complexity 警告は既存ベースライン)。`guard-announcement-callsite-count`: stderr advisory の呼出点数を grep 実測し面ごとの重複なしを確認(completed: typeVerdictFor 内 + modelResolutionFor 内、started: subagentStartFields 内 catch 含む)
12. [x] **code-summary.md / memory.md** 作成(FR-3・AC-4/AC-5 対応表、ADR-3/ADR-5・NFR-3/NFR-4 への設計判断の紐付け、逸脱申告)

## 制約(requirements より)

- CON-1: transcript / prompt 本文に触れない(model 導出は `payload.model` / `tool_input.model` / frontmatter のみ)
- CON-2: started 面は #2303/#2297 未修正の Claude Code では不発 — テストは payload 形状で駆動
- CON-3/NFR-3: 解決・pin 読取の失敗は警告付き fail-open — audit 書込を止めない(catch は started/completed 2 配線点に各1つ、1:1)
- NFR-4: registry optional 追加のみ、required 不変・既存行の遡及書換なし
- ADR-5: `Model: "unknown"` 等の捏造値禁止 — unresolved は属性不在で表現(両属性の対書き不変条件)
- 逸脱(設計と実装が合わない発見)は code-summary.md の Deviations に申告

## 実施記録(2026-08-06)

- 全 Step 完了。Red 実測(t453/t454 が export 不在で fail)→ 実装 → Green(t453: 10 / t454: 13)
- Step 9 の回帰スイープで t131 に 4 件の赤を検出 — amadeus-lib.ts の新規静的依存を選択コピー型 fixture が解決できないことが原因(ベースソース + クリーン dist で 16/16 緑を確認し特定)。fixture sibling リスト 4 件への追記で修正し、スイープ 19 ファイル 256 pass / 0 fail を実測(code-summary Deviations 1)
- 最終ゲート: `bun run lint` エラー 0 / `bun run typecheck` クリーン / `gen-coverage-registry.ts --check` OK
