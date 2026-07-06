# ドメインエンティティ — three-layer-build

対象 Intent: 260706-three-layer-build（Issue #572）

## 1. 三層の実体定義

### 1.1 Core（手編集正準層）

**定義**: Amadeus エンジンと skill の唯一の手編集場所。`core/` 配下に置かれる。

**責務**: ソース真実の保持。エンジンの振る舞い定義、skill の SKILL.md・テンプレート・アセット、harness 共通の差分ベース。

**特性**:
- 手編集が許可される（BR-1）。
- build.ts によって生成物層へコピーされる。
- git 履歴を `git log --follow` で追跡できる（BR-3）。

**含むもの**:
- エンジンディレクトリ 7 件（上流 aidlc-workflows の checkedEngineDirectories と対応）。
- skill ディレクトリ 42 件（amadeus 1 + amadeus-* 41、実測 skills/ 直下を git mv で移動）。

### 1.2 Harness（ハーネス差分層）

**定義**: ハーネス別の差分・配線規則を置く場所。`harness/<harness>/` 配下に置かれる。

**責務**: ハーネス固有の guard（openai.yaml）、配線宣言（wiring.json）、provenance 記録を保持する。

**特性**:
- 手編集が許可される（BR-1）。
- harness 種別ごとにサブディレクトリで分離する。
- Phase 2 完了時点での harness 種別: `codex`、`claude`。

**含むもの**:
- `harness/codex/`: openai.yaml 差分ソース 38 件（Phase 2 で正準化）+ README + provenance。
- `harness/claude/`: `.claude/*` symlink 配線宣言（wiring.json、新設）。

### 1.3 Generated outputs（生成物層）

**定義**: build.ts が core/ + harness/ から生成する、ランタイムが参照するファイル群。

**責務**: ランタイム実行の提供。エンジン（`.agents/amadeus/`）、skill（`.agents/skills/`）、ハーネス配線（`.claude/` symlinks）。

**特性**:
- 手編集禁止（BR-2）。
- build.ts の同一入力から同一出力（決定論的生成、BR-2）。
- ランタイムパスは restructure 後も変わらない（BR-13）。

**含むもの**:
- `.agents/amadeus/`（エンジン実行時コピー）。
- `.agents/skills/<42 dirs>`（skill 昇格コピー）。
- `.claude/{agents,amadeus-common,hooks,knowledge,scopes,sensors,tools}`（symlinks）。

---

## 2. パス写像規則（現在の path → 新 path）

### 2.1 エンジン 7 ディレクトリ（手編集場所）

| 現在の手編集正準 path | 新 手編集正準 path | 生成物 path（変更なし） |
|---|---|---|
| `.agents/amadeus/agents/` | `core/agents/` | `.agents/amadeus/agents/` |
| `.agents/amadeus/amadeus-common/` | `core/amadeus-common/` | `.agents/amadeus/amadeus-common/` |
| `.agents/amadeus/hooks/` | `core/hooks/` | `.agents/amadeus/hooks/` |
| `.agents/amadeus/knowledge/` | `core/knowledge/` | `.agents/amadeus/knowledge/` |
| `.agents/amadeus/scopes/` | `core/scopes/` | `.agents/amadeus/scopes/` |
| `.agents/amadeus/sensors/` | `core/sensors/` | `.agents/amadeus/sensors/` |
| `.agents/amadeus/tools/` | `core/tools/` | `.agents/amadeus/tools/` |

**根拠**: parity-map.json の checkedEngineDirectories（7 件、line 641-649）が上流対応を定義する。relocations は `.agents/amadeus/<dir>` を照合対象とするため、restructure 後も変更不要（relocations が指すパスは生成物パスのまま）。

### 2.2 skill ディレクトリ（42 件）

