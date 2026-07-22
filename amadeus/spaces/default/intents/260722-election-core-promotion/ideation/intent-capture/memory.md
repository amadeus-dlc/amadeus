<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-22T22:30:00Z — [Deviations] 質問ファイル起草時に [Answer] タグへ推奨値を先埋めしてしまい、コミット前に自己捕捉して全5問を空欄へ是正(election-answer-after-ruling 違反の未遂)。推奨提示はチャット側で行う。
- 2026-07-22T22:30:30Z — [Interpretations] ユーザー宣言「選挙裁定不要・私が答えます」(実 HUMAN_TURN)により、本 intent の質問回答はエージェント選挙を経ずユーザー直接回答で確定する。判定根拠を質問ファイルヘッダに固定(E-OC1 様式)。
- 2026-07-22T22:31:00Z — [Interpretations] 事前壁打ち(同セッション)で裁定済みの6事項は質問対象から除外し「裁定済み事項」節として明記(cid:intent-capture:c1 準拠)。質問は未決判断5問(課題framing/スキル配布範囲/成功定義/トリガー/docs深度)に限定。

- 2026-07-22T22:28:01Z — [Deviations] stage-protocol.md を未読のままステージ本体へ進み、§3 Step 1(モード選択の先行提示)に違反して質問ファイルを事前作成+チャット直接提示した。ユーザー指摘で発覚。是正: プロトコル読了→モード選択質問を正規に提示し直す。事前作成済みファイルはモード確定後に扱いを決める(Guide me / Edit file なら有効、Grill me / Chat ならヘッダのみへ縮退)。

- 2026-07-22T22:54:08Z — [Interpretations] Q3=C によりスコープが「選挙エンジン単体」から「チーム機能一式(起動/メッセージング/選挙/docs)」へ拡大。壁打ち時の裁定「team-up.sh は scripts/ のまま非配布」は失効し、配布形態は設計段の判断対象へ。intent record 名(election-core-promotion)は実体(team-feature 昇格)と乖離するが、intent-statement で正しいスコープを定義して吸収する。ユーザーの逆質問(UX 逆算)が作り手都合の段階昇格案を覆した — 要件 framing の実例として §13 候補。
