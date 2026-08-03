# Business Rules — u6-allowlist-canonical

上流入力(consumes 全数): requirements(FR-5.2/5.3)、component-methods(C5 契約)、components(C5)、unit-of-work(u6 = FR-5.2/5.3 対応)、unit-of-work-story-map(Slice 2)、services(外部依存なし)。

## ルール一覧

- **BR-U6-1(単一正本)**: allowlist の正本は `packages/framework/core/tools/data/self-install-allowlist.ts` の1箇所。preserved(promote-self.ts:101-114)は import へ置換し重複定義を削除。`.gitignore` / `.gitattributes` に三重目の独立定義を作らない
- **BR-U6-2(区分の3値)**: tracked(追跡 **5件**+dispatcher — git ls-files 実測)/ preservedRuntime(promote 保存だが未追跡 **5件** — うち `.codex/hooks.json` は gitignored per-clone runtime、`.codex/local/` は ignore 未登録で u8 にて規則新設要)/ perUserPatterns(regex 4本 byte 不変移設)の3区分。区分は排他で、`preserved 互換ビュー = tracked ∪ preservedRuntime` が現行10エントリ+dispatcher を完全被覆(帰属は全件 git ls-files / check-ignore の実測で確定 — iteration 1 Critical・iteration 2 Critical/Major の是正)
- **BR-U6-3(整合テストの導入時期)**: .gitattributes 面の実ファイル突合テストは本 Unit で導入・即時有効。.gitignore 面は本 Unit では `gitignoreExpectation` 導出関数+期待集合の単体テストまでとし、**実ファイル突合テストは u8 の切替 PR で導入**(u8 前は検査対象節が不在で vacuous になるため部分テストを作らない)
- **BR-U6-4(落ちる実証)**: 本 Unit では (a) .gitattributes 面 — 故意の不一致注入(1エントリ削除 / 正本へ架空エントリ追加)で赤 (b) gitignoreExpectation — 期待集合の単体テストで架空 tracked エントリ追加が期待パターン差分として赤。u8 では (c) .gitignore 実ファイル突合の落ちる実証(生成物パスの故意 stage)を切替 PR で実施
- **BR-U6-5(深さ制約の機械検査)**: allowlist の .gitignore 否定パターンは深さ1限定+深さ2(dispatcher)の階層再包含。実効性は `git check-ignore` の実測で検証(パターン文字列の目視でなく)
- **BR-U6-6(交差申告)**: 本 Unit は promote-self.ts の preserved(:101-114)と regex 定義(:124-125/:178-179)を編集する。u5 と同一ファイルのため bolt-plan の直列化(本 Unit 先行 = Bolt 4 → u5 = Bolt 5)に従う。**u4 との交差はない** — u4 の編集面は `.claude/settings.json` と dispatcher 実体のみで、promote-self.ts / .gitignore / .gitattributes に触れない(dispatcher パスを本 Unit の tracked データに載せるのはデータ定義であり、u4 側ファイルとの交差ではない)

## 受け入れ基準との対応

| BR | requirements AC |
|---|---|
| BR-U6-1/2 | FR-5.2(正本1箇所+preserved import)/ 受け入れ「allowlist 正本が1箇所」 |
| BR-U6-3/4 | FR-5.2(整合テスト・落ちる実証)/ G8 |
| BR-U6-5 | FR-5.3(深さ制約) |
| BR-U6-6 | bolt-plan の c6 直列化 |
