# Components — opencode / Cursor harness 対応

intent: `260715-opencode-cursor-harness`(Issue #626)
上流入力: `../requirements-analysis/requirements.md`(FR-1〜FR-7)、codekb の architecture.md / component-inventory.md(3層構造・manifest 駆動 packaging)、`../practices-discovery/team-practices.md`(5領域変更なし)。

## AC-3d 前提記録: Cursor hook seam の外部実測(2026-07-16 照会)

**R-1(feasibility)の前提は反証された — Cursor には hook seam が実在する**([Cursor Hooks docs](https://cursor.com/docs/hooks)、v1.7〜):

- 設定: `.cursor/hooks.json`(project)/ `~/.cursor/hooks.json`(global)。schema `{version:1, hooks:{<event>:[{command,timeout,failClosed,matcher,...}]}}`
- イベント(IDE Agent): `sessionStart`/`sessionEnd`/`preToolUse`/`postToolUse`/`beforeShellExecution`/`beforeSubmitPrompt`/`preCompact`/`stop` ほか — **Amadeus の Claude hook 集合(SessionStart/SessionEnd/UserPromptSubmit/PostToolUse/Stop)とほぼ1:1 で写像可能**
- 契約: stdin JSON(hook_event_name/workspace_roots 等)、exit 0=JSON stdout 採用 / exit 2=deny / その他=fail-open
- **既知の機能差(cloud agents / cursor-agent CLI)**: command-based hooks のみ、`sessionStart`/`sessionEnd`/`beforeMCPExecution` 等は非対応 — この差分が AC-3c の「機能単位の表」の記載対象(FR-7)

## コンポーネント一覧(規模正当化・reuse inventory 付き)

| ID | コンポーネント | 新規/再利用 | 推定規模 | 正当化 |
| --- | --- | --- | --- | --- |
| C1 | `packages/framework/harness/opencode/manifest.ts` + `emit.ts` | 新規(codex manifest 66行+emit 368行を既習様式として参照) | manifest ~70行 / emit ~250行 | open-set seam(package.ts:68-73)に載る唯一の追加単位。emit は AGENTS.md・opencode.json.example・commands・skills 合成を担う |
| C2 | `packages/framework/harness/cursor/manifest.ts` + `emit.ts` | 新規(同上) | manifest ~70行 / emit ~300行 | rules エントリ(.mdc)・hooks.json.example・AGENTS.md・commands 合成。hooks 写像表を含む |
| C3 | per-tree `tools/data/harness.json` | 再利用(既存機構 amadeus-lib.ts:143/:191 の open-set 解決) | 各1行 JSON | 新機構ゼロ — 既存4 harness と同じく manifest/emit 経由で同梱 |
| C4 | smoke test(`tests/smoke/` に新設1本、既存 dist:check は自動編入) | 既存ガード再利用+新規1テスト | ~120行 | FR-5。dist:check / promote:self:check / 4層ランナーは無変更で再利用(reuse inventory: 新規 CI ジョブ・新規ランナー・新規ツールは導入しない) |
| C5 | docs 更新(README ハーネス表+`docs/harness-engineering/` の対応ページ) | 既存文書の増分 | 差分のみ | FR-7。機能単位の表(Cursor cloud/CLI の hook 差分)を含む |

**導入しない機構(根拠)**: 新規ビルドスクリプト(package.ts が open-set で不要)、installer 変更(E-OC7 Q1=B で別 Issue)、promote:self 変更(Q2=A)、hook 代替 wrapper(Q3=A + hook seam 実在の実測により不要)。

## opencode 写像(C1 の設計)

| core 資産 | opencode 側の受け皿 | 経路 |
| --- | --- | --- |
| tools/ amadeus-common/ knowledge/ sensors/ scopes/ agents/ hooks/ | `.opencode/` 直下へ同名コピー | coreDirs(codex 様式) |
| rules/ | `.opencode/amadeus-rules/` | coreDirs + rulesRename(opencode に native な markdown rules ディレクトリはなく、AGENTS.md が指針の正 — codex の D-10 と同判断) |
| orchestrator skill + session/stage skills | `.opencode/skills/`(opencode native の skills ディレクトリ) | emit(codex の `.agents/skills/` 合成と同構造、配置先のみ相違) |
| 起動導線 `$amadeus` | `.opencode/commands/amadeus.md`(opencode native commands) | emit |
| instructions | AGENTS.md(projectRoot) | emit |
| 設定例 | `opencode.json.example`(permission 絞り込み例を含む — 既定全許可の差分対策、raid-log R-4) | emit |
| 監査/ライフサイクル | `.opencode/plugins/` は**本 intent では使わない**(ADR-3 参照 — 初期到達ラインに不要、hooks 統合は将来 Issue) | — |

## Cursor 写像(C2 の設計)

| core 資産 | Cursor 側の受け皿 | 経路 |
| --- | --- | --- |
| tools/ amadeus-common/ knowledge/ sensors/ scopes/ agents/ hooks/ | `.cursor/` 直下へ同名コピー | coreDirs |
| rules/ | `.cursor/amadeus-rules/` + エントリ1枚 `.cursor/rules/amadeus.mdc`(alwaysApply、amadeus-rules への参照) | coreDirs + emit(ADR-2) |
| 起動導線 | `.cursor/commands/amadeus.md` | emit |
| instructions | AGENTS.md(projectRoot、ネスト合成仕様と整合) | emit |
| hooks | `hooks.json.example`(sessionStart/beforeSubmitPrompt/postToolUse/stop/sessionEnd → 既存 Claude 用 hook スクリプトへの写像表。cloud/CLI の非対応イベントは表で明示) | emit(ADR-3) |
| MCP | 対象外(Amadeus は MCP 必須機能を持たない — 既存 harness と同じ) | — |

## AC-5c 影響ファイル目録(閉じ列挙台帳の verbatim 添付 — 正本: codekb code-structure.md)

**破壊的(必須編集)— 本 intent では触らない(E-OC7 Q1=B/Q2=A で全て対象外、参照のみ)**:
1. `packages/setup/src/domain/harness.ts:9`(HarnessName union)/ `:19-24`(.all frozen array)— installer、別 Issue
2. `packages/setup/src/domain/engine-layout.ts:8-12`(ENGINE_DIR_BY_HARNESS)— installer、別 Issue
3. `packages/setup/src/modules/reporter.ts:24-25,137`(usage/エラー文言)— installer、別 Issue
4. `tests/unit/setup-harness.test.ts:13`(契約テスト)— installer、別 Issue
5. `tests/unit/setup-harness-parse.test.ts:17`(parse 受理集合の契約テスト)— installer、別 Issue
6. `packages/framework/core/tools/amadeus-lib.ts:114,:170-172`(KNOWN_HARNESS_DIRS 等 — test-seam/fallback 専用、実解決は harness.json)— 本 intent では**編集不要**(open-set 側で解決)だが実装時に再列挙で確認
7. `packages/framework/core/tools/amadeus-utility.ts:857`(doctor otherTrees の advisory 列挙)— 編集は任意(advisory 劣化を許容、FR-2 AC-2c)
8. `packages/framework/core/tools/amadeus-migrate.ts:383,:1459`(移行 union/includes)— 本 intent スコープ外(移行対象にしない)
9. `scripts/promote-self.ts:37-41,:313-319`(managedDirs)— E-OC7 Q2=A で対象外

**非破壊(新ハーネスを検査しないだけで壊れない — 検査対象化は任意)**: `tests/unit/t156-memory-relocation.test.ts:149`、`tests/unit/t199-grilling-distribution.test.ts:33-40`

実装時(code-generation)には enumeration-reverify-at-implementation に従い第3の独立再列挙を行い、本目録との差分を builder が報告する。

## 変更の制御(パッケージ設計原則)

両 C1/C2 は `packages/framework/harness/<name>/` に完全に閉じ、依存方向は harness → core の一方向のみ(既存境界の維持)。core・scripts・installer への変更ゼロ(AC-4d の grep 検証で担保)。循環依存なし。

## Review

**Verdict:** READY
**Reviewer:** amadeus-architect-agent
**Date:** 2026-07-15T17:47:11Z
**Iteration:** 2

### iteration 1 指摘の閉包確認(verbatim 再現)

| # | iteration 1 指摘 | 是正申告 | 再現結果 |
| --- | --- | --- | --- |
| C-1 | authoredExempt 欠落 → package.ts:668 で即クラッシュ | component-methods.md に型契約表を追加 | 解消。`grep -n authoredExempt component-methods.md` → 1件、`package.ts:668` を実読すると `if (m.authoredExempt.some((re) => re.test(rel))) continue;` — 引用行番号・関数呼び出し形が完全一致。`scripts/manifest-types.ts:110` の型定義 `authoredExempt: RegExp[];` も `?` なしを確認、クラッシュ根拠は正確。opencode 側「空配列を明示」/cursor 側「codex manifest.ts:60-63 と同型」も実読で一致(`authoredExempt: [/^hooks\/amadeus-codex-[^/]+\.ts$/],` が該当行に実在) |
| C-2 | emit の write⇔check 対称欠落 | component-methods.md に「write⇔check 対称設計」節を新設 | 解消。`grep -n "problems\|ctx.check\|DIFFERS" component-methods.md` → 3件。codex emit.ts:348-367 を実読すると `ctx.check` 分岐・`problems.push("MISSING emission: …")` / `problems.push("DIFFERS emission: …")` の文言・構造が申告どおり再現されている。`EmitContext.check: boolean` は `manifest-types.ts:49`(申告の `:44-48` はコメント込みの近傍行 — 実体の型は同一ファイル内で誤りなし、軽微な行番号のズレのみで実質的な誤誘導なし) |
| M-1 | Cursor tool_name 未実測での ✅ 確約 | 「実装前提(未実測)」を明文化+services.md 該当行を ⚠ へ降格 | 解消。component-methods.md:48 に tool_name 正規化写像表・Bolt 内実測必須・写像不能時の降格ルールが明記され、根拠として `amadeus-codex-adapter.ts:41-43` の "Codex already names the shell tool \"Bash\"" 前提を実読で確認(該当コメントが実在)。services.md:28-29 で `session lifecycle hooks` と `prompt-submit / post-tool / stop hooks` の cursor(IDE) 列が ✅ から ⚠ に降格され、「実装時実測が確定条件」の注記と component-methods.md への参照が付いている |
| M-2 | AC-5c 目録の design 未添付 | components.md に「AC-5c 影響ファイル目録」節を verbatim 添付 | 解消。破壊的9件の file:line(harness.ts:9,:19-24 / engine-layout.ts:8-12 / reporter.ts:24-25,137 / setup-harness.test.ts:13 / setup-harness-parse.test.ts:17 / amadeus-lib.ts:114,:170-172 / amadeus-utility.ts:857 / amadeus-migrate.ts:383,:1459 / promote-self.ts:37-41,:313-319)を実ファイルで1件ずつ突き合わせ、すべて指示どおりの内容が該当行に実在(逐次 grep/sed で確認)。非破壊2件(t156-memory-relocation.test.ts:149 / t199-grilling-distribution.test.ts:33-40)もハードコードされた4ハーネス列挙で新ハーネスを検査しないだけ(壊れない)ことを実読で確認 |
| m-1 | Reversibility 欄なし | decisions.md の全5 ADR に Reversibility 行を追加 | 解消。`grep -c Reversibility decisions.md` → 5(ADR-1〜5 全件) |
| m-2 | Cursor skills 喪失の粒度不足 | services.md に「per-stage runner skills」「orchestrator/session skills 一式」の2行を追加 | 解消。services.md:30-31 に該当2行が存在し、opencode(✅ .opencode/skills/ で両方対応)と cursor(❌ 受け皿なし、両方)の差が明示されている |

### 新規矛盾チェック(手順6)

components.md / component-methods.md / services.md / decisions.md 間で hooks の扱いを突き合わせ: R-1 反証(components.md 冒頭)→ ADR-3 で Cursor のみ初期対応・fail-open 方針(decisions.md)→ tool_name 未実測ゲート(component-methods.md C2)→ services.md の ⚠ 降格2行、の4点が同一の物語で一貫しており、矛盾なし。ADR-4(fail-fast)と component-methods.md AC-1b 照合節の記述も同一根拠(`package.ts:459-461`、`if (m.emit) {` が実際の459行目)で一致。

### Validation Tool Results

本ステージにツール実行の指定なし(stage 定義に validation tools の明記なし)。上記はすべて file:line の直接実読による手動検証。

### Summary

iteration 1 の Critical 2 件・Major 2 件・Minor 2 件、計6件すべてが file:line レベルで verbatim 再現・閉包を確認できた。是正で新たに導入された記述(authoredExempt 型契約、write⇔check 対称、tool_name 正規化ゲート、AC-5c 目録、Reversibility、skills 粒度)はいずれも実装コードとの引用が正確で、5成果物間の相互矛盾もない。実装に進める状態。

**GoA:** 1(全面的支持)
