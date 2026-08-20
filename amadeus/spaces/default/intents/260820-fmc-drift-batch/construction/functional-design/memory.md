<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-20T13:35:00Z — U2 boundary-three-face: Construction の質問は例外的との §3 規律 + full autonomy 下で、材料となる曖昧さが実測で残らなかったため質問ファイルを作成せず(先行 unit advisory-retirement と同形)。OQ-2/OQ-3 は trace-rows・コード実読から一意に導出した
- 2026-08-20T13:35:00Z — OQ-2 の per-model 割当は「4ファイルを両モデルへ登録」とした; 両 intent の trace-rows が FR-2/3/4 を共有subject に持つ実測に基づく。片側登録より drift 検出が広く、可逆(entries は後から調整可能)なため §3 の可逆デフォルト規律で採用し記録
- 2026-08-20T13:35:00Z — IMPLEMENTATION_PATHS の新形状はフルパス RegExp リストを採用; 一般形 plugins/<kebab>/tools/ は静的 prefix で表現できず、tuple 維持より単純(P5)。旧 formal-model-check タプルは包含証明つきで削除(OQ-3 = 統合)

- 2026-08-20T13:50:00Z — §12a iteration 1 NOT-READY(BLOCKER: glob drift テストの Red 先行と手順番号の自己矛盾)を是正: テスト新設を手順3へ前置し glob 更新を手順4へ。rootReal の未定義(repo ルート実パス基点の明示)・loader テスト着地ファイルの名指し・BR-4 per-model 明確化も同時反映

- 2026-08-20T14:05:00Z — U1 revise-model-commit: t3078 の述語方向を実読確定(tools→plugin.json 全数宣言)し、条件付き write scope を「plugin.json tools[] 1行追加」で確定(units-generation FOLLOW-UP の閉包)。新 kind revise-target-missing が CLI 面へ波及しないことを registrationCommit の汎用直列化(:807-845)実読で確認。FR-REG-6 の旧 FD 改訂ポインタは conductor が追記済み

- 2026-08-20T14:20:00Z — U4 applicability-arms: OQ-1 は値集合クラスタ述語(|C∩S|≥2 ∧ C⊄S)+ プロパティクラス報告 + vocabulary 自己整合 fail-closed の3検査で確定。OQ-4 は corpus 3件の実測(交差 0/2/1〜2)から閾値1を観測レンジ内で両側固定、重大度層別なし(corpus 不足の根拠つき)。OQ-AD-2 は CLI 引数シーム(plugin→core import 新設なし、実測 0 件の現状維持)で確定 — いずれも可逆・実測由来の一意導出として §3 規律で採用
- 2026-08-20T14:20:00Z — U4 の vocabularyDrift 実 corpus 赤は U2 の plugin entries 登録が前提であることを FD に明記(直列末端で前提は構造的に成立)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-20T14:35:00Z — U4 applicability-arms: iteration 2 NOT-READY(残 BLOCKER = 表セル2箇所)→ observe-quality が repair を承認 → 是正 → 再チェック(fresh invocation 9184d92b、reviewer 出力は READY・findings 0)だが complete-review が「review iteration exceeds the directive limit」で iteration 3 の永続化を拒否(fail-closed が正しく作動)。U4 の durable verdict は NOT-READY(iteration 2)のまま。是正済み内容と未永続化 READY の扱いは engine の次の指示(review_only 再発行か)またはゲートでの人間裁定に委ねる — 勝手に verdict を書かない
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
