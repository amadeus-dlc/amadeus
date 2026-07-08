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
    (新規ファイルなし)    #   verifier/reporter/wizard は U2 実装を無改修で共有
    applier.ts           #   **修正対象(新規ファイルではない)**: backup-then-copy エントリ処理に SEC-U01 の
                         #   `.bk` 事前存在チェック(fs.access → 存在時 ApplyFailure(operation:"backup"))を追加。
                         #   共有実装のため install 経路にも同チェックが効く — 既存 `.bk` が残る対象への
                         #   --force install で退避衝突が ApplyFailure になるのは**意図した安全側の副作用**として許容
    wizard.ts            #   **修正対象(新規ファイルではない)**: 内部の summary ヘルパーを `parsed.subcommand` で
                         #   文言分岐させる(install 向け固定文言 → install/upgrade 別文言)。呼び出しシグネチャ
                         #   runWizard(parsed, missing, tty) は不変 — parsed に subcommand が既存するため引数追加なし
                         #   (U3 functional-design の「確認文言のみ upgrade 用」の実現方法)
  cli.ts                 #   runUpgrade を追加(main のディスパッチは U2 で定義済み)
```

- **新規モジュール(ファイル)ゼロ、修正は applier.ts / cli.ts / wizard.ts の3箇所**が U3 の設計上の特徴: 差分は domain 層(判断の追加)+cli 分岐+applier の SEC-U01 チェック+wizard の文言分岐に閉じる。tech-stack-decisions の「新規技術の不採用宣言」と対応
- ClassifiedError の合流(UpgradeRefusal)は ~~domain/command.ts~~ **modules/reporter.ts** の型定義更新(§12a U3 レビューで実体位置の文書誤りを確認 — command.ts に ClassifiedError は定義されていない)— 実装ファイルの移動なし
- 依存方向は U1/U2 の規律を継承(upgrade.ts → plan.ts/installation.ts/manifest.ts は import type 中心、ファクトリ値インポートは同層内)