| 現在の手編集正準 path | 新 手編集正準 path | 生成物 path（変更なし） |
|---|---|---|
| `skills/amadeus/` | `core/skills/amadeus/` | `.agents/skills/amadeus/` |
| `skills/amadeus-application-design/` | `core/skills/amadeus-application-design/` | `.agents/skills/amadeus-application-design/` |
| `skills/amadeus-approval-handoff/` | `core/skills/amadeus-approval-handoff/` | `.agents/skills/amadeus-approval-handoff/` |
| `skills/amadeus-bugfix/` | `core/skills/amadeus-bugfix/` | `.agents/skills/amadeus-bugfix/` |
| `skills/amadeus-build-and-test/` | `core/skills/amadeus-build-and-test/` | `.agents/skills/amadeus-build-and-test/` |
| `skills/amadeus-ci-pipeline/` | `core/skills/amadeus-ci-pipeline/` | `.agents/skills/amadeus-ci-pipeline/` |
| `skills/amadeus-code-generation/` | `core/skills/amadeus-code-generation/` | `.agents/skills/amadeus-code-generation/` |
| `skills/amadeus-compose/` | `core/skills/amadeus-compose/` | `.agents/skills/amadeus-compose/` |
| `skills/amadeus-delivery-planning/` | `core/skills/amadeus-delivery-planning/` | `.agents/skills/amadeus-delivery-planning/` |
| `skills/amadeus-deployment-execution/` | `core/skills/amadeus-deployment-execution/` | `.agents/skills/amadeus-deployment-execution/` |
| `skills/amadeus-deployment-pipeline/` | `core/skills/amadeus-deployment-pipeline/` | `.agents/skills/amadeus-deployment-pipeline/` |
| `skills/amadeus-domain-modeling/` | `core/skills/amadeus-domain-modeling/` | `.agents/skills/amadeus-domain-modeling/` |
| `skills/amadeus-environment-provisioning/` | `core/skills/amadeus-environment-provisioning/` | `.agents/skills/amadeus-environment-provisioning/` |
| `skills/amadeus-feasibility/` | `core/skills/amadeus-feasibility/` | `.agents/skills/amadeus-feasibility/` |
| `skills/amadeus-feature/` | `core/skills/amadeus-feature/` | `.agents/skills/amadeus-feature/` |
| `skills/amadeus-feedback-optimization/` | `core/skills/amadeus-feedback-optimization/` | `.agents/skills/amadeus-feedback-optimization/` |
| `skills/amadeus-functional-design/` | `core/skills/amadeus-functional-design/` | `.agents/skills/amadeus-functional-design/` |
| `skills/amadeus-grilling/` | `core/skills/amadeus-grilling/` | `.agents/skills/amadeus-grilling/` |
| `skills/amadeus-incident-response/` | `core/skills/amadeus-incident-response/` | `.agents/skills/amadeus-incident-response/` |
| `skills/amadeus-infrastructure-design/` | `core/skills/amadeus-infrastructure-design/` | `.agents/skills/amadeus-infrastructure-design/` |
| `skills/amadeus-init/` | `core/skills/amadeus-init/` | `.agents/skills/amadeus-init/` |
| `skills/amadeus-intent-capture/` | `core/skills/amadeus-intent-capture/` | `.agents/skills/amadeus-intent-capture/` |
| `skills/amadeus-market-research/` | `core/skills/amadeus-market-research/` | `.agents/skills/amadeus-market-research/` |
| `skills/amadeus-mvp/` | `core/skills/amadeus-mvp/` | `.agents/skills/amadeus-mvp/` |
| `skills/amadeus-nfr-design/` | `core/skills/amadeus-nfr-design/` | `.agents/skills/amadeus-nfr-design/` |
| `skills/amadeus-nfr-requirements/` | `core/skills/amadeus-nfr-requirements/` | `.agents/skills/amadeus-nfr-requirements/` |
| `skills/amadeus-observability-setup/` | `core/skills/amadeus-observability-setup/` | `.agents/skills/amadeus-observability-setup/` |
| `skills/amadeus-outcomes-pack/` | `core/skills/amadeus-outcomes-pack/` | `.agents/skills/amadeus-outcomes-pack/` |
| `skills/amadeus-performance-validation/` | `core/skills/amadeus-performance-validation/` | `.agents/skills/amadeus-performance-validation/` |
| `skills/amadeus-practices-discovery/` | `core/skills/amadeus-practices-discovery/` | `.agents/skills/amadeus-practices-discovery/` |
| `skills/amadeus-refined-mockups/` | `core/skills/amadeus-refined-mockups/` | `.agents/skills/amadeus-refined-mockups/` |
| `skills/amadeus-replay/` | `core/skills/amadeus-replay/` | `.agents/skills/amadeus-replay/` |
| `skills/amadeus-requirements-analysis/` | `core/skills/amadeus-requirements-analysis/` | `.agents/skills/amadeus-requirements-analysis/` |
| `skills/amadeus-reverse-engineering/` | `core/skills/amadeus-reverse-engineering/` | `.agents/skills/amadeus-reverse-engineering/` |
| `skills/amadeus-rough-mockups/` | `core/skills/amadeus-rough-mockups/` | `.agents/skills/amadeus-rough-mockups/` |
| `skills/amadeus-scope-definition/` | `core/skills/amadeus-scope-definition/` | `.agents/skills/amadeus-scope-definition/` |
| `skills/amadeus-security-patch/` | `core/skills/amadeus-security-patch/` | `.agents/skills/amadeus-security-patch/` |
| `skills/amadeus-session-cost/` | `core/skills/amadeus-session-cost/` | `.agents/skills/amadeus-session-cost/` |
| `skills/amadeus-team-formation/` | `core/skills/amadeus-team-formation/` | `.agents/skills/amadeus-team-formation/` |
| `skills/amadeus-units-generation/` | `core/skills/amadeus-units-generation/` | `.agents/skills/amadeus-units-generation/` |
| `skills/amadeus-user-stories/` | `core/skills/amadeus-user-stories/` | `.agents/skills/amadeus-user-stories/` |
| `skills/amadeus-validator/` | `core/skills/amadeus-validator/` | `.agents/skills/amadeus-validator/` |

