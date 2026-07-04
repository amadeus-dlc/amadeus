# Code Generation Plan — implicit unit

Intent: 260704-question-rendering-ux（refactor scope、Minimal depth、test strategy: Minimal）
対象 Issue: https://github.com/amadeus-dlc/amadeus/issues/448 、https://github.com/amadeus-dlc/amadeus/issues/449 、https://github.com/amadeus-dlc/amadeus/issues/450
上流成果物:
- `../../../inception/requirements-analysis/requirements.md`（R001〜R009、N001〜N004）
- `../functional-design/business-logic-model.md`（実行順序、節構成、申し送り）
- `../functional-design/business-rules.md`（規則の正準）
- `../functional-design/domain-entities.md`（変更対象ファイルの正準一覧）
- `../functional-design/frontend-components.md`（インタラクションフロー）

refactor scope のため user stories は存在しない。traceability は requirements の ID へ張る。

## 実装ステップ

### Step 1: RED — wiring 検査の拡張と eval fixture の拡張（R008）

- [x] `dev-scripts/grilling-wiring.ts` に次を追加する。
  - `codexAnnexIssues(root)` — `skills/amadeus/references/question-rendering-codex.md` の存在、正準 label 4 個（Guide me / Grill me / I'll edit the file / Chat）の順序、`request_user_input`、`Text fallback`、`question-rendering.md` 参照を assert する。
  - `annexIssues(root)` の `requiredMarkers` に、Display language 節（`Display language`、`conversation language`、`canonical label`、`display translation`）と Grill me レンダリング規則（`Grill me rendering rules`、`one question per tool call`、`recommendation marker`、`reuses the existing split rule`）と Codex annex への参照（`question-rendering-codex.md`）を追加する。
  - `bridgeLanguageIssues(root)` — `engine-bridge.md` に `is Japanese` が残っていないこと、`conversation language` 文言が存在することを assert する。
  - `orderIssues()` として順序判定ロジックを共通化し、canonical annex と Codex annex の両方に適用する。
  - `grillingWiringIssues()` の `affectedRelPaths`（昇格同期・参照解決の対象）に `question-rendering-codex.md` を追加する。
- [x] `dev-scripts/evals/grilling-wiring/check.ts` の fixture を拡張する。
  - `annexText` fixture に Display language 節と Grill me rendering rules 節を追加する。
  - `codexAnnexText` fixture を新設し、`writeSkillTree` / `makeFixture` が `question-rendering-codex.md`（source・昇格先の両方）を書き出せるようにする。
  - `bridgeText` fixture に会話言語文言を追加する（`is Japanese` は含めない）。
  - 揃った fixture が pass することを確認する。
  - 新 negative fixture を追加する: (a) Codex annex が存在しない fixture が `missing file` で fail する。(b) canonical annex から Display language 節を欠落させた fixture が `missing required marker "Display language"` で fail する。
- [x] 実 repo に対して `bun run dev-scripts/evals/grilling-wiring/check.ts` と `npm run grilling-wiring:check` を実行し、**annex/engine-bridge 変更前に fail することを確認**（RED の証跡を記録）。fixture ベースの assert（正常 fixture の pass、新旧 negative fixture の fail）はこの時点で GREEN、末尾の実 repo 統合 assert のみが RED になることを確認する。

### Step 2: 正準 annex の拡張（R001、R005、R006）

- [x] `skills/amadeus/references/question-rendering.md` に次を追加する。既存節の label・順序・文言は変更しない。
  - 冒頭付近に「Harness routing」節（Codex は `question-rendering-codex.md` の束縛を使う。中立節は両 harness に適用）を追加する。
  - Mechanism 節の後、Mode selection 節の前に「Display language」中立節（会話言語での表示、正準 label での記録、`[Answer]:` の併記規則）を追加する。
  - 既存の「If the user picks Grill me」の箇条書き（変更しない）の直後に、新設の「Grill me rendering rules」節（harness 中立規則 + Claude Code 束縛の要約）を追加する。
  - 追加節は Mode selection 節より前に置くため、4 label 文字列（Guide me / Grill me / I'll edit the file / Chat）を含めない（wiring 検査の order assert 回帰防止）。

### Step 3: Codex annex の新設（R003、R004、R007）

- [x] `skills/amadeus/references/question-rendering-codex.md` を新設する。`frontend-components.md` のフロー定義と `business-logic-model.md` の節構成に従い、Shared rules / Mechanism / Enablement / Mode selection / Grill me / Text fallback の 6 節を英語で書く。

### Step 4: engine-bridge の整合（R002）

- [x] `skills/amadeus-grilling/references/engine-bridge.md` の手順 5（旧: "User-facing question text is Japanese"）を、会話言語 + 正準ラベル記録の文言（正準 annex の Display language 節への参照）へ更新する。
- [x] 手順 1 に、正準 annex の Grill me rendering rules 節への参照を追加する。
- [x] 回答記録手順（decision/answer ログ、`[Answer]:` 書き戻し）は変更しない。書き戻し書式に触れる場合は「正準ラベル + 表示訳の併記」を明記する。

### Step 5: GREEN 確認

- [x] `npm run grilling-wiring:check` が pass する。
- [x] `npm run test:it:grilling-wiring` が pass する（fixture ベースの全 assert ＋ 実 repo 統合 assert の両方）。

### Step 6: 昇格同期（R009）

- [x] `bun run dev-scripts/promote-skill.ts amadeus --replace` を実行する。
- [x] `bun run dev-scripts/promote-skill.ts amadeus-grilling --replace` を実行する。
- [x] `npm run test:it:promote-skill` が pass する。

### Step 7: 検証

- [x] `npm run typecheck` を実行し記録する。
- [x] `npm run lint:check` を実行し記録する。
- [x] `npm run parity:check` を実行し記録する（`amadeus-common/` 無差分、`engineFileExceptions` 空のまま）。
- [x] `npm run claude-wiring:check` を実行し記録する。

### Step 8: code-summary の作成

- [x] `code-summary.md` に変更ファイル一覧、RED/GREEN 証跡、検証結果、plan からの逸脱を記録する。

## Traceability

| Plan Step | Requirement |
|---|---|
| Step 1 | R008-wiring-check-extension、N004-deterministic-check |
| Step 2 | R001-display-language-rule、R005-grill-me-neutral-rules、R006-grill-me-claude-binding |
| Step 3 | R003-codex-annex、R004-codex-fallback-format、R007-grill-me-codex-binding |
| Step 4 | R002-engine-bridge-language-alignment |
| Step 5 | R008-wiring-check-extension（GREEN 確認） |
| Step 6 | R009-promotion-sync |
| Step 7 | N002-parity-preserved、N001-existing-behavior-unchanged（既存 wiring 検査・parity での裏取り） |

## テスト方針（Minimal strategy）

新規テストは Step 1 の決定論的 wiring 検査（`dev-scripts/grilling-wiring.ts`）と、その fixture-based eval（`dev-scripts/evals/grilling-wiring/check.ts`）に集約する。
skill markdown（annex・engine-bridge）の変更はこの検査が唯一の自動回帰検知であり、requirement-driven（R001、R002、R003、R004、R005、R006 それぞれに対応する assert 群）とする。
vitest / jest の設定追加は不要（既存の bun eval パターンに従う、前例: Intent 260704-grilling-mode-wiring）。

## Review

（後続レビューで追記）
