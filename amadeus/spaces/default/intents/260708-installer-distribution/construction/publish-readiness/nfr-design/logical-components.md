# Logical Components — publish-readiness

> ステージ: nfr-design (3.3) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../functional-design/domain-entities.md`(PackContract/PackReport)、`../nfr-requirements/tech-stack-decisions.md`、U1〜U3 nfr-design/logical-components.md

## 配置(コードは tests/ と docs/ のみ — src/ への追加なし)

```
tests/integration/
  t-setup-pack-contract.test.ts   # PackContract/PackReport/ContractVerdict(テスト側語彙をこのファイル内に定義 — 本番 src/ に置かない)
                                  # beforeAll で npm pack --dry-run --json を1回実行し共有
  t-setup-files-drift.test.ts     # package.json files ≡ PackContract.declaredInFiles のドリフトテスト
  (変異フィクスチャは pack-contract テスト内の describe ブロックとして同居 — REL-P02)
docs/guide/
  publishing-setup.md             # 手順書(章立ては functional-design ワークフロー2)
packages/setup/
  package.json                    # メタデータ確定(license/repository/files/bin/engines.node >= 18.3)
```

- テスト命名は既存の `t<NNN>-` 規約に合わせて実装時に採番(ここでは仮名)。既存 integration 層へ同居し新規ランナー・ジョブなし(BR-P04)
- PackContract は**テスト側の語彙**であり src/ に置かない(本番 CLI の表面積を増やさない — U4 functional-design の境界宣言どおり)
