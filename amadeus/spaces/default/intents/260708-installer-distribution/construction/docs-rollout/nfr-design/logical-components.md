# Logical Components — docs-rollout

> ステージ: nfr-design (3.3) / Unit: docs-rollout / 作成: 2026-07-08
> 出典: `../functional-design/domain-entities.md`(変更対象表)、`../nfr-requirements/tech-stack-decisions.md`、U1〜U4 nfr-design/logical-components.md

## 変更対象(コード追加なし — 既存ファイルの編集と再生成のみ)

```
README.md                                        # 導入セクション刷新(FR-014 の4要素)
CHANGELOG.md                                     # 新見出し
packages/framework/core/tools/amadeus-version.ts # AMADEUS_VERSION バンプ
package.json(root)                              # I1/I2 是正(3フィールド最小 diff)
dist/**、.claude/** ほか                          # bun scripts/package.ts / promote:self による再生成(手編集しない — Forbidden)
docs/guide/15-troubleshooting.md                 # cp -r 手順の移設先(既存ファイルへの追記)
```

- 新規ファイル・新規コードなし。再生成物は必ずスクリプト経由(dist 手編集の Forbidden を構造で回避)
