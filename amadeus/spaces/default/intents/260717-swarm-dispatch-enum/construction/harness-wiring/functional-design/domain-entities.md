# Domain Entities — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## エンティティ(本 unit は prose 配線が主 — 新規型なし)

- 消費する型: U1 の `DriverResolution`(JSON 経由 — SKILL prose は `kind`/`driver`/`requested` を読む)
- retry identity の概念モデル: `unit slug`(永続・record 由来)⇔ `child`(session-local・使い捨て)。対応の真実源は worktree 状態(コミット)であり、メモリ上の対応表を契約にしない(セッション再起動で消える情報に依存しない — C-18 の session-local 制約の明示)

## 不変条件

- 1 worktree に書けるのは当該 unit の現行 child のみ(c2 規律+referee アンチタンパーで担保)
- SKILL prose は resolve の JSON 以外から driver を導出しない(prose 単独判定の復活禁止 — C-16)