**実測根拠**: `ls skills/` 実測（42 dirs: amadeus 1 + amadeus-* 41）。`.agents/skills/` の amadeus* 42 dirs と一致（non-amadeus 3 dirs: gh-issue-organizer、japanese-tech-writing、skill-forge は除外）。

### 2.3 harness/codex ファイル（Phase 2 で per-skill 正準化）

| 現在の path | Phase 2 後の正準ソース path | 生成物 path |
|---|---|---|
| `harness/codex/README.md` | 変更なし（契約宣言）。 | なし（手編集） |
| `harness/codex/provenance.md` | 変更なし（取り込み記録）。 | なし（手編集） |
| `skills/<name>/agents/openai.yaml`（38 件） | `harness/codex/skills/<name>/agents/openai.yaml`（per-skill、各 skill の内容差を保持）（B002 で git mv） | `.agents/skills/<name>/agents/openai.yaml`（build.ts Step 3 後勝ち） |

**H4 訂正**: Phase 1 の文書で「`harness/codex/openai.yaml` を正準ソースとし展開する」と記述したが、単一ファイル化は不正確。per-skill の内容差（baseline commit `b67798c` の実測: 38 件全て同一 sha256 `a1499d95...` だが、今後の変更で差分が生じうる）を保持するため、`harness/codex/skills/<name>/agents/openai.yaml` の per-skill 形式が正しい。

### 2.4 生成物 4 種の対応表

| 生成物種別 | 生成元 | 出力先 | 生成ステップ |
|---|---|---|---|
| エンジン実行時コピー | `core/{agents,amadeus-common,hooks,knowledge,scopes,sensors,tools}/` | `.agents/amadeus/<dir>/` | Step 1 |
| skill 昇格コピー | `core/skills/<name>/` | `.agents/skills/<name>/` | Step 2 |
| openai.yaml 展開（harness overlay、後勝ち） | `harness/codex/skills/<name>/agents/openai.yaml`（Phase 2） | `.agents/skills/<name>/agents/openai.yaml` | Step 3 |
| .claude symlinks | `harness/claude/wiring.json` | `.claude/<name>` → `../.agents/amadeus/<name>` | Step 4 |

---

## 3. tooling エンティティの変更対応表

### 3.1 parity-check.ts の checkSkills 変更

