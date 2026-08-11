<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-11T07:10:00Z — Comprehensive 戦略でも、performance/security の指示書は「適用の有無」を先に判定して書く。FR-CBG-14 の 30s は数値目標として実在するが、CI step の `timeout 30s` が本番経路でそれ自体を強制しているため、同じ閾値を別スイートで二重に測っても新しい情報が出ない。目標なきベンチマークは検証劇場、無言の省略は黙示の欠落 — 適用の有無と根拠、将来この判定を覆すべき条件を明記することで両方を避けた。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-11T07:10:00Z — 初回フルスイートが 7 files / 36 assertions で赤くなった。conductor 自身がフルスイート走行中にゲートの実測(16,798 ファイル走査 × 2回、159.4 MiB 読取)を並行実行しており、負荷要因を作っていた。3点対照(並行=赤 / 単独=緑 / 負荷なしフル=緑)で自変更由来でないことを確定させ、負荷ゼロで再実行して PASS を得た。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-08-11T07:10:00Z — 赤の帰属を「既知パターンと一致するから負荷起因」で済ませず、単独再実行と負荷なしフル再実行の2手を追加で払った。フルスイート1回あたり10分前後かかるが、実測なしに環境起因と断定するのは検証劇場になるため、時間を払う側を選んだ。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-11T07:00:00Z — サブエージェントの最終テキスト配送がこのセッションで構造的に不安定だった: 5体中、reviewer-1/reviewer-2 は OAuth 失効で停止(成果物はディスクに残存)、cg-reviewer-i1/i2 は idle 通知後の明示要求で回収、closure-verifier は5回の idle 返しで一度も verdict を返さず停止させた。transcript も期待した task ディレクトリに現れなかった。閉包検証は conductor が引き取り(差分検分と検証コマンドの再実行を自分で実施)、その過程で委任先が指摘するはずだった以上の欠陥(測定 ref の失効・t222 数値の陳腐化)を自力で検出・訂正した。委任は verdict の所有を移さないという原則が、配送不能時の退避経路としても効いた。
