# Domain Entities — u1-autonomy-core

上流入力(consumes 全数): requirements.md(FR-2)、components.md(C2/C3)、component-methods.md(シグネチャ方向)、unit-of-work.md(u1 境界)、unit-of-work-story-map.md(u1 の物語3行 — 一貫可視/理由可読/preview 事前把握 — をエンティティの存在理由に)、services.md(同期 emit・append-only 契約をイベント不変条件に採用)。補助参照: component-dependency.md(6読み手表)、decisions.md(ADR-2/ADR-3)。

## 既存エンティティ(変更対象)

### AutonomyProjection(`amadeus-intent-autonomy.ts` — 変更なし)

canonical な認可状態。mode / modeProvenance / currentGrant / autoDecisions / projectionRevision。u1 は投影の**消費と反映**を変えるが型は不変。

### ProductionAutonomyContext(`amadeus-intent-autonomy-production.ts:89` 周辺)

`autoApprove: boolean` と `authorizationReason`(現状ゼロ消費 — RE finding 2)を運ぶ。**変更**: `authorizationReason` が refusal イベント emit の入力になる(消費点の新設 — フィールド自体は既存)。

## 新設エンティティ

### AutonomyRefusalEvent — イベント名 `INTENT_AUTONOMY_HUMAN_REQUIRED`(本 FD で確定 — ADR-2 の委譲を受けた確定。既存語彙 `INTENT_AUTONOMY_TRANSACTION_COMMITTED` と同一の `INTENT_AUTONOMY_` プレフィクス規約に整合。Review iteration 1 NIT 是正)

| 属性 | 型 | 意味 |
|---|---|---|
| Interaction Kind | `InteractionKind`(4値) | 拒否された occurrence の種別 |
| Stage slug | string | 発生ステージ |
| Reason | `"SCOPE_OUT" \| "MODE_REQUIRES_HUMAN"` | 2値のみ(`AUTHORITY_BOUNDARY` は不存在 — finding 3) |
| Mode | `AutonomyMode` | 判定時点の mode |

- 不変条件: 認可判定の結果を変えない(観測のみ)。audit append-only。schemaVersion は現行 audit 契約に従う
- 発行点: `productionStageAutonomy` の `autoApprove === false` 分岐(`:227-231`)の1箇所のみ(canonical 1定義)

### StateAutonomyFields(state 3フィールドの書込値オブジェクト — 私有)

`Intent Autonomy Mode`(mode 逐語)/ `Intent Grant`(grantId or 空)/ `Construction Autonomy Mode`(スケジューリング投影: full→autonomous、semi/none→gated)。**書き手は `applyProductionAutonomyMode` のみ**(ADR-3)。読み手6系統は component-dependency.md の FR-2d 表が正本。

### PreviewNonAutoKinds(preview 出力拡張)

`nonAutoDecidedKinds: InteractionKind[]` — semi = `["phase-gate","walking-skeleton"]`(= ALL_INTERACTIONS − SEMI_ROUTINE_INTERACTIONS の導出値、手書き複製しない)、full = `[]`。
