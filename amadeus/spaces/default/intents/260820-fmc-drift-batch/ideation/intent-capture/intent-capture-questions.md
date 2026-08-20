# Intent Capture — 質問と裁定

Intent: 260820-fmc-drift-batch / Depth: Standard(予算 最大8問、本ステージは4問で構成)
回答モード: Intent Autonomy `full` — 各質問は `amadeus-bolt decide-question` 梯子で裁定し、provenance を併記する。
承認エビデンス: ユーザーが full autonomy grant を承認(実 HUMAN_TURN)し、set-autonomy --mode full が 2026-08-20T07:18:02Z にコミット(grant_id intent-grant-79f28345c4f20469c2ec87c6a12aeffa、INTENT_AUTONOMY_TRANSACTION_COMMITTED)。以下の各 [Answer] はこの grant 下の AUTO_DECIDED 裁定。

## Q1: 本バッチが解決する中核の業務問題はどれか?

背景: #3186/#2289/#2929/#3187 は個別の欠落だが、intent としての問題定義を1つに定める必要がある。

- A. 形式検証(TLA+)の実効性の崩壊 — モデルが実装から無音で乖離し、緑のまま防御力を失う構造を閉じる(4 Issue はその機序の各面)
- B. tla-authoring ステージの完成度不足 — ステージ機能の追加拡充が主目的
- C. formal-model-check plugin の技術的負債返済
- D. 監査・ガバナンス証跡の強化
- E. 開発速度の改善(モデル登録の手間削減)
- X. Other (please specify)

[Answer]: A — 「モデルが増えない・乖離が検出されない」という実効性の問題が中核。#3186(検出の腕)/#2289(改訂の commit 経路)/#2929(plugin 実装の governed 化)/#3187(死んだ advisory 経路の退役)はいずれもこの1つの閉ループの部品。(AUTO_DECIDED auto-decision-8c8151ad336a210abb82909ffe0fe228, 2026-08-20T07:22:07Z)

## Q2: 成功指標(測定可能な完了条件)はどれを採るか? (select all that apply)

- A. drift 検出の腕が落ちる実証付きで着地(語彙 drift・欠陥再発トリガが実 corpus で赤→是正→緑を実測)
- B. revise-model draft が replace-by-name で commit 可能(置換成功/置換対象不在/author-new 同名衝突の3面テスト green)
- C. PrConvergenceGate / BoltPrAttestationGate が plugin 実装ファイルを governed entry として pin し、SOURCE_DRIFT 検知が実測で機能(validator/loader/sensor 3面同時是正)
- D. advisory authoring-hold 経路の完全撤去(plugin.json 宣言・コード・t528 を同一変更で、後方互換レイヤーゼロ)
- E. 全ブロッキング CI green + 各 Bolt PR マージ着地
- X. Other (please specify)

[Answer]: A, B, C, D, E — 4 Issue の期待結果(クロスレビュー refinement 反映後)をそのまま受け入れ基準の骨子とし、E は配送条件。(AUTO_DECIDED auto-decision-355e1112c901278833912f1271449bdd, 2026-08-20T07:22:07Z)

## Q3: スコープ境界 — クロスレビューが発見したスピンオフ2件(validator/loader 述語不整合の休眠 bug、t448 自己参照比較)の扱いは?

- A. 本 intent のスコープ外とし、別 Issue として起票のみ行う(起票は remote write として梯子/人間承認境界に従う)
- B. 本 intent に含めて修正する
- C. #2929 の unit に付随して validator/loader 不整合のみ修正し、t448 は起票のみ
- X. Other (please specify)

[Answer]: C — #2929 の完了条件が「3面同時是正」へ改訂された時点で validator/loader の述語統一は #2929 実装の不可分な一部(不整合を残すと二重定義がそのまま残り P5 違反)。t448 の自己参照比較は独立の検証劇場 bug であり、本 intent の変更面と直交するため起票のみ。(AUTO_DECIDED auto-decision-f7655e0046e26f7d98e5de6bd845ff4f, 2026-08-20T07:22:07Z)

## Q4: 並列実装を最大化する unit 分割の制約はどれを優先するか?

- A. Issue 単位 4 unit(#3186 / #2289 / #2929 / #3187退役)を基本とし、ファイル所有権の交差だけ直列化する
- B. 変更ファイル単位で unit を再編成する(Issue 横断)
- C. 全部を1 unit に統合して直列実装する
- X. Other (please specify)

[Answer]: A — 1 Issue = 1 Unit 原則(project.md cid:units-generation:c1)に整合。所有権交差は units-generation で実測して確定する(既知の交差候補: #3186 と #3187 が plugins/formal-model-check/tools/tla-authoring.ts を共有 → 依存または直列化を units-generation で設計)。(AUTO_DECIDED auto-decision-0b6fd452e69cce04ab7da9b19e8cd503, 2026-08-20T07:22:07Z)
