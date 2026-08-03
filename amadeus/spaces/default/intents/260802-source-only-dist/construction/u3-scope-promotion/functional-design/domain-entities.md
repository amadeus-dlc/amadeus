# Domain Entities — u3-scope-promotion

上流入力(consumes 全数): component-methods(C6 契約)、requirements(FR-0)、components(C6)、unit-of-work(u3)、unit-of-work-story-map(Slice 2)、services(該当外部なし)。

## 対象エンティティ(既存型の再利用 — 新型なし)

本 Unit はデータ移設+タグ付けであり、新しいドメイン型を導入しない(プリミティブを包む判断 — 正しさを変えるラッパーが不要なため新型を作らない)。

| エンティティ | 正本 | 変更 |
|---|---|---|
| Scope 定義(`amadeus-<name>.md` frontmatter: name/depth/keywords) | `packages/framework/core/scopes/` | 5ファイル追加(10→15) |
| Stage frontmatter `scopes:` リスト | `.claude/amadeus-common/stages/**` 相当の core 正本 | self-* / installer-distribution のタグ追加 |
| scope-grid.json | compile 生成物(正本なし) | 導出結果が15キー化 |
| self-scope-consistency センサー manifest | `packages/framework/core/sensors/` | 期待の改訂 |

## 不変条件

1. 全 dist 面・全 dogfood 面の scope-grid.json はキー集合・セル値とも同一(deep-equal)
2. core/scopes のファイル数 = 15(stock 10 + 昇格 5)。dist の各面 scopes ディレクトリも同数
3. composed scope(per-user)の extras は昇格後も merge で生存(BR-U3-6)
