<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-05T22:52:00Z — U3 reviewer i1 の BLOCKER(FD エラーモデルに無い「シャード読取失敗」クラス)は是正案 (i) = FD への cross-stage 訂正で解消 — fail-open(行レベル)/fail-loud(シャードレベル=集計続行+exit 非0)/fail-closed(引数)の3方針を「回復可能性×誤診断リスク」の2軸で確定。ND 段の異常クラス発見が FD のエラーモデルを完成させる方向の訂正。
- 2026-08-05T22:52:00Z — U3 の制御文字除去の供給元は observability モジュール所有の export ヘルパに確定 — lib の CONTROL_CHARS と意味論同水準だが定数は共有しない(変更理由が異なるコードは統合しない = 意図ベースの重複排除。lib→observability の import 方向制約により lib 定数の import は循環になるため構造的にも不可)。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-05T22:52:00Z — U3 は reviewer 予算2回消費後も是正起因の新 BLOCKER が残り、E-LSSADS13 に従う閉包確認限定イテレーション(i2b)で READY — 予算超過の開示(FD U2 と同型2例目)。U1 は i1 READY(FOLLOW-UP 即応)、U2 は i2 READY。
- 2026-08-05T22:52:00Z — nfr-design-questions.md は作成せず(Step 3-4 スキップ)— 設計判断は FD で確定済みで真に未決の質問がゼロ、autonomy full 下で質問ファイルのセレモニーだけを作らない(0問様式ファイルも produces 宣言外のため生成しない — produces-ls-check の optional 汚染回避)。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-05T22:52:00Z — U3 のシャード読取失敗は「fail-open で無音続行」でも「fail-closed で全体停止」でもなく fail-loud(続行+非0 exit)を採用 — 診断価値の保持と誤読防止の両立。exit 意味論は4クラス全てを reliability-design の1文で確定。
- 2026-08-05T22:52:00Z — kind 剪定(U1/U2 は2成果物、U3 は5成果物)により U1 の読取コスト所在が消えるため、logical-components に「規模上限不問」の判断を明示して code-generation 段へ引き継いだ。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
