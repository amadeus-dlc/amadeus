# Election Record — E-SRA-FDS13

- question: intent 260805-semi-redefine-autonomy-f の functional-design ステージ §13 学習選定。正本は record の construction/functional-design/memory.md(全文実読、8 エントリ)。conductor 提案は 採用 2 件: L1(c6 由来)= 静的な契約 AC(コード不変・非追加・フラグ非登録など、実行で踏めない性質の受け入れ基準)にも検証手段(テスト ID または機械検査)を必ず束ねる — launch-autonomy-flag §12a iteration 1 BLOCKER(FR-CLI-5 後半の READ_ONLY_FLAGS 非追加 AC に検証手段が不在 → H9 in-process アサーション追加で閉包)の一般化。L2(c7 由来)= cid:code-generation:c3-mps(FD/AD 契約ギャップの readonly 実測裁定)への FD 側予防面の追補 — 「〜経由で受領」の 1 文は配線の specify ではない。FD は型のフィールド・呼び出し行・組み立て点の 3 点まで確定して初めて実装可能とする(semi-authorization-core §12a iteration 1 BLOCKER: D3 の semiScope 供給元未 specify → decide :607 / AutonomyDecisionInput :228-239 実測 3 点 specify で閉包)。不採用 6 件: c1(cid:code-generation:seam-placement-measured-module の執行)、c2(本 intent 自身の full autonomy 機能の正規経路使用 — 一般化は本 intent の docs/正本知識改訂が担う)、c3(ADR 裁定文からの機械導出 = 既決 contract 執行)、c4(cid:application-design:dual-key-consumer-inventory の docs 意味論改訂面への自然適用実例 — 別 intent で再観測されたら追補昇格を再検討)、c5(cid:application-design:citation-semantics-check + cid:functional-design:cross-unit-type-verbatim-check ファミリの実践 — verbatim シグネチャコメント = 返り値ドメイン契約の読みは citation-semantics の適用)、c8(delivery-planning 回付済み裁定 R11 の遵守 = 既決執行)。実在根拠は memory.md と各 unit の §12a Review 節・questions ファイルで実測確認すること。

裁定: 提案どおり(L1 + L2 採用、他 6 件不採用)(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-1, GoA2): L1 の persist 文には、既存 Mandated『新設ゲート・検証スクリプトの落ちる実証』(team.md)との境界 — L1 はゲート実装でなく成果物 AC への検証手段バインディング面を縛る — を1行明記して語彙衝突を防ぐこと。
- 留保(subagent-2, GoA2): L1 の persist 文は inception 汎用則「要件はテスト可能」との差分(静的・非実行性の契約 AC にテスト ID または機械検査を明示に束ねる FD 段の具体機構である点)を明記し、汎用テスト可能性の再述にしないこと。
票タイムライン: 配信 2026-08-05T11:52:23Z → 配信 2026-08-05T11:52:23Z → subagent-1 2026-08-05T11:55:00Z(受理 2026-08-05T11:55:13Z) → subagent-2 2026-08-05T11:55:22Z(受理 2026-08-05T11:55:35Z) → 開票 2026-08-05T12:03:34Z
GoA[E-SRA-FDS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
