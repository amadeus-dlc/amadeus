上流入力(consumes 全数): unit-of-work, requirements

# Code Summary — kimi-harness-definition

unit-of-work.md の U1 と requirements.md の FR-1/FR-7b/FR-10 の実装記録(code-generation-plan.md の全7ステップ完了)。

## 作成・変更ファイル

### 新規(正本: `packages/framework/harness/kimi/`)

| ファイル | 内容 |
|---|---|
| `manifest.ts` | `name: "kimi"`・`harnessDir: ".kimi-code"`・`rulesRename: null`・`emit: null`。coreDirs 8 + session skills 6、harnessFiles 4、`authoredExempt`(B2 予約)、onboarding(AGENTS.md, projectRoot) |
| `skills/amadeus/SKILL.md` | kimi 版オーケストレータ(`/skill:amadeus`・AskUserQuestion ゲート・両経路 mint・swarm `--harness kimi`・SessionEnd ネイティブ) |
| `skills/amadeus/question-rendering.md` | claude 型 annex + 番号プローズ fallback |
| `onboarding.fills.ts` | invoke=`/skill:amadeus`、前提(kimi ≥0.28.1・bun・managed block 配線) |
| `dot-gitignore` | 同型ベース + `.kimi-code/local.toml` 1ブロック |
| `hooks/amadeus-hooks.snippet.toml` | マーカー囲み。`[[hooks]]` ×10・`[[permission.rules]]` ×5(骨格。matcher 最終確定は B2) |

### 変更

| ファイル | 内容 |
|---|---|
| `scripts/package.ts` (+9/−1) | `runTool()` の harnessDir 解決に `.kimi-code` 分岐を追加(従来は .kiro/.codex/フォールバック .claude の閉集合。runner-gen 出力と compile 済みパスが正しく `.kimi-code` になるために必須。他6 harness は dist:check で無影響を実証) |

### 生成物・テスト

| ファイル | 内容 |
|---|---|
| `dist/kimi/` | 生成物(`package.ts kimi` で再生成可能) |
| `tests/smoke/t150-kimi-dist-structure.test.ts` | t149 様式の module-scope リテラル表 + harness.json ピン |

## 検証(conductor が再実行して裏取り)

- `bun scripts/package.ts kimi` → exit 0
- `bun scripts/package.ts kimi --check` → exit 0(conductor 再実行でも exit 0)
- `bun test tests/smoke/t150-kimi-dist-structure.test.ts` → 0 fail(conductor 再実行でも 0 fail・24 expect)
- `bun run typecheck` → exit 0 / `bun run lint` → exit 0 / `bun run dist:check`(全7 harness) → exit 0
- `bun test tests/integration/t145-packaging-parity.test.ts` 他 → exit 0(t145 が kimi を自動カバー)

## 計画からの逸脱

1. `scripts/package.ts` の runTool 分岐(計画外だが必須 — FR-1b の正しい dist のため。クローズドセットの流儀で1分岐、一般化は意図的に見送り)
2. smoke ファイル名は連番規約で `t150-kimi-dist-structure.test.ts`
3. `issue-ref-contract.md` は同梱せず(SKILL.md 内に3ルールをインライン化。ぶら下がり参照を回避)
4. dot-gitignore に `.kimi-code/local.toml` ブロックを追加(codex の hooks.json 先例に倣う)

## オープン事項

- `rules→rules` の coreDirs 行は現状 inert(`core/rules/` 不在で packager は silent skip。BR-2 の宣言どおりで問題なし)
- runner-gen 生成物のプローズはオーケストレータを `/amadeus` と呼ぶ(全 harness 共通の既存出力。ADR-2 の既定どおり受容)
- AGENTS.md から `docs/guide/harnesses/kimi-code.md` への参照は U7 で解決する意図的ポインタ
- B2 で adapter/lib を作成したら harnessFiles にも追加が必要(authoredExempt は orphan scan の免除のみ)
