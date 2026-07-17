# Business Logic Model — U1 opencode-skeleton

intent: `260715-opencode-cursor-harness` / Unit: U1(walking skeleton)
上流入力: unit-of-work.md(U1 完了条件)、unit-of-work-story-map.md(視点1/3)、requirements.md(FR-1 / FR-2 / AC-6b)、application-design の components.md(C1)/ component-methods.md(型契約・write⇔check)/ services.md(到達ライン)。

## 処理フロー(ビルド時)

1. `bun scripts/package.ts` → `discoverHarnessNames()` が `packages/framework/harness/opencode/manifest.ts` を自動発見(core 編集ゼロ — AC-1a)
2. `buildTree` が manifest の coreDirs を `dist/opencode/.opencode/` へ写像(rules → amadeus-rules rename 込み)
3. manifest の `emit(ctx)` が emission table(`{dst, content}[]`)を構築:
   - `ctx.check === false`: 各エントリを書き込み、`EmitResult.written` へ登録
   - `ctx.check === true`: 書き込まず実在+byte 一致を照合、不一致は `problems` へ(`MISSING emission:` / `DIFFERS emission:` — codex :350-367 様式)
4. U1 の emission table は**1エントリ**: `commands/amadeus.md`(起動導線)のみ(E-OC15 裁定 A)。`tools/data/harness.json` は emit で書かず、buildTree の `writeHarnessData`(scripts/package.ts:219-224)が manifest の rulesRename から自動生成する既存機構に委ねる(canonical 1定義 — 上流 C3 準拠、AC-1d はこの経路で充足)。AGENTS.md / opencode.json.example / skills 合成は U2 で追加

## 処理フロー(利用時 — 到達ライン)

1. 利用者が `dist/opencode/` を検証用プロジェクトへ手動配置(installer 非経由 — AC-6b)
2. `bun .opencode/tools/amadeus-utility.ts version` → VERSION 出力(harness 非依存、AC-2a)
3. `bun .opencode/tools/amadeus-utility.ts doctor <projectDir>` → exit `failed > 0 ? 1 : 0`(`.claude` 専用ブロックは advisory 劣化 — AC-2c)
4. opencode の `.opencode/commands/amadeus.md` から `bun .opencode/tools/amadeus-orchestrate.ts next` を1回起動し、directive(JSON)受領を実測(AC-2b 最小疎通 — U1 ゲート完了条件)

## エラーモデル

- emit 内失敗(合成入力不在・書き込み失敗)= throw → package.ts が loud 失敗(fail-fast、ADR-4 照合済み)
- dist:check 差分 = problems 経由で exit 非0(偽 green なし)
- doctor advisory 劣化 = fail しない(意図された劣化 — docs 記載は U4)
