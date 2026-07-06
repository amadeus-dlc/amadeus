# Domain Entities — engine-namespace 改名対応表

上流要求は `../../../inception/requirements-analysis/requirements.md`（R001〜R008、N001〜N005）である。
本書は改名を駆動するエンティティと、正準の改名対応表を定義する。

## エンティティ

| エンティティ | 属性 | 役割 |
|---|---|---|
| NameMapping | `prefix`（旧トークン）、`replacement`（新トークン）、`kind`（skill / sub-agent / engine-dir / tool / hook / common-dir / shared-dir / rules-file） | parity の path 解決と内容正規化を駆動する 1 行。`parity-map.json` の `nameMappings` 配列に置く（R007） |
| RenameSet | 対象ファイル・ディレクトリの集合 | `git mv` の実行単位（R001〜R005） |
| AllowedException | 除外 path パターン | N005 の旧名残存検査で許容する 3 箇所（`aidlc/spaces/**`、`dev-scripts/data/parity-baseline.json`、`dev-scripts/evals/parity/**`） |

## 改名対応表（正準）

### ディレクトリ（4 件 + symlink 名）

| 旧 | 新 |
|---|---|
| `.agents/aidlc/` | `.agents/amadeus/` |
| `.agents/aidlc/aidlc-common/` | `.agents/amadeus/amadeus-common/` |
| `.agents/aidlc/knowledge/aidlc-shared/` | `.agents/amadeus/knowledge/amadeus-shared/` |
| `.claude/aidlc-common`（symlink 名） | `.claude/amadeus-common`（グリリング Q1 回答: symlink 名も改名する） |

`.claude/` の他の symlink（agents、knowledge、scopes、sensors、tools、hooks）は名前を維持し、リンク先だけ `.agents/amadeus/` へ張り替える。

### rules（1 件）

| 旧 | 新 |
|---|---|
| `.agents/rules/aidlc.md` | `.agents/rules/amadeus.md` |

### tools（26 件、単純置換: `aidlc-X.ts` → `amadeus-X.ts`）

aidlc-audit.ts、aidlc-bolt.ts、aidlc-directive.ts、aidlc-graph.ts、aidlc-includes.ts、aidlc-jump.ts、aidlc-learnings.ts、aidlc-lib.ts、aidlc-log.ts、aidlc-orchestrate.ts、aidlc-rule-schema.ts、aidlc-runner-gen.ts、aidlc-runtime.ts、aidlc-sensor-linter.ts、aidlc-sensor-required-sections.ts、aidlc-sensor-schema.ts、aidlc-sensor-type-check.ts、aidlc-sensor-upstream-coverage.ts、aidlc-sensor.ts、aidlc-stage-schema.ts、aidlc-state.ts、aidlc-swarm.ts、aidlc-utility.ts、aidlc-validate.ts、aidlc-version.ts、aidlc-worktree.ts
→ それぞれ `amadeus-` 接頭辞へ。

### scopes（9 件、単純置換: `aidlc-X.md` → `amadeus-X.md`。code-generation の reviewer 指摘で追加、decision 記録あり）

aidlc-bugfix.md、aidlc-enterprise.md、aidlc-feature.md、aidlc-infra.md、aidlc-mvp.md、aidlc-poc.md、aidlc-refactor.md、aidlc-security-patch.md、aidlc-workshop.md
→ それぞれ `amadeus-` 接頭辞へ。照合は拡張子 `.md` 込みの完全一致に限る（tool/hook の `.ts` 規則と同型）。scope 名そのもの（`bugfix` など）は変更しない。

### sensors（4 件、同規則。同上）

aidlc-linter.md、aidlc-required-sections.md、aidlc-type-check.md、aidlc-upstream-coverage.md
→ それぞれ `amadeus-` 接頭辞へ。sensor id（`linter` など）は変更しない。

### hooks（11 件、同規則）

aidlc-audit-logger.ts、aidlc-log-subagent.ts、aidlc-mint-presence.ts、aidlc-runtime-compile.ts、aidlc-sensor-fire.ts、aidlc-session-end.ts、aidlc-session-start.ts、aidlc-statusline.ts、aidlc-stop.ts、aidlc-sync-statusline.ts、aidlc-validate-state.ts
→ それぞれ `amadeus-` 接頭辞へ。`.claude/settings.json` の hook コマンド参照も更新する。

### 対象外（改名しない）

- workspace ディレクトリ `aidlc/`（`aidlc/spaces/**`）
- v2 機械可読成果物: `aidlc-state.md`、`intents.json`、audit イベント語彙
- 既存 Intent record の内容
- `dev-scripts/` の既存ファイル名（`parity-check.ts` など。エンジンではなく repo 開発スクリプト）

## ライフサイクル

NameMapping は `parity-map.json` に恒久保存され、上流追従（baseline 再生成）のたびに path 解決と内容正規化に使われる。
RenameSet は本 Intent の code-generation で一度だけ実行される。
AllowedException は N005 の検査と将来の残存検査で恒久的に参照される。