| フィールド | 変更前 | 変更後 | 変更種別 |
|---|---|---|---|
| sourcePath | `join(root, "skills", mappedName)` (line 174) | `join(root, map.skillsSourceDir ?? "skills", mappedName)` | parity-check.ts 修正 |
| parity-map.json | `skillsSourceDir` フィールドなし | `"skillsSourceDir": "core/skills"` を追加 | parity-map.json 追加 |
| promotedPath | `join(root, ".agents/skills", mappedName)` (line 175) | 変更なし（生成物パスは同じ） | 変更なし |

**影響なし**: parity-check.ts の checkEngineFiles と checkRulesFile は `.agents/amadeus/` を参照する relocations を経由するため、restructure 後も変更不要。

### 3.2 rename-leftovers eval の走査対象

| 検査種別 | 走査パス | restructure 後の変更 |
|---|---|---|
| (a) 旧名 skills/aidlc パス断片 | `.agents/amadeus/tools/` | 変更なし（生成物パスは同じ） |
| (b) `aidlc-${` テンプレートリテラル | `.agents/amadeus/tools/` | 変更なし |
| (c) sensor ファイル命名 | `.agents/amadeus/sensors/` | 変更なし |

**実測根拠**: `dev-scripts/evals/rename-leftovers/check.ts` の `toolsDir = join(root, ".agents/amadeus/tools")`、`sensorsDir = join(root, ".agents/amadeus/sensors")`（line 12-13）。

### 3.3 installer MANIFEST の変更

| MANIFEST フィールド | 現在の値 | restructure 後 | 変更要否 |
|---|---|---|---|
| engineDirs | 7 dir names | 変更なし（.agents/amadeus/ が生成物のまま） | 変更なし |
| skillsGlobPrefix | "amadeus" | 変更なし | 変更なし |
| claudeSymlinks | 7 dir names | 変更なし | 変更なし |
| amadeusMd | removeBlocks 等 | 変更なし | 変更なし |

**根拠**: installer の copyEngine は `.agents/amadeus/`（line 207-220）、copySkills は `.agents/skills/`（line 230-260）を参照する。これらは build.ts の生成物パスであり変わらない。

### 3.4 amadeus-templates eval の変更（H1）

| ファイル | 変更前の参照 | 変更後 | 担当 Bolt |
|---|---|---|---|
| `dev-scripts/evals/amadeus-templates/check.ts:166` | `join(root, "skills", skill, "SKILL.md")` | `join(root, "core/skills", skill, "SKILL.md")` | B002 |
| `dev-scripts/evals/amadeus-templates/check.ts:171` | `join(root, "skills", skill, relative)` | `join(root, "core/skills", skill, relative)` | B002 |
| `dev-scripts/evals/amadeus-templates/check.ts:180` | `join(root, "skills", skill, relative)` | `join(root, "core/skills", skill, relative)` | B002 |
| `dev-scripts/evals/amadeus-templates/check.ts:185` | `join(root, "skills", skill, relative)` | `join(root, "core/skills", skill, relative)` | B002 |
| `dev-scripts/evals/amadeus-templates/check.ts:49` | `path: "skills/amadeus-domain-modeling/SKILL.md"`（textContracts 配列リテラル） | `path: "core/skills/amadeus-domain-modeling/SKILL.md"` | B002 |
| `dev-scripts/evals/amadeus-templates/check.ts:68` | `path: "skills/amadeus-validator/SKILL.md"`（textContracts 配列リテラル） | `path: "core/skills/amadeus-validator/SKILL.md"` | B002 |
| `dev-scripts/evals/amadeus-templates/check.ts:214` | `diff -qr skills/${skill}/templates ...`（テンプレートリテラル） | `diff -qr core/skills/${skill}/templates ...` | B002 |
| `dev-scripts/evals/amadeus-templates/check.ts:214` | `run(["bun", "run", "dev-scripts/promote-skill.ts", ...])` | `run(["bun", "run", "dev-scripts/build.ts", ...])` | B003 |

### 3.5 grilling-wiring.ts / issue-ref-contract.ts の変更（H3/M1）

