# Code Generation Plan — U5 authoring-stage-e2e(Bolt 6、バッチ 4)

上流入力(consumes 全数): U5 の functional-design(business-rules.md / domain-entities.md)、nfr-design(security-design.md)、unit-of-work.md U5 節、requirements.md FR-002 / FR-009 / FR-012 / AC-007。business-logic-model.md は U5 が spec kind のため FD 非該当で不在(nfr-design-questions.md の 0 件判定に記録済みの設計どおりの欠落 — 内容を発明しない)。

## 実装ステップ(受け入れ基準の述語を逐語で写す)

1. stage 文書 `plugins/formal-model-check/stages/tla-authoring.md`: 既存 plugin stage 様式(frontmatter + Steps + Sensors + Learn)に従い新様式を発明しない(BR-U5-07)。手順6節は domain-entities.md の手順契約表と 1:1。FD レビュー FOLLOW-UP 2点を反映 — 登録節の「U1 bundle build → U1 bundle verify(VerifiedBundle ブランド型)→ U4 commit」明示、terminal route(impl-only / non-target)拒否の ADR-7 申告付き追加。各工程の失敗時挙動(referee typed failure 全数提示 halt / NOT-READY 差し戻し / 承認なし不進行 / 未登録 halt)を明記(BR-U5-02/05)。reviewer read-only(BR-U5-03)、ReviewReceipt.modelAuthor 省略不能(BR-U5-04)、ReductionManifest の invariant ごと vacuity witness + declaredIdentity(BR-U5-06)
2. E2E fixture `tests/fixtures/tla-authoring-unit-pool/requirements.md`: 未知題材 = swarm unit-pool ライフサイクル(FR-012 の Given)。U1 C2 の見出し駆動文法(### FR-nnn / ### AC-nnn)で抽出可能な形(BR-U5-10 — 実抽出 regex `REQUIREMENTS_HEADING_RE` との照合)
3. E2E テスト t450: 要求入力 → C1 適用判定(author-new)→ C7 authoring → C3/C5 referee → 独立レビュー(スタブ — BR-U5-11 の owning test 前提をコメント明記)→ 人間ゲート(記録済み承認 fixture)→ C4 bundle build/verify → C6 登録 → **既存 formal-model-check 実行(runModelCheck を dependencies 注入で実行)→ 相関 verdict** の全経路(BR-U5-08 — 部分経路 green の読み替え禁止)。composed runtime(配布面)で実行し missing import ゼロを実測(BR-U5-09)。fail-closed 2系(BR-U5-14): witness 欠落 manifest での referee halt(ND 申し送りの採用)+ 承認欠落での登録拒否(map 不変の非自明 assert)
4. plugin.json の stages 宣言 2-stage 化と既存 plugin 検査テスト(lifecycle / stage-discovery)の最小追随
5. TDD: 実行可能な検証は Red→Green。文書のみの面は既存テスト前後 green + 文書検査で代替(tdd-default-with-narrow-exceptions 適用外(1)の申告)
6. 検証: typecheck / lint / t450+siblings / full CI / coverage patch gate / build + 追跡差分なし を worktree solo で完走

## 品質規約

spec kind(stage 文書 + fixture + E2E テスト)— 本番コードへのテスト分岐を置かない(テストシームは既存 dependencies 注入のみ)。CI に実 TLC 依存を混入させない(fake toolchain 注入 = t447 既習手法)。
