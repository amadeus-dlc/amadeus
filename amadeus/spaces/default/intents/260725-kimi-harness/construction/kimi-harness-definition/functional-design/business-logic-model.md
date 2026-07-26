上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Business Logic Model — kimi-harness-definition

unit-of-work.md の U1(完了定義: `package.ts kimi` 生成 + `--check` + smoke + スキル6本)と unit-of-work-story-map.md の FR-1/FR-7b/FR-10 を、components.md C1 の構成に沿って手続き化する(C1 は宣言的でメソッドを持たない設計 — component-methods.md も C1 のインターフェース節を持たない)。services.md の判定どおり本 Unit はプロセス起動型で常駐状態を持たない。

## 生成フロー(packager との接続)

1. `packages/framework/harness/kimi/manifest.ts` を作成すると、packager の自動検出(`scripts/package.ts:86-88`)が `kimi` を認識する
2. `bun scripts/package.ts kimi` の実行で、manifest の宣言どおりに処理が進む:
   - coreDirs 投影(tools・amadeus-common・knowledge・rules→rules・sensors・scopes・agents・hooks) — `.md` は `{{HARNESS_DIR}}` → `.kimi-code` 置換、`.ts` はバイトコピー
   - session skills 6本は **coreDirs 投影**で `.kimi-code/skills/` に入る(claude と同じ機構。`packages/framework/core/skills/` の6ディレクトリを `skills/<name>` へコピー)
   - runner-gen は orchestrator + stage/scope runners を `.kimi-code/skills/` に**生成**する(役割分担: session skills = coreDirs コピー、orchestrator/runners = runner-gen 生成)
   - harnessFiles 投影(orchestrator SKILL.md・question-rendering.md・dot-gitignore・amadeus-hooks.snippet.toml)
   - onboarding レンダリング(skeleton + fills、projectRoot の AGENTS.md)
   - workspace shell(memory seed・active-space)
   - graph compile + 上記 runner-gen
3. `bun scripts/package.ts kimi --check` が temp 再生成との byte-diff で exit 0(t145 が全 harness で自動カバー)

## 検証シーケンス

1. dist 構造 smoke(FR-7b): module-scope リテラル表で必須ファイルの実在を検査(manifest 非導出 — 共変を防ぐ t149 様式)
2. promote 後の drift guard: `dist:check`・`promote:self:check` が green

## 決定木(エラー経路)

- manifest の宣言ミス(coreDirs の src 不在等) → packager が loud fail(既存挙動)。設計上の分岐は持たない
- Kimi がスキル frontmatter を不寛容に扱う場合(未発生の予防経路) → ADR-2 の fallback(emit 追加)を後続 Bolt で検討。本 Bolt では実測済みの寛容性を前提

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T11:15:18Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の blocker+4件は全て解消。manifest 型契約は検証済み行引用で成果物内にインライン化されスコープ内で検証可能。session skills 機構・上流参照・引用修正・7イベント/9target 突合も整合。残存 minor 1件(dist ツリー節の runner-gen 帰属残滓)は conductor が修正済み。

### Findings

- (minor / domain-entities.md §dist/kimi ツリー) session skills の runner-gen 帰属残滓 → 修正済み(coreDirs 投影との役割分離を明記)
