# Functional Design: ドメインエンティティ — U5 authoring-stage-e2e

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

本書は `unit-of-work.md` の U5 定義(C7 AuthoringStage — plugin stage 文書 + 未知題材 E2E fixture)のエンティティ(= stage 文書の構造要素と E2E fixture の構成物)を確定する。U5 は spec kind であり、コード API ではなく **stage 文書契約と fixture 構成**がエンティティの実体である(`components.md` §C7「C7 はコード API ではなく stage 文書 + conductor protocol の組」)。要求根拠は `requirements.md` FR-002/FR-009/FR-012/AC-007、設計根拠は `component-methods.md` §C7 の手順契約表、`services.md` §S2(進行の所有者は S2 ただ一つ)。

## 構成要素一覧

| 要素 | 実体 | 所有 | 責務 |
|---|---|---|---|
| `AuthoringStageDoc` | `plugins/formal-model-check/stages/tla-authoring.md` | C7 | stage protocol 準拠の authoring 手順文書(配布物) |
| `AuthoringWorkPlan` | stage 実行時の作業計画 | C7 | route 受領後の author / revise 作業の計画(ApplicabilityReceipt が起点) |
| `ModelDeliverables` | `.tla` / `.cfg` / reduction manifest / trace rows | C7(作成)| authoring 作業の成果物束(評価は U3、格納は U1、登録は U4) |
| `ReductionManifest` | JSON ファイル | C7(作成)| 縮約項目 + 意味保存対応 + invariant ごとの vacuity witness + declaredIdentity(U3 の評価入力) |
| `ReviewReceipt` | JSON 値 | C7 の独立レビュー段(生成)| reviewer / **modelAuthor** / verdict / reviewedAt / artifactDigests(U4 が消費) |
| `HumanApprovalRef` | JSON 値 | C7 の人間ゲート段(生成)| 実 HUMAN_TURN の provenance(U2 と同形。U4 が二重照合) |
| `E2eFixture` | テスト fixture 一式 | U5 | 未知題材(swarm unit-pool ライフサイクル)の要求断片 + 期待成果物骨格 |

## AuthoringStageDoc(C7 stage 文書)の構造契約

stage 文書は既存 plugin stage の様式(`plugins/formal-model-check/stages/` の既習形式 — frontmatter + Steps + Sensors + Learn)に従い、次の手順節を必須とする(`component-methods.md` §C7 の手順契約表と 1:1):

| 節 | 内容 | 失敗時挙動(文書に明記) |
|---|---|---|
| route 受領 | C1 の ApplicabilityReceipt(route = author-new / revise-model)を入力に作業計画を作る | receipt 欠落は開始拒否(component-methods §C7 どおり)。**terminal route(impl-only / non-target)での開始拒否は本 FD の申告付き追加** — terminal 経路は authoring 作業を持たないため(ADR-7) |
| author / revise | requirements + design 成果物から named invariant を導出し ModelDeliverables を作成。ReductionManifest には invariant ごとの vacuity witness と declaredIdentity(現在 identity)を必ず宣言する(U3 の proof 5 条件の評価入力 — witness 未宣言は vacuity 不成立、declaredIdentity 欠落は identity-binding 不成立として U3 が拒否) | — |
| referee 実行 | U3 の `trace` / `proof` CLI を実行し CoverageProof / ProofEvidence を得る | typed failure は全数を人間へ提示し halt(成功へ暗黙変換しない) |
| 独立レビュー | モデル作成主体と別の独立 reviewer(read-only 許可)が全 authoring 成果物をレビューし ReviewReceipt を生成。**modelAuthor フィールドには authoring 作業の実行主体名を記入する**(U4 の独立性検査の比較基準 — U4 FD からの引継の確定) | NOT-READY は builder へ差し戻し |
| 人間ゲート | レビュー済み成果物を人間へ提示し、明示承認の実 HUMAN_TURN から HumanApprovalRef を構成 | 承認なしで先へ進まない(FR-009) |
| 登録 | U1 `bundle build`(full authoring bundle)→ U1 `bundle verify`(VerifiedBundle の取得 — U4 `commit` は verify 通過のブランド型のみ受理するため省略不能)→ U4 `commit` | 未登録のまま halt(FR-010) |

- reviewer は read-only 許可(Read/Grep/Glob 相当)で実行し、engine 操作・成果物書込を持たない(`memory/project.md` の read-only サブエージェント規律、`components.md` §C7)。
- stage の起動強制・下流停止は C7 自身が持たない — U2(C9)+ engine checkpoint の責務(`services.md` §S2/§S7 の分離)。

## E2eFixture(FR-012 未知題材)

- **題材**: swarm unit-pool ライフサイクル(acquire → confirm-dispatch → settle-release → reconciliation。`amadeus-swarm.ts` の fixed pool protocol)— `unit-of-work.md` U5 の Q3 人間裁定。`FormalElection` / `MirrorLifecycle` のどちらでもない未知題材(FR-012 の Given)。
- **構成**: (1) 要求断片 fixture(unit-pool の状態遷移・不変量を FR/AC 様式の stable ID 付き markdown で記述 — U1 C2 の見出し駆動文法で抽出可能な形)(2) 期待成果物の骨格(named invariant 候補・trace rows の雛形は E2E 実行時に authoring 経路が生成するため、fixture 側は入力面のみを固定)。
- **E2E の実行経路**: 要求入力 → C1 適用判定(author-new)→ C7 authoring → C3/C5 referee → 独立レビュー → 人間ゲート → C4 bundle → C6 登録 → 既存 `formal-model-check` 実行 → 相関 verdict(FR-012 の全経路)。composed runtime で実行し missing import ゼロを併せて実測する(AC-007 — U6 guard が一次担保、E2E が補完検証)。
- **判定の主体**: E2E の合否実測は build-and-test stage が受け入れ主体(`decisions.md` 末尾注記の合意)。U5 の成果物は stage 文書と fixture であり、判定はしない。

## 上流トレーサビリティ

- `unit-of-work.md`(U5 定義・境界・実装注意)、`unit-of-work-story-map.md`(FR-002/FR-009/FR-012 主担当、AC-007)
- `requirements.md`(FR-002、FR-009、FR-012、AC-007、NFR-006)
- `components.md` §C7、`component-methods.md` §C7(手順契約表)、`services.md` §S2/§オーケストレーションパターン
- `functional-design-questions.md`(0 件判定、人間承認 2026-08-04T22:33:20Z)
