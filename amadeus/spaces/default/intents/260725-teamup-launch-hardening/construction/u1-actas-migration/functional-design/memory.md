<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T14:10Z — 本ユニットに業務ドメインは存在しない。functional-design の3成果物は「起動オーケストレーションが扱う実体と手順」として書いた。domain-entities の主目的は**所有境界の明示**(team-up.sh が所有する member/role/prompt vs agmsg が所有する delivery mode/watcher/sentinel/actas ロック)であり、本ユニットが変えるのは左側だけであることを構造的に示した。
- 2026-07-25T14:10Z — INV-3(プロンプト形の ' actas ' の有無は role に依存しない)を明示的な不変条件として立てた。ADR-2 の代表 role 判定はこれに全面的に依存しており、破れると watcher_verification_applies の判定が壊れる。BR-5 としてテストで固定する。
- 2026-07-25T14:10Z — INV-5(delivery mode が monitor/both でなければ actas プロンプトを送っても watcher は起動しない)は本ユニットの成立条件。feasibility の実験1(未設定→sentinel 出ず)と実験2(設定済み→T+32.2秒 で出現)の対照がその実証であり、BR-19(delivery.sh set monitor の呼び出しを維持)がこれを満たす。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T14:10Z — optional produces の frontend-components.md は UI 非該当のため**意図的に生成しない**。produces の実在確認で「必須3件が存在」「optional 1件が不在」の両方を機械確認した(cid:code-generation:produces-ls-check-after-generation の追補 = conditional 非該当の optional が残存していないことも assert する)。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-07-25T14:25Z — §12a reviewer iteration 1 が Major 1件・Minor 1件を検出。
  (1) Major: BR-18 の消費者棚卸しが t294-team-up-watcher-applicability.test.ts:53(printf '%s' "$CLAUDE_MONITOR_PROMPT")を取りこぼしていた。**原因は上流 component-methods.md の表をそのまま複製し、独立 grep を怠ったこと**。同一 intent でこの棚卸しは既に2回是正されており(application-design iteration 1 で t294 全体、iteration 2 でリテラルキー)、これで3度目。是正として棚卸し表を **grep 出力からの転記**で作り直し(キー1 13行・キー2 6件)、上流にも :53 を追加して「必ず grep 出力から転記する」注記を付けた。
  (2) Minor: 主フロー表に start_safety_wait_supervisors(:1482)が抜けていた。検証と mux_attach の間に挟まるため、手順7の移動時に見落とすリスクがある。RUNTIME=claude では即 return するが手順 7.5 として明記した。
- 2026-07-25T14:25Z — 3度の是正で共通する失敗様式は「既存の表を信頼して複製する」ことだった。列挙は毎回コマンド出力から作り直すべきで、これは cid:requirements-analysis:numbers-from-command-output-only(数値はコマンド出力からの転記のみ)の**列挙面**にあたる。

## Tradeoffs
- 2026-07-25T14:10Z — business-rules を22件と細かく分けた。テストで固定すべき不変条件(BR-5 / BR-7 / BR-18)と、実装の自明な帰結(BR-2 / BR-22)が混在するが、後者も「変えない」ことを明示する価値があるため残した。特に BR-16(WATCHER_RESEND_MAX は 1 のまま)と BR-19(delivery.sh set monitor を維持)は、消し忘れではなく意図的な保存であることを記録する必要がある。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T14:10Z — BR-14(回復ガイダンスはメンバーごとに実行すべきプロンプトを示す)の出力形が未確定。現行は単一文字列を1行で出すが、role ごとに異なるプロンプトを複数行で出すか、メンバー名とプロンプトの対で出すかは code-generation の実装時判断とした。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