| ファイル | 変更前の参照 | 変更後 | 担当 Bolt |
|---|---|---|---|
| `dev-scripts/grilling-wiring.ts:4` | `const annexRelPath = "skills/amadeus/..."` | `"core/skills/amadeus/..."` | B002 |
| `dev-scripts/grilling-wiring.ts:5` | `const codexAnnexRelPath = "skills/amadeus/..."` | `"core/skills/amadeus/..."` | B002 |
| `dev-scripts/grilling-wiring.ts:6` | `const conductorRelPath = "skills/amadeus/SKILL.md"` | `"core/skills/amadeus/SKILL.md"` | B002 |
| `dev-scripts/grilling-wiring.ts:7` | `const bridgeRelPath = "skills/amadeus-grilling/..."` | `"core/skills/amadeus-grilling/..."` | B002 |
| `dev-scripts/grilling-wiring.ts:126-127` | `join(root, "skills")` → stageSkillDirs が 0 件で空振り pass | `join(root, "core/skills")` + 0 件 fail guard 追加 | B002 |
| `dev-scripts/grilling-wiring.ts:139` | `` const relPath = `skills/${dir}/SKILL.md` `` | `` `core/skills/${dir}/SKILL.md` `` | B002（M-A） |
| `dev-scripts/grilling-wiring.ts:187` | `relPath.slice("skills/".length)` | `relPath.slice("core/skills/".length)` | B002（M-B） |
| `dev-scripts/grilling-wiring.ts:219` | `` dirs.map((dir) => `skills/${dir}/SKILL.md`) `` | `` dirs.map((dir) => `core/skills/${dir}/SKILL.md`) `` | B002（M-C） |
| `dev-scripts/grilling-wiring.ts:225` | `relPath.slice("skills/".length)` | `relPath.slice("core/skills/".length)` | B002（M-B/C） |
| `dev-scripts/issue-ref-contract.ts:37` | `skillIssues(root, skillName, "skills")` | `skillIssues(root, skillName, "core/skills")` | B002 |

**M1 設計判断（0 件 fail guard）**: `stageSkillDirs` が 0 件を返した場合、`dev-scripts/contracts:check`（grilling-wiring:check）は空の配列に対してループ検証をスキップし、pass を返す。restructure 後に `core/skills/` が存在しない（またはパスが誤っている）ケースを検出するため、0 件時に `Error` を throw するか exit 1 する guard を追加する。

**M-A/M-B/M-C 説明**: line 139/219 はループ内のテンプレートリテラルで各 skill の SKILL.md path を組み立てる。line 187/225 は `relPath.slice("skills/".length)` で skill 名部分を取り出す。`"skills/".length` が 7 であるのに対し `"core/skills/".length` は 12 なので、スライス長もあわせて変更する。

**eval fixture 変更（M-D〜M-H + TypeScript imports）**: 上記 runtime tools に対応する eval fixtures も同一 commit で変更する（BR-17）。対象は `dev-scripts/evals/grilling-wiring/check.ts`、`evals/issue-ref-contract/check.ts`、`evals/amadeus-contracts/check.ts`、`evals/aidlc-state/check.ts`、`evals/docs-codekb-guards/check.ts`、`evals/amadeus-validator-domain/check.ts`（TypeScript import paths）。詳細は §4.3「B002 path update 対象（eval fixtures）」を参照する。

### 3.6 parity eval fixture の変更（M2）

| ファイル | 変更前 | 変更後 | 担当 Bolt |
|---|---|---|---|
| `dev-scripts/evals/parity/check.ts:236` | `mkdirSync(join(workspace, "skills", name), ...)` | `mkdirSync(join(workspace, "core/skills", name), ...)` | B002 |
| `dev-scripts/evals/parity/check.ts:237` | `writeFileSync(join(workspace, "skills", name, "SKILL.md"), ...)` | `writeFileSync(join(workspace, "core/skills", name, "SKILL.md"), ...)` | B002 |

