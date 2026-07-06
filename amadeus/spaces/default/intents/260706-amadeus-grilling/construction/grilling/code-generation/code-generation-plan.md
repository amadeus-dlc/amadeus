# Code Generation Plan — Amadeus Grilling 統合

**Intent**: Amadeus Grilling 統合 / **Stage**: code-generation (3.5)
**Upstream**: `../functional-design/business-rules.md`(BR-D/W/S/P)、`business-logic-model.md`(8ステップループ、OQ-1/OQ-2)、`domain-entities.md`、`frontend-components.md`(C-1〜C-5)、`../../inception/requirements-analysis/requirements.md`(FR/NFR)

## 変更ファイル一覧と対応規則

| # | ファイル | 変更 | 対応 BR/FR |
|---|---|---|---|
| 1 | `core/amadeus-common/protocols/grilling-protocol.md` | 新設 — 規律の単一ソース(英語、MIT 帰属コメント先頭、{{HARNESS_DIR}} トークン、BR-D1〜D7 + 8ステップループ + C-2〜C-4 雛形 + workflow/standalone 差分表) | BR-P1, BR-P2, BR-P4, BR-D1〜D7, FR-4.1 |
| 2 | `core/amadeus-common/protocols/stage-protocol.md` | §3 Step 2 モード選択に Grill me(Guide me 直後、Construction/Operation 注記の条件付け)、Step 3d 新設(protocol 参照 + BR-W2/W3/W4)。Step 4 以降は無変更 | BR-W1〜W5, FR-1.1〜1.7, C-1 |
| 3 | `core/amadeus-common/conductor.md` | 「tri-mode」列挙を4モードに更新(既存参照の鮮度維持) | FR-1.1, チームルール(grep 更新) |
| 4 | `core/skills/amadeus-grilling/SKILL.md` | 新設 — read-only セッションスキル(frontmatter は C-5、standalone 規則 BR-S1〜S4、MIT 帰属1行) | BR-S1〜S4, FR-2.1〜2.3, C-5 |
| 5 | `harness/claude/manifest.ts` / `harness/kiro/manifest.ts` / `harness/kiro-ide/manifest.ts` | coreDirs に `skills/amadeus-grilling` 行を追加 | BR-P3, FR-2.4 |
| 6 | `harness/codex/emit.ts` | セッションスキル配列(L337)に `"amadeus-grilling"` を追加(manifest には追加しない) | BR-P3 |
| 7 | `core/templates/onboarding.md` | セッションスキル列挙を4本に更新(dist の CLAUDE.md.example / 昇格後のルート CLAUDE.md へ反映) | FR-4.2 |
| 8 | `docs/guide/07-interaction-modes.md` | 対話モード節を4モード化、Grill me 節 + mattpocock/skills MIT クレジット | FR-4.2, FR-4.1 |
| 9 | `docs/reference/04-stage-protocol.md` | モード選択スペック + Grill me 節(Step 3d 相当)を追記、tri-mode 表記更新 | FR-4.2 |
| 10 | `docs/guide/17-skills.md` / `docs/guide/12-cli-commands.md` / `docs/guide/11-session-management.md` / `docs/reference/17-skill-system.md` / `README.md`(L250) | session skills 列挙に `/amadeus-grilling` を追加 | FR-4.2 |
| 11 | `docs/reference/01-architecture.md` / `docs/reference/03-orchestrator.md` / `docs/reference/04-stages/{ideation,inception,construction}.md` / `docs/guide/agents/product-agent.md` | 「tri-mode」の3モード列挙を4モードに更新(同一コミット grep ルール) | チームルール |
| 12 | `tests/unit/t199-grilling-distribution.test.ts` | 新設 — (a) 4 dist への配布(codex は `.agents/skills/`)、(b) grilling-protocol.md の4 dist 配布、(c) stage-protocol に Grill me、(d) frontmatter `classification: read-only`、(e) MIT 帰属コメント | NFR-5, FR-4.1, BR-P3 |
| 13 | `tests/unit/t123-…` / `tests/smoke/t123-…` | BASE_SKILLS に `amadeus-grilling` を追加(4→5 base) | NFR-3(ベースライン維持のための必然更新) |
| 14 | `tests/unit/t150-codex-packaging.test.ts` | codex skills 数 39→40 | 同上 |
| 15 | `core/tools/amadeus-version.ts` / `CHANGELOG.md` / `README.md` バッジ | 1.0.0 → 1.1.0 の3点セット | FR-4.3, BR-P5 |
| 16 | `dist/` 再生成 + 昇格(`.claude/` 等) | `bun scripts/package.ts` → `--check` → `bun run promote:self` → `promote:self:check` | NFR-4 |

## 検証計画

1. `bun scripts/package.ts` / `bun scripts/package.ts --check` — パリティ
2. `bun run promote:self` / `bun run promote:self:check` — 昇格パリティ
3. `bun run typecheck` — 型検査
4. `bun test tests/unit/t199-grilling-distribution.test.ts` — 新テスト
5. `bun test tests/unit/t68-version-changelog-sync.test.ts` — バンプ同期
6. `bash tests/run-tests.sh`(smoke + unit + integration)— ベースライン非悪化(既知失敗 t11/t38/t65/t66/t140/t174 ほかを除く)

## 設計上の注意点(遵守事項)

- BR-P1: 規律は grilling-protocol.md にのみ定義。Step 3d / SKILL.md は参照のみ(二重定義しない)
- BR-P4: annex 変更なし。protocols/ とスキルはハーネス中立({{HARNESS_DIR}} トークン)
- BR-W5: stage-protocol の Step 4 以降(検証・矛盾分析・§13・ゲート)は無変更
- git commit は行わない(後段の人間承認後)
