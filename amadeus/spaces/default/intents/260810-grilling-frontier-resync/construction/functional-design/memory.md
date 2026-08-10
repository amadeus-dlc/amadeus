<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-10T07:35:00Z — U3 projection-sweep(kind: packaging)は functional-design の produces_kinds のどれにも該当せず directive の produces が空。成果物ゼロが正しい枝刈りであり未着手ではない(stage frontmatter :19-23 実読)。
- 2026-08-10T07:32:00Z — U2 の刈りノード列挙節の検出述語を見出しレベル非依存と規定。BR-U1-4 は「節」とのみ規定しレベルを定めていないため、U2 がレベルを固定すると U1 の承認済み契約へ存在しない制約を足すことになる(cid:requirements-analysis:c2c5-structural-addition-not-execution)。
- 2026-08-10T09:05:00Z — 【BLOCKER B 裁定・ユーザー裁定】FR-PROTO-8 AC の機械面を「事後検査の落ちる実証」(FR-CONTRACT-4 のマーカー付き超過+記録なし=FAIL 態)と確定。会話時の遮断器発火検証は FR-DOG-1 が担う。申告付き改訂3面: requirements.md FR-PROTO-8(裁定注記)/ unit-of-work.md U2 完了条件(文言差し替え)/ U2 business-rules.md BR-U2-7(充足根拠の明記)。cid:code-generation:c1-external-review-contract-change の是正範囲(上流正本+伝播先)に準拠。
- 2026-08-10T07:33:00Z — 同述語の判定を節の存在のみに限定。FR-PROTO-7 が「空の明示は必要」とする以上、項目数を見る述語は Free の空明示と刈り0件を誤って区別する。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-10T07:30:00Z — engine に --unit セレクタが無く被覆済み unit の directive を再発行できないため、U2 の §12a directive を cid:functional-design:c5-per-unit-directive-template-capture の回収経路で機械置換して得た。置換は unit 名と produces パスのみ。kind 依存フィールドが produces だけであること(consumes に kind 条件 0件)を stage frontmatter :13-35 の実読で機械確認済み。
- 2026-08-10T07:45:00Z — iteration 2 の新規 BLOCKER A(回帰不変の自己矛盾)を、レビュー予算消費後の残余是正として conductor 検証で閉包。cid:nfr-design:c3-fix-induced-blocker-lssads13 の機械検証可能クラス。是正 diff 内の新規引用 amadeus-sensor-question-budget.ts:367-369 は独立再実測で確認(cid:requirements-analysis:fix-diff-independent-reverify)。センサー再発火4件すべて SENSOR_PASSED。

- 2026-08-10T09:20:00Z — BLOCKER B 裁定後の閉包確認限定イテレーション(i3、invocationId 23bddf0a-b9d4-48bf-bacc-e188aba09eca)を実施し READY(GoA 2、残存 BLOCKER なし)。complete-review は「review iteration exceeds the directive limit」で fail-closed 拒否(reviewer_max_iterations=2 消費済み)— cid:code-generation:cg-20260730-3 に従い §12a 正式 verdict は i2 の NOT-READY のまま、閉包確認結果はゲートで開示する。verdict 全文は scratch complete-u2-i3.json に保存。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-10T07:34:00Z — QuestionBudgetFinding へ必須 severity を追加し pass = findings.every(f => f.severity === "warning") とした。optional にすれば stdout JSON の形を保てるが、省略可能フィールドは判別を型で運ばず parse-don't-validate に反する。挙動(超過で pass:false)は保存され変わるのは stdout JSON の形のみ — 現時点の消費者はディスパッチャだけなので受容した。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-10T09:05:30Z — 【解決 2026-08-10】BLOCKER B はユーザー裁定(案1: AC の機械面 = 事後検査の落ちる実証と確定)で解消。Interpretations 09:05:00Z 参照。以下は裁定前の記録として保存。
- 2026-08-10T07:50:00Z — 【裁定待ち・ステージ再開の前提】BLOCKER B: unit-of-work.md:22 が U2 の完了条件に「遮断器発火の落ちる実証(FR-PROTO-8 AC)」を置く一方、component-methods.md:18 は「C3 は遮断器を消費しない」と明記する。U2 が所有するのは C3/C4 のみのため注入面・観測面が構造的に存在せず、承認済み上流成果物どうしが矛盾している。解消案4件(AC の機械面を事後検査の落ちる実証と確定 / 遮断器の機械化を U2 へ追加 / AC の所有を U1 へ移す / スコープ外へ送る)はいずれも承認済み成果物に触れるため、エスカレーション正準リスト(4)によりユーザー裁定事項。裁定後は cid:nfr-design:c3-fix-induced-blocker-lssads13 の設計ギャップクラスとして閉包確認限定の追加イテレーションが必要(予算超過はゲート報告と complete-review summary で開示)。
