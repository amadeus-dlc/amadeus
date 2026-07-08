# Logical Components — publish-readiness

> ステージ: nfr-design (3.3) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../functional-design/domain-entities.md`(PackContract/PackReport)、`../nfr-requirements/tech-stack-decisions.md`、U1〜U3 nfr-design/logical-components.md

## 配置(コードは tests/ と docs/ のみ — src/ への追加なし)

```
tests/lib/
  setup-pack-contract.ts          # PackContract/PackReport/ContractVerdict の単一定義(テスト支援共有モジュール —
                                  # 既存の tests/lib/ 慣習に従う。BR-P02 の単一ソースを2テストファイル間で成立させる置き場所)
tests/integration/
  setup-pack-contract.test.ts   # 契約検査+変異フィクスチャ(describe 同居 — REL-P02)。tests/lib から import
  setup-files-drift.test.ts     # package.json files ≡ PackContract.declaredInFiles のドリフト。tests/lib から import
docs/guide/
  publishing-setup.md             # 手順書(章立ては functional-design ワークフロー2)
packages/setup/
  package.json                    # メタデータ確定(license/repository/files/bin/engines.node >= 18.3)
```

- テスト命名は既存の `t<NNN>-` 規約に合わせて実装時に採番(ここでは仮名)。既存 integration 層へ同居し新規ランナー・ジョブなし(BR-P04)
- PackContract は**テスト側の語彙**であり src/ に置かない(本番 CLI の表面積を増やさない)。テストファイル間の共有は `.test.ts` 相互 import(リポジトリに前例なし)ではなく **tests/lib/ の共有モジュール**で行う — functional-design の「tests/ 配下に置く」宣言の精密化(単一定義の物理的な置き場所を確定)

> 追補(§12a コードレビュー 2026-07-09): テストファイル名は仮称の `t-` プレフィックス形でなく、tests/integration/ の既存慣習 `setup-*.test.ts` に整合させた実装名で確定(レビュアーが実測で妥当性確認)
