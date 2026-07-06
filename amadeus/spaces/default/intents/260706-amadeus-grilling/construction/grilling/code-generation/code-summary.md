# Code Summary — Amadeus Grilling 統合

**Intent**: Amadeus Grilling 統合 / **Stage**: code-generation (3.5)
**Plan**: `code-generation-plan.md` / **Date**: 2026-07-07

## 実際の変更内容

### 新設ファイル

| ファイル | 内容 | 対応 BR/FR |
|---|---|---|
| `core/amadeus-common/protocols/grilling-protocol.md` | 規律の単一ソース(英語)。先頭に MIT 帰属 HTML コメント(原リポジトリ URL・原著者・MIT 明記)。§1 対話規律 D1〜D7(=BR-D1〜D7)、§2 8ステップループ、§3 スペックブロック雛形 C-2〜C-4、§4 workflow/standalone 差分表。{{HARNESS_DIR}} トークンのみ使用、ハーネスツール名なし | BR-P1/P2/P4, BR-D1〜D7, FR-4.1 |
| `core/skills/amadeus-grilling/SKILL.md` | read-only セッションスキル。frontmatter は C-5 どおり(`name` / `description` 英語 / `argument-hint: "<file-or-topic>"` / `user-invocable: true` / `classification: read-only`)。本文は protocol 参照+standalone 規則(BR-S1〜S4)。MIT 帰属1行(protocol への参照つき) | BR-S1〜S4, FR-2.1〜2.3, C-5 |
| `tests/unit/t199-grilling-distribution.test.ts` | (a) 4 dist 配布(codex は `dist/codex/.agents/skills/`)、(b) grilling-protocol.md の4 dist 配布、(c) stage-protocol に `label: Grill me` + protocol 参照、(d) 全 dist で `classification: read-only` frontmatter、(e) MIT 帰属(URL+ライセンス名)。ハッピーパス+エッジ(分類欠落・帰属欠落は fail する形) | NFR-5, FR-4.1, BR-P3 |

### 既存ファイル編集

| ファイル | 変更 |
|---|---|
| `core/amadeus-common/protocols/stage-protocol.md` | §3 Step 2 モード選択に Grill me を Guide me 直後に追加(C-1 文言の英訳)+ Construction/Operation で「(exceptional use in this phase)」を付す prose 指示(BR-W1)。Step 3c 直後に Step 3d 新設: grilling-protocol.md 参照+BR-W2(提示前の空 `[Answer]:` 追記)/BR-W3(即時書き戻し)/BR-W4(1問ごと decision/answer、既存イベント型のみ)+Step 4 以降無変更の明記(BR-W5)。Step 4 以降は非変更 |
| `core/amadeus-common/conductor.md` | 「tri-mode」列挙を4モード(guided / grilling / self-guided / chat)に更新 |
| `core/amadeus-common/stages/ideation/intent-capture.md` / `market-research.md` | モード列挙に Grill Me を追加(プロトコル参照の鮮度維持のみ、ステージ手順は非変更) |
| `core/templates/onboarding.md` | セッションスキル列挙を4本化(dist の CLAUDE.md.example / AGENTS.md に反映) |
| `core/tools/amadeus-runner-gen.ts` | 非ランナースキル列挙コメントに amadeus-grilling を追加(挙動変更なし) |
| `core/tools/amadeus-version.ts` | `AMADEUS_VERSION` 1.0.0 → 1.1.0 |
| `harness/claude/manifest.ts` / `harness/kiro/manifest.ts` / `harness/kiro-ide/manifest.ts` | coreDirs に `skills/amadeus-grilling` 行を追加(既存セッションスキル行と同型) |
| `harness/codex/emit.ts` | セッションスキル配列(L337)に `"amadeus-grilling"` を追加。codex manifest には追加せず(BR-P3) |
| `CHANGELOG.md` | `## [1.1.0] - 2026-07-07` 見出し+Grill me / /amadeus-grilling / 帰属の3箇条 |
| `README.md` | バッジ 1.1.0、`core/skills/` の説明を「4 session skills」に |
| `docs/guide/07-interaction-modes.md` | 4モード化(節名を Question Interaction Modes に)、Grill Me 節新設+mattpocock/skills MIT クレジット(FR-4.1) |
| `docs/reference/04-stage-protocol.md` | モード選択スペックに Grill me、Grill Me (Grilling Mode) 小節(Step 3d 相当)を追加、four-mode 表記 |
| `docs/guide/00-introduction.md` / `02-your-first-workflow.md` / `14-artifacts-reference.md` / `16-worked-examples.md` / `agents/product-agent.md` | モード列挙を4モードに更新 |
| `docs/guide/17-skills.md` / `12-cli-commands.md` / `11-session-management.md` / `docs/reference/17-skill-system.md` | session skills 列挙に `/amadeus-grilling` を追加 |
| `docs/reference/01-architecture.md` / `03-orchestrator.md` / `04-stages/{ideation,inception,construction}.md` / `docs/harness-engineering/09-porting-to-a-new-harness.md` | tri-mode/3本列挙の残存参照を更新 |
| `tests/unit/t123-skills-spec-conformance.test.ts` / `tests/smoke/t123-…` | BASE_SKILLS を4→5(amadeus-grilling 追加) |
| `tests/unit/t150-codex-packaging.test.ts` | codex skills 期待数 39→40 |
| `dist/`(4ハーネス)+ `.claude/` `.codex/` `.agents/` `CLAUDE.md.example` 等 | `bun scripts/package.ts` と `bun run promote:self` による再生成物 |