**根拠**: `parity-map.json` に `skillsSourceDir: "core/skills"` を追加した後、`parity-check.ts` の `checkSkills` は `core/skills/` を参照する。eval の fixture が `skills/` を作り続けると、fixture の workspace が実際の restructure 後構造と一致しなくなり、eval が「新構造で正しく pass する」ことを検証できなくなる。

### 3.7 promote-skill.ts → build.ts の対応

| promote-skill.ts の責務 | build.ts での対応 | 変更種別 |
|---|---|---|
| `allowedEntries`（SKILL.md 参照でコピー対象決定） | Step 3 に同ロジックを再実装 | 移植 |
| `disallowedNames`（除外リスト） | Step 3 に同定義を再実装 | 移植 |
| `cpSync`（再帰コピー） | Step 3 同等 | 移植 |
| `disallowedPromotedPaths`（検証） | Step 3 後に同検証 | 移植 |
| `applyModelOverrides`（overlay 再適用フック） | Step 5 に移設 | 移設（FR-5） |
| `--replace`、`--dry-run`、`--agents-root` オプション | build.ts では不要（always replace、dry-run はフラグで対応）| 削除 |

---

## 4. 棚卸し実測全数表（付録）

### 4.1 棚卸しの実施

**コマンド**:
```sh
grep -rn "skills/" dev-scripts/ scripts/ .agents/amadeus/tools/ package.json
```

**実施日**: 2026-07-06（architecture-reviewer ラウンド 1〜3 の差し戻し後、全数棚卸し方式へ切り替え）

**目的**: ラウンド 1〜3 で逐次列挙による網羅が不可能であることが実証されたため、実測全数を記録し B002 実装者が漏れなく追従できるようにする（BR-5 「全数棚卸し + 検出器」方式の根拠データ）。

**教訓（#528 からの適用）**: 棚卸しのスキャン対象（`dev-scripts/ scripts/ .agents/amadeus/tools/ package.json`）は、B002 で変更する対象ファイルと同一スコープとする。スコープがずれると件数と内訳を誤り、受け入れ条件の判断を壊す。

### 4.2 B002 path update 対象（runtime tools）

| ファイル | 行 | スニペット | reviewer ラウンド |
|---|---|---|---|
| `dev-scripts/grilling-wiring.ts` | 4 | `const annexRelPath = "skills/amadeus/references/question-rendering.md"` | H3 |
| `dev-scripts/grilling-wiring.ts` | 5 | `const codexAnnexRelPath = "skills/amadeus/references/question-rendering-codex.md"` | H3 |
| `dev-scripts/grilling-wiring.ts` | 6 | `const conductorRelPath = "skills/amadeus/SKILL.md"` | H3 |
| `dev-scripts/grilling-wiring.ts` | 7 | `const bridgeRelPath = "skills/amadeus-grilling/references/engine-bridge.md"` | H3 |
| `dev-scripts/grilling-wiring.ts` | 126–127 | `join(root, "skills")` + 0 件 fail guard なし | M1 |
| `dev-scripts/grilling-wiring.ts` | 139 | `` const relPath = `skills/${dir}/SKILL.md` `` | M-A（R3） |
| `dev-scripts/grilling-wiring.ts` | 187 | `relPath.slice("skills/".length)` | M-B（R3） |
| `dev-scripts/grilling-wiring.ts` | 219 | `` dirs.map((dir) => `skills/${dir}/SKILL.md`) `` | M-C（R3） |
| `dev-scripts/grilling-wiring.ts` | 225 | `relPath.slice("skills/".length)` | M-B/C（R3） |
| `dev-scripts/issue-ref-contract.ts` | 37 | `skillIssues(root, skillName, "skills")` | H3 |
| `dev-scripts/parity-check.ts` | 174 | `join(root, "skills", mappedName)` | H3/BR-11 |
| `.agents/amadeus/tools/amadeus-utility.ts` | 3561 | `join(TOOLS_DIR, "..", "..", "..", "skills", "amadeus", "SKILL.md")` | H2 |
| `dev-scripts/promote-skill.ts` | 153 | `resolve(root, "skills", skillName)` | L-A（R3）—— B002〜B003 間の中間 red 防止のための最小変更 |

### 4.3 B002 path update 対象（eval fixtures）

