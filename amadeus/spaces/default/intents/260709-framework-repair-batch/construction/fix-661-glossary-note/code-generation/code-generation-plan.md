# Code Generation Plan — fix-661-glossary-note

> Bolt: `fix-661-glossary-note` / Issue: [#661](https://github.com/amadeus-dlc/amadeus/issues/661) / 要件: FR-661(requirements.md)
> docs のみの変更。回帰テスト新設なし(Q7=A)。既存スイートのグリーン維持のみ。

## 設計方針

AI-DLC v1 本家(Bolt = sprint 相当のタイムボックス、Unit ⊇ Bolt)と本実装(Bolt = deployable slice、Bolt ⊇ Unit)の用語差を「意図的な逸脱」として明文化する注記を追加する。既存の定義文言そのものは変更しない(注記の追加のみ)。注記の趣旨文(canonical、これを一次ソースに他所は文脈に合わせ短縮可): 「Note: AI-DLC v1 の方法論では Bolt は sprint 相当のタイムボックス(Unit of Work が複数の Bolt にまたがる)を指すが、本実装では Bolt を deployable slice(1つ以上の Unit を包む出荷単位)の意味で用いる — 意図的な用語の転用である」。EN 側ファイルには英文で、JA 側には和文で記す。

## 対象5箇所(実測済みパス、Q5=C)

1. canonical: `packages/framework/core/amadeus-common/protocols/stage-protocol.md` の Glossary(Bolt 定義行、657行付近)
2. `packages/framework/core/amadeus-common/stages/inception/delivery-planning.md` Step 3 グロッサリー(「A Bolt wraps one or more Units of Work」の箇所)
3. `docs/guide/glossary.md` の Bolt エントリ(L14)— 英語
4. `docs/guide/glossary.ja.md` の Bolt エントリ — 日本語
5. `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md`(L58 の Bolt 定義引用部)

補足: 上記以外に Bolt を「定義」している docs ページが grep で見つかった場合(対応 EN/JA ペア含む)、同種の注記を追加し code-summary.md に追記箇所として記録する(伝播漏れ防止 — team.md functional-design:c3 学習)。

## Steps

- [ ] Step 1: `grep -rn "Bolt" docs/ packages/framework/core/ --include="*.md"` で定義箇所を棚卸しし、対象一覧を確定(上記5箇所+発見分)
- [ ] Step 2: canonical(stage-protocol.md Glossary)に注記を追加
- [ ] Step 3: 残り4箇所+発見分に注記を追加(EN ファイルは英文、JA ファイルは和文)
- [ ] Step 4: `bun scripts/package.ts` + `bun run promote:self` で core 変更を dist/セルフインストールへ同期(stage-protocol.md 等は配布物)
- [ ] Step 5: diff レビュー — 既存定義文言が無変更で注記のみ追加されていることを確認(FR-661 合否基準)
- [ ] Step 6: 検証コマンド一式: `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci`(グリーン維持のみ、新規テストなし)

## 制約

- 既存文言の意味・定義を変更しない(注記追加のみ)
- 本家 v2 実装への上流報告(Issue の選択肢3)はスコープ外 — 必要なら別途 Issue
- 正本→生成物の同期を同一コミットに含める(NFR-1)
