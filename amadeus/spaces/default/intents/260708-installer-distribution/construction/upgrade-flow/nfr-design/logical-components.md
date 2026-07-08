# Logical Components — upgrade-flow

> ステージ: nfr-design (3.3) / Unit: upgrade-flow / 作成: 2026-07-08
> 出典: `../functional-design/domain-entities.md`、`../nfr-requirements/tech-stack-decisions.md`(新規技術なし)、U1/U2 nfr-design/logical-components.md(レイアウト継承)

## ソースレイアウト追加分(packages/setup/src/ — U1/U2 レイアウトへの増分)

```
src/
  domain/
    upgrade.ts           #   UpgradeAssessment + UpgradeOutcome(+NonProceed) + UpgradeRefusal + UpgradeSource + LegacyLayout
    plan.ts              #   (U2 定義に)Plan.forUpgrade を本 Unit で追加(U2 で予告済みの拡張点)
  modules/
    (新規ファイルなし)    #   applier/verifier/reporter/wizard は U2 実装を共有。upgrade 固有ロジックは domain/upgrade.ts のコンパニオン+cli の runUpgrade 分岐に閉じる
  cli.ts                 #   runUpgrade を追加(main のディスパッチは U2 で定義済み)
```

- **新規モジュールゼロ**が U3 の設計上の特徴: 差分は domain 層(判断の追加)と cli のオーケストレーション分岐のみ。tech-stack-decisions の「新規技術の不採用宣言」と対応
- ClassifiedError の合流(UpgradeRefusal)は domain/command.ts の型定義更新(U2 是正で宣言済み)— 実装ファイルの移動なし
- 依存方向は U1/U2 の規律を継承(upgrade.ts → plan.ts/installation.ts/manifest.ts は import type 中心、ファクトリ値インポートは同層内)