annex(question-rendering)は4ハーネスとも無変更(BR-P4 / OQ-1 検証どおり)。`amadeus-audit.ts` の VALID_EVENT_TYPES も無変更(FR-3.2)。

## 検証結果

| コマンド | 結果 |
|---|---|
| `bun scripts/package.ts` → `bun scripts/package.ts --check` | PASS(all harness trees in sync) |
| `bun run promote:self` → `bun run promote:self:check` | PASS(self install in sync) |
| `bun run typecheck` | PASS(exit 0) |
| `bun test tests/unit/t199-grilling-distribution.test.ts` | PASS |
| `bun test tests/unit/t68-version-changelog-sync.test.ts` | PASS |
| `bun test`(t123 unit/smoke, t150, t145 含む6ファイル) | PASS(358 pass / 0 fail) |
| `bun tests/gen-coverage-registry.ts --check` | PASS(fresh, ratchet held) |
| `bash tests/run-tests.sh`(smoke+unit+integration 全230ファイル) | 失敗8ファイルはすべてベースライン既知: t11 / t38 / t65 / t66 / t140 / t174 + t19(AWS 資格情報なしの環境要因)+ t130(HEAD の pristine worktree でも同一失敗を確認)。本変更起因の新規失敗ゼロ |
| `bun run lint`(Biome) | 変更ファイルはクリーン(t199 単体チェック PASS)。リポジトリ全体では既存の useTemplate 違反(`tests/harness/kiro-ide-driver.ts`、`tests/integration/t145-…`)が main 由来で残存 — 本変更では触っていない |

## 設計からの逸脱

1. **なし(仕様面)** — BR-D/W/S/P、C-1〜C-5、8ステップループはすべて設計どおり実装。
2. **軽微な補足**: `.claude/CLAUDE.md`(リポジトリルートの自己インストール側)は promote-self の preserved リストに含まれ(`scripts/promote-self.ts` L49)、ビルドでは更新されない手管理ファイルと判明。タスク指示「直接編集しない」に従い未編集のため、セッションスキル列挙が3本のまま残っている。ソース(`core/templates/onboarding.md` → `CLAUDE.md.example`)は更新済み。`.claude/CLAUDE.md` への反映はゲートで人間判断を仰ぐ。
3. **テスト2件の期待値更新**(t123 x2、t150)— スキル追加に伴う必然の更新(基底スキル集合4→5、codex スキル数39→40)。既存3モードの挙動・既存テストの意味は不変(NFR-3)。
