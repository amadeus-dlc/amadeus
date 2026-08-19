<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-19T09:25:00Z — 本ステージは当初の scope グリッドに無く、`plugin.scope-bindings` が `self-fix` に必須と定めるため recompose で追加して実行した; 判定は終端 `non-target` で TLC は起動していない(検査そのものは formal-model-check 側で全4モデル実行済み)
- 2026-08-19T09:25:00Z — 選定基準の適用にあたり FR-1/2/3/4/6 を選定・FR-5/FR-7 を非選定とした; 選定側は report ループと Stop hook が状態を共有する再開可能アクターであり #2762 の失敗様式が無音の安全性違反にあたるため、非選定側は実行時の振る舞いを持たないため

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-19T09:25:00Z — ステージ本文が要求する terminal-route receipt の persist を実行できなかった; `applicability judge` / `receipt` がどちらも undecidable J2/J2d を返すため。理由は判定器の欠陥(別文書の同名 FR-N との衝突)で、詳細と対照実験は `applicability-assessment.md` §4、欠陥は Issue #3250。判定の結論と全測定を成果物へ記録することで代替した

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-19T09:25:00Z — 衝突する FR-2/3/4 を subject 集合から落とせば receipt は mint できた(対照実験で `FR-1, FR-6` は `{"ok":true,"route":"non-target"}` を返すことを実測)が、採らなかった; 判定対象を判定器の欠陥に合わせて削る行為であり、証拠の整形にあたるため。宣言は選定基準どおりの集合のまま残し、mint 不能の事実と原因を記録する側を選んだ

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-19T09:25:00Z — `BoltPrAttestationGate` の登録 bundle が bare な `FR-2`〜`FR-5` を trace subject に持つのは登録側の粒度の問題でもある(同 bundle のモデル固有 subject は `FR-BPA-*` と接頭辞つき); #3250 の是正方針として、判定器の比較キー修正と登録側 ID の修飾のどちらを採るかは未決
