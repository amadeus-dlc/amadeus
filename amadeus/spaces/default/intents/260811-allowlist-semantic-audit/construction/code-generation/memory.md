<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-12T00:05:00Z — OQ-1(機械述語と人手の境界)/ OQ-2(閉じた語彙)の解を計画で確定した。`reason` の主張を**構文クラス**として AST で機械判定し、5 クラス(`type-only` / `catch-arm` / `dispatch-case` / `spawn-only` / `unmeasurable-other`)へ閉じる。人手 adjudication へ回すのは `転位` のみ、`判定不能` は FR-3 の書き換え対象とする
- 2026-08-12T00:20:00Z — ユーザー裁定により方針は「**規約を先に定めて台帳を合わせる**」(2026-08-12)。当初の Q1=C(全数照合)/ Q3=B(規約化+書き換え)の方向を維持し、抽出規則を台帳の現行語法へ寄せる案は採らない

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-12T00:18:00Z — builder が**停止条件(転位 100 件超)に触れて実装を停止**し、conductor へ差し戻した(`cid:build-and-test:no-silent-scope-narrowing` に従い独断でスコープを縮小しなかった)。実測: 623 = 一致 39 + 転位 167 + 判定不能 417(恒等式は t535 で機械 assert、数値は `gen-classification.ts` の出力 `{"total":623,"counts":{"一致":39,"転位":167,"判定不能":417},"sum":623}` からの転記)

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-12T00:19:00Z — **転位 167 件の大半(125 件)は台帳の腐敗ではなく conductor が指定した述語定義の誤りだった**。台帳は「`handleNext` is a process-bound dispatcher, so Bun does not attribute its spawned execution to parent LCOV」のように **spawn 到達性**を主張しているのに、計画が指定した `spawn-only` 述語は「対象行が `import.meta.main` 分岐または `main` 本体の**内側**」という**構文上の包含**を要求した。台帳の主張は正しく、述語が現実の語法をカバーしていなかった。すなわち分類器は「台帳の腐敗」ではなく「抽出規則と台帳の語法の不一致」を主に測っていた
- 2026-08-12T00:19:30Z — 同様に `判定不能` 417 件のうち 346 件(クラス宣言なし)も、実サンプルでは `reason` が「These lines contain only the multiline TypeScript input type」と正しく述べ実クラスも `type-only` で一致している例が多い。抽出器が定型キーワードでの宣言を要求したため拾えなかっただけで、意味的には正しい可能性が高い。**623 件中 584 件が不一致に見えたのは台帳がそれだけ壊れているからではない**
- 2026-08-12T00:20:30Z — 上記を踏まえユーザーへ実サンプル(5 パターン: 支配パターン A / 関数名不一致 B / 型 C / 判定不能 D / 一致 E)を提示して裁定を仰いだ。裁定は「規約を先に定めて台帳を合わせる」。**抽出規則を台帳の現行語法へ寄せる案(選択肢 2)は採らない** — 台帳の記述を機械検査可能な形へ移すこと自体が Q3=B の目的だったため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-12T00:21:00Z — 規約準拠への書き換えは 623 件中 584 件に及ぶ。`reason` の情報量を落とさずクラス宣言を足す形にするか、定型のクラス宣言 + 自由記述の 2 部構成にするかは Step 5 の設計事項
