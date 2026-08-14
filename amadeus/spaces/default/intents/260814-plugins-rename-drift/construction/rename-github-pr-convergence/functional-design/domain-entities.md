# Domain Entities — rename-github-pr-convergence

上流入力: `business-logic-model.md`(決定表)、`business-rules.md`、`unit-of-work.md` U1、`requirements.md` FR-REN、`components.md` C1、`component-methods.md`(不変契約)、`services.md` F3。

本 Unit は挙動不変の packaging であり、新規ドメインエンティティは導入しない。関与する既存エンティティと属性の変化のみを記録する。

## 関与エンティティ

### PluginManifest(既存 — name 属性のみ変更)

- `name`: `"pr-convergence"` → `"github-pr-convergence"`。他フィールド(stages/seams/fragments/sensors/tools)は不変。
- 不変条件: name = ディレクトリ名(compose :344)。

### ScopeBindings(既存 — 外側キーのみ変更)

- 外側キー(プラグイン名): `"pr-convergence"` → `"github-pr-convergence"`(amadeus-graph.ts:2303 のパス第2セグメント導出と一致させる)
- 内側キー(ステージ slug)`"pr-convergence"` と値(4 スコープ配列)は不変。
- ライフサイクル: graph compile 時に消費(:1513)。キー不一致は無音脱落 — R4 のテストが検出面。

### PluginActivationNames(既存 — 要素値のみ変更)

- 配列要素 `"pr-convergence"` → `"github-pr-convergence"`。不一致は doctor が loud(source-missing → degraded)。

### 検証エンティティ(新規テストの被検面)

```
ScopeGridInvariant = { stage: "pr-convergence", expectedScopes: ["self-document","self-feature","self-fix","self-refactor"] }
```

- scope-grid 検証テストが compile 出力からこの不変量を assert する(比較は compile 実行結果由来 — 検証劇場禁止)。
