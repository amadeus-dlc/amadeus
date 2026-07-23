# Domain Entities — U2 election-promotion

> 上流入力(consumes 全数): components(C2/C3)、component-methods(C2 の既存 export 面)、requirements(FR-1d の契約不変)、unit-of-work(U2)、unit-of-work-story-map、services(該当なし)

## 型の変更

**なし** — U2 は移動 Unit であり、既存の選挙ドメイン型(Election / Ballot / Goa / TimelineEvent 等 — amadeus-election-model.ts の既存定義)を一切変更しない(NFR-2)。型の所在パスのみが scripts/ → core/tools/ へ変わる。

## 参照面の追随対象(実装時の全数棚卸し起点)

| 消費側 | 追随内容 |
|---|---|
| tests/(t234〜t244 — 番号域に t243 post-complete-audit-stop を含む選挙系全ファイル) | import / spawn パスの新正本化 |
| SKILL.md | {{HARNESS_DIR}}/tools 形へ(BR-3) |
| .claude/skills/amadeus-election(self-install 面) | promote:self 再生成で自動追随(手編集禁止) |
| docs / knowledge の scripts/amadeus-election 言及 | 実装時 grep で棚卸しし、現存すれば U5(docs)へ回付 |

## frontend-components について

UI なしの CLI Unit のため frontend-components.md は生成しない(CONDITIONAL 非該当 — 生成後に不在を確認)。
