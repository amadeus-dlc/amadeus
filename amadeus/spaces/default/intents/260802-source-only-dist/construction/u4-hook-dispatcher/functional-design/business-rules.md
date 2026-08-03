# Business Rules — u4-hook-dispatcher

上流入力(consumes 全数): requirements(FR-3.2)、component-methods(C3 契約)、components(C3)、unit-of-work(u4 = FR-3.2 対応)、unit-of-work-story-map(Slice 2)、services(外部依存なしの確認)。

## ルール一覧

- **BR-U4-1(薄さ)**: dispatcher は静的表(slug → 実体パス)+実在確認+透過 spawn+不在案内のみ。ロジック・状態・イベント分岐を持たない
- **BR-U4-2(不在時 no-op)**: 実体不在は stderr へ固定文言「amadeus-dispatch: hooks are not built yet (fresh clone?) — run `bun run build` to generate them」を出し exit 0。文言は1箇所の定数(案内の一元管理 — G1 裁定の目的)
- **BR-U4-3(未知 slug は loud)**: 静的表にない slug は exit 1 + 既知 slug 一覧を stderr へ(設定ミスの無音化禁止 — fail-open を作らない)
- **BR-U4-4(透過性)**: stdin passthrough・stdout/stderr 継承・exit code 透過・`env: process.env` 明示(bun-spawn-env-snapshot)
- **BR-U4-5(参照書換の全数性)**: settings.json の hook command 11参照すべてを dispatcher 経由へ書換え、直接パス参照を残さない(grep で 0 件を機械確認)。statusline(:48)は対象外と明記
- **BR-U4-6(落ちる実証)**: (a) 実体を退避した状態で dispatcher が案内+exit 0 (b) 未知 slug で exit 1 — の両側をテストで固定
- **BR-U4-7(静的表の導出)**: slug 表は **settings.json の hook command 11参照から導出される10 slug に限定**する(slug = 参照ファイル名の `amadeus-` / `.ts` を除いた部分 — 命名規約でパスと二重管理しない)。`.claude/hooks/` に実在するが settings.json 未参照の実体(現時点で `amadeus-log-subagent-start.ts` / `amadeus-plugin-compose.ts` — code-structure.md B8)は**本 Unit の対象外**であり、ディレクトリ列挙で静的表へ混入させない(reviewer iteration 1 Major の是正 — 導出源は settings.json 参照集合)

## 受け入れ基準との対応

| BR | requirements AC |
|---|---|
| BR-U4-1/2 | FR-3.2(dispatcher 1ファイル・no-op + build 案内) |
| BR-U4-3/4 | 直接の NFR 出典なし — NFR-3 の fail-closed 精神の Unit 内適用(org.md Mandated の落ちる実証契約に基づく独自 BR。NFR-3 本文の4分類には hook 面は含まれない — 出典性質の明確化) |
| BR-U4-5 | FR-3.2(11参照の書換) + 受け入れ「フック参照が壊れない」 |
| BR-U4-6 | 落ちる実証必須(org.md Mandated) |