BR-17 により、各 runtime tool と対応する eval fixture は同一 commit で変更する。

| ファイル | 行 | スニペット | 対応 runtime tool | reviewer ラウンド |
|---|---|---|---|---|
| `dev-scripts/evals/amadeus-templates/check.ts` | 49 | `path: "skills/amadeus-domain-modeling/SKILL.md"` | amadeus-templates check 本体 | H1 補足 |
| `dev-scripts/evals/amadeus-templates/check.ts` | 68 | `path: "skills/amadeus-validator/SKILL.md"` | amadeus-templates check 本体 | H1 補足 |
| `dev-scripts/evals/amadeus-templates/check.ts` | 166 | `join(root, "skills", skill, "SKILL.md")` | amadeus-templates check 本体 | H1 |
| `dev-scripts/evals/amadeus-templates/check.ts` | 171 | `join(root, "skills", skill, relative)` | amadeus-templates check 本体 | H1 |
| `dev-scripts/evals/amadeus-templates/check.ts` | 180 | `join(root, "skills", skill, relative)` | amadeus-templates check 本体 | H1 |
| `dev-scripts/evals/amadeus-templates/check.ts` | 185 | `join(root, "skills", skill, relative)` | amadeus-templates check 本体 | H1 |
| `dev-scripts/evals/parity/check.ts` | 236 | `mkdirSync(join(workspace, "skills", name), ...)` | parity-check.ts | M2 |
| `dev-scripts/evals/parity/check.ts` | 237 | `writeFileSync(join(workspace, "skills", name, "SKILL.md"), ...)` | parity-check.ts | M2 |
| `dev-scripts/evals/parity/check.ts` | 261 | `rmSync(join(missingSkillWorkspace, "skills/amadeus-x"), ...)` | parity-check.ts | M2 補足 |
| `dev-scripts/evals/parity/check.ts` | 281 | `rmSync(join(declaredMissingSkillWorkspace, "skills/amadeus-x"), ...)` | parity-check.ts | M2 補足 |
| `dev-scripts/evals/grilling-wiring/check.ts` | 139–155 | fixture: `mkdirSync(join(fixtureRoot, "skills/amadeus/references"), ...)` 他 | grilling-wiring.ts | M-D（R3） |
| `dev-scripts/evals/issue-ref-contract/check.ts` | 59–60 | fixture: `mkdirSync(join(fixtureRoot, "skills/amadeus"), ...)` 他 | issue-ref-contract.ts | M-E（R3） |
| `dev-scripts/evals/amadeus-contracts/check.ts` | 23 | `"skills/amadeus-grilling/references/skill-contract.md"` path assert | amadeus-contracts check 本体 | M-F（R3） |
| `dev-scripts/evals/amadeus-contracts/check.ts` | 24 | `"skills/amadeus-validator/references/skill-contract.md"` path assert | amadeus-contracts check 本体 | M-F（R3） |
| `dev-scripts/evals/amadeus-contracts/check.ts` | 51 | `readFileSync(join(root, "skills/amadeus-grilling/..."), "utf8")` | amadeus-contracts check 本体 | M-F（R3） |
| `dev-scripts/evals/aidlc-state/check.ts` | 35 | `join(root, "skills/amadeus/references/aidlc-v2/state-template.md")` | aidlc-state check 本体 | M-G（R3） |
| `dev-scripts/evals/docs-codekb-guards/check.ts` | 333 | `join(root, "skills/amadeus-validator/validator/AmadeusValidator.ts")` | docs-codekb-guards check 本体 | M-H（R3） |
| `dev-scripts/evals/amadeus-validator-domain/check.ts` | 6 | TypeScript: `from "../../../skills/amadeus-validator/validator/domain/primitives"` | amadeus-validator-domain check 本体 | R3 補足 |
| `dev-scripts/evals/amadeus-validator-domain/check.ts` | 11 | TypeScript: `from "../../../skills/amadeus-validator/validator/domain/artifact-links"` | amadeus-validator-domain check 本体 | R3 補足 |
| `dev-scripts/evals/model-overlay/check.ts` | 389 | `mkdirSync(join(ws, \`skills/${PROMOTE_SKILL_NAME}\`), ...)` | promote-skill.ts（L-A 対応） | R3 補足 |
| `dev-scripts/evals/model-overlay/check.ts` | 390 | `writeFileSync(join(ws, \`skills/${PROMOTE_SKILL_NAME}/SKILL.md\`), ...)` | promote-skill.ts（L-A 対応） | R3 補足 |

