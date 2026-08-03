上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, frontend-components, logical-components, performance-design, reliability-design, scalability-design, security-design, requirements, unit-of-work, unit-of-work-story-map, bolt-plan

# Code Summary — u9-docs-norms

FR-3.5 / FR-6 / C9 に従い、u8で成立したsource-only境界をonboarding、配布、harness開発、release、恒久規範へ反映した。現在形の文書から旧committed-dist / byte-parity契約を除き、未追跡のローカル生成物、隔離2回buildの再現性、source-only境界、clean-checkout Release Assetを正として統一した。

## 作成・変更ファイル

| 面 | ファイル | 内容 |
|---|---|---|
| onboarding | `README.md`, `README.ja.md`, `CONTRIBUTING.md` | clone → `bun install --frozen-lockfile` → `bun run build` → harness起動を固定。公開経路をGitHub Release Assetとし、旧versionだけsource archive fallbackと明記 |
| root契約 | `AGENTS.md`, `.gitattributes` | 生成面を未追跡のローカル出力として記述し、review対象はbootstrap/configuration allowlistに限定 |
| harness guides | `docs/guide/harnesses/{codex-cli,cursor,kimi-code,kiro-cli,kiro-ide,opencode}{,.ja}.md` | harnessごとの再生成手順と検査をsource-only契約へ同期 |
| release | `docs/guide/publishing-setup{,.ja}.md` | release workflowの実態(build-dist → full test → boundary/graph検査 → tar/manifest/SHA256SUMS添付)へ同期 |
| engineering/reference | `docs/harness-engineering/`, `docs/reference/`, `docs/amadeus-files.md` の対象面 | committed copyとのparityを、隔離build再現性・境界検査・graph不変量へ置換 |
| terminology | `docs/guide/glossary{,.ja}.md`, `packages/framework/core/knowledge/amadeus-shared/glossary.md` | Distribution / Packager定義を更新し、glossary projectionで正規投影 |
| durable norms | `amadeus/spaces/default/memory/project.md` | 規範衝突5点をsource-only境界へ改訂し、G3受容論証と本Intentの棚卸しprovenanceを記録 |
| supporting contract | `contrib/skills/amadeus-upstream-sync/references/artifact-contracts.md` | upstream同期時のartifact境界をsource-only契約へ更新 |
| stage artifacts | 本ディレクトリの `code-generation-plan.md`, `code-summary.md` | Unit 9の計画・実装・検証記録 |

## 規範衝突5点の解消

1. `dist/<harness>/` 手編集禁止: 対象を「独立した正本として編集しない」へ統合。未追跡生成物そのものへの代替ガードは追加しない
2. 手動checklistへの代替禁止: 隔離2回build、`source-only:check`、graph不変量を決定的検査として固定
3. installer検証: `dist:check` / `promote:self:check` から再現性・境界・graph・関連テストへ置換
4. user-facing impact棚卸し: README/docs/tests/self-promotion/CIにinstaller/release assetを加え、本Intentでの実施provenanceを記録して規範を維持
5. AGENTS / CONTRIBUTING / README / `.gitignore` / `.gitattributes` の旧committed-dist説明: 現在のsource-only境界へ更新

G3の受容論証: ローカル `dist/` はGit ignore対象であり、Git履歴へ入らない。公開Release Assetはrelease workflowが対象commitのclean checkoutからbuildするため、ローカル手編集が公開物へ入る経路もない。ローカル出力は次の `bun run build` で置換される。このため、旧「dist手編集検出」の代替検査を置かず、生成器の性質とGit境界を検証する。

## 検証結果

- `bun scripts/glossary-projection.ts check`: 4 surfaces in sync
- 最終focused docs契約テスト: **62 pass / 0 fail / 109 expect() calls**
  - `t174-docs-legacy-refs-gate`
  - `t414-glossary-projection` unit + integration
  - `t416-self-install-gitattributes`
- fresh worktreeでbuild前の `bun run typecheck`: `dist/` import不在で失敗し、文書化したbuild-before-test前提を確認
- `bun run build`: 7 harnessの `dist/` とself-install面を生成。生成物は未追跡
- build後の `bun run typecheck`: **PASS**
- `bun run source-only:check`: `source-only boundary: clean`
- `git diff --check`: **PASS**

## 逸脱

FDはproject.md改訂4点を別norm PRで「文案起草まで」とした。その後の人間裁定によりIntent分割を行わず、親conductorからu9文書と5点のnorm変更を本Boltの単一PRへ含める指示を受けたため、最新裁定を優先して同一変更へ収束した。PR mergeの人間承認境界は変更していない。

## 未検証・オープン事項

- full `bun run test:ci` は本Unitでは実行していない。文書専用Unitのfocused検証を完了し、全体検証は後続build-and-test stageへ引き継ぐ
- GitHub Release Assetの実publishは `workflow_dispatch` の人間承認境界に属し、本Unitでは実行していない
