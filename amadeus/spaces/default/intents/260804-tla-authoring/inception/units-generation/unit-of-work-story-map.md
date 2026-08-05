# Units Generation: 要求対応マップ（story map）

user-stories stage は本 scope（self-feature）で SKIP のため `stories.md` は存在しない（設計どおりの欠落）。stage 手順の「story → unit 対応」は、要求の正本である `inception/requirements-analysis/requirements.md` の FR / AC を対応単位として実施する（stage protocol の documented fallback）。設計上の根拠は `inception/application-design/` の components.md / component-methods.md / services.md / component-dependency.md / decisions.md である。

## FR → Unit 対応

| FR | 内容（要約） | 主担当 Unit | 補助 Unit |
|---|---|---|---|
| FR-001 適用判定 | 4 経路への決定論的分岐と receipt | applicability-hold | tla-evidence-foundation（永続化） |
| FR-002 新規 authoring | 未知対象の author 経路 | authoring-stage-e2e | applicability-hold（起点 receipt） |
| FR-003 意味変更時の改訂 | stale 化と hold | applicability-hold | tla-evidence-foundation（staleness 語彙） |
| FR-004 `--impl-only` | terminal route receipt | applicability-hold | tla-evidence-foundation（保存） |
| FR-005 非対象判定 | 理由 + 人間承認の永続 receipt | applicability-hold | tla-evidence-foundation（保存） |
| FR-006 全数トレーサビリティ | trace rows と coverage failure | authoring-referees | tla-evidence-foundation（stable ID 語彙） |
| FR-007 identity staleness | 旧 evidence の自動 stale | applicability-hold（C9 判定） | tla-evidence-foundation（比較関数） |
| FR-008 proof 完了条件 | TLC / falling / vacuity / reduction | authoring-referees | — |
| FR-009 独立レビューと人間ゲート | reviewer + 人間承認 | authoring-stage-e2e | — |
| FR-010 原子的登録 | bundle 参照の atomic replace | registration-committer | tla-evidence-foundation（verify） |
| FR-011 import closure 修復 | manifest 修復 + 汎用 guard | import-closure-guard | — |
| FR-012 未知題材 E2E | swarm unit-pool 題材の全経路実測 | authoring-stage-e2e | 全 unit（統合対象） |
| FR-013 既存モデル互換 | 保護境界の不変 | registration-committer（schema 互換） | import-closure-guard（AC-008）、authoring-referees（toolchain 無変更） |

## AC → Unit 対応（受け入れ判定の主体）

| AC | 判定場所 | 実装 Unit |
|---|---|---|
| AC-001 未知対象の authoring 強制 | build-and-test（hold 実測） | applicability-hold + registration-committer |
| AC-002 意味変更時の改訂 | build-and-test（stale fixture） | applicability-hold |
| AC-003 `--impl-only` receipt | build-and-test | applicability-hold + tla-evidence-foundation |
| AC-004 非対象 receipt | build-and-test | applicability-hold + tla-evidence-foundation |
| AC-005 全数 coverage | build-and-test | authoring-referees |
| AC-006 staleness 拒否 | build-and-test | applicability-hold |
| AC-007 未知題材 E2E | build-and-test（composed runtime 実測） | authoring-stage-e2e（+ import-closure-guard が missing import ゼロの一次担保） |
| AC-008 既存互換 | build-and-test（回帰） | import-closure-guard + registration-committer |

受け入れ判定の主体はすべて本 intent の build-and-test stage（decisions.md 末尾注記の合意）。fixture の実装は各 unit の functional-design / code-generation が担う（Comprehensive test strategy — 正常・欠落・stale・改竄・部分成功・既存互換を含む。NFR-006）。

## 被覆検証

- **全 FR が割当済み**: FR-001〜FR-013 の 13 件すべてに主担当 unit がある（上表）。
- **全 unit に要求がある**: 6 unit すべてが 1 件以上の FR の主担当または補助である。unit ごとの主担当数 — applicability-hold: 6、authoring-referees: 2、tla-evidence-foundation: 0（主担当なしだが FR-004/005/006/007/010 の補助として 5 件の保存・語彙責務を持つ基盤 unit）、registration-committer: 2、authoring-stage-e2e: 3、import-closure-guard: 1。
- **NFR の横断対応**: NFR-001（決定性）と NFR-003（fail-closed）は全 unit の実装規約（component-methods.md § 共通規約）、NFR-002（監査性）は tla-evidence-foundation、NFR-004（責務分離）は unit 境界そのもの、NFR-005（配布整合性）は import-closure-guard、NFR-006（検証可能性）は全 unit のテスト構成で担保する。

## 上流トレーサビリティ

- `inception/requirements-analysis/requirements.md`（FR/AC/NFR と §10 トレーサビリティ表）
- `inception/application-design/`（components.md、component-methods.md、services.md、component-dependency.md、decisions.md）
- `inception/units-generation/unit-of-work.md`、`unit-of-work-dependency.md`、`units-generation-questions.md`
- team-practices: `memory/team.md`、`memory/project.md`、`memory/phases/inception.md`