| `dev-scripts/evals/promote-skill/check.ts` | 43, 46 | `readdirSync(join(root, "skills"))` / `statSync(join(root, "skills", entry))`（amadeusSkills()） | `core/skills` へ変更（B002。BR-14 の中間 red 防止の一部） |
| `dev-scripts/evals/promote-skill/check.ts` | 98 | `["skills", ".agents/skills"]` ベース配列 | `["core/skills", ".agents/skills"]` へ変更（B002） |
| `dev-scripts/evals/amadeus-templates/check.ts` | 214 | `diff -qr skills/\${skill}/templates ...`（テンプレートリテラル） | `core/skills/` へ変更（B002。§3.4 と同内容の再掲 = 付録の全数性維持） |

### 4.4 B003 対象（promote-skill.ts 退役）

| ファイル | 行 | スニペット | 備考 |
|---|---|---|---|
| `dev-scripts/evals/amadeus-templates/check.ts` | 214 | `run(["bun", "run", "dev-scripts/promote-skill.ts", skill, ...])` | B003 で `build.ts` 呼び出しへ置き換え |

### 4.5 allowlist（path token でない出現 — 変更不要）

| ファイル | 行 | 出現種別 | 理由 |
|---|---|---|---|
| `.agents/amadeus/tools/amadeus-orchestrate.ts` | 2, 573, 582, 1421 | コメント行 | 上流アーキテクチャの記述 |
| `.agents/amadeus/tools/amadeus-runner-gen.ts` | 3, 13, 307, 319, 357, 360, 567 | コメント・log 文字列 | 説明文 |
| `.agents/amadeus/tools/amadeus-runner-gen.ts` | 67 | `SKILLS_DIR = join(TOOLS_DIR, "..", "skills")` | pre-existing 壊れパス（`.agents/amadeus/skills/` は元々存在しない）。restructure 後に canonical `core/tools/` から実行すると `core/skills/` に解決され改善される副作用。生成物コピーは従来どおり壊れたまま。B002 action 不要。 |
| `dev-scripts/data/parity-map.json` | 606, 607 | `"prefix": "skills/aidlc/"`, `"replacement": "skills/amadeus/"` | nameMappings の data values（namespace 対応の文字列定数） |
| `dev-scripts/data/parity-map.json` | 735, 755 | reason/comment 文字列内 | 説明文 |
| `scripts/amadeus-install.ts` | 54, 67, 75, 78 | `devReferencePatterns` regex 文字列 | インストール済み CLAUDE.md の `skills/` 残留を検出する regex。installer は `.agents/skills/` から読む |
| `dev-scripts/evals/rename-leftovers/allowlist.json` | 145 | allowlist data | allowlist エントリ自身 |
| `dev-scripts/evals/rename-leftovers/check.ts` | 84, 86, 101, 111 | `"skills/aidlc/"` 断片チェック | 旧上流名の検出パターン（対象は `.agents/amadeus/tools/` のみ） |
| `dev-scripts/generate-parity-baseline.ts` | 5 | コメント行 | 説明文 |
| `dev-scripts/parity-check.ts` | 176 | エラーメッセージ文字列 | `join(root, "skills", ...)` は line 174 が実 path 参照。line 176 は表示用文字列のみ |
| `.agents/amadeus/tools/amadeus-utility.ts` | 2057 | コメント行（`// codebase whose sources live elsewhere (dev-scripts/, skills/, lints/ —`） | アーキテクチャ説明 |
| `dev-scripts/evals/promote-skill/check.ts` | 134 | `.agents/skills/${skill}` | 生成物パス（`.agents/skills/`）を参照。restructure 後も変わらない |
