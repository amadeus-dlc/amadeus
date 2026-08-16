# Election Record
Election ID: E-260816-R21-PRESENCE-BYPASS
Run ID: run-1
Lifecycle: tallied
Established questions: 1
Hold questions: 0
Held question IDs: none

## Question q-r21-log278: U5 semi-authority-projection の R-21: amadeus-log.ts:278 の QUESTION_ANSWERED 人間 presence ガード迂回(現行 `isAutonomousMode(content)` = Construction 投影が autonomous なら迂回)は、semi の投影 autonomous 化で semi へ広がってはならない(FR-12 と逆行)。迂回の判定入力を何に付け替えるか。制約: 新しい検出面を増やさない(RFC Q3=A′ の最小化方針)、full の既存挙動(無人での回答記録)は保存、semi の回答記録は presence ガード下へ戻す。
Established: A: 宣言 Intent Autonomy Mode が full のときのみ迂回(state の宣言フィールド直読 — mode 意味論と一致、検出面追加なし) (choice 1)
Choice counts:
- Choice 1 A: 宣言 Intent Autonomy Mode が full のときのみ迂回(state の宣言フィールド直読 — mode 意味論と一致、検出面追加なし): 2
- Choice 2 B: 対話性判定(resolveSessionInteractivity)で迂回を決める(非対話なら迂回)— mode 非依存だが、対話 full の回答記録が presence 要求へ変わる(full の挙動変更): 0
- Choice 3 C: 当該 answer に対応する AUTO_DECIDED 記録の実在で迂回(自動裁定由来の回答のみ無人記録可)— 最も厳密だが log 経路から decision 台帳への新しい読取結合を作る: 0
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-15T20:14:52Z] GoA 2: declared Intent Autonomy Mode フィールド(amadeus-lib.ts:5173 getField(stateContent, "Intent Autonomy Mode") で既に読まれている既存フィールド)を直読する実装にすること。フィールド不在・空文字のケースは fail-closed(迂回しない = presence ガード維持)側へ倒す — isAutonomousMode(:5186-5188) の `!!stateContent && ... === "autonomous"` と同じ厳格等価パターンを踏襲し、未知値やパース失敗を安全側(non-full 扱い)にすること。
- Reservation subagent-2 [original:2026-08-15T20:15:07Z] GoA 2: amadeus-log.ts:278 の isAutonomousMode(content) は amadeus-lib.ts:5186 で Construction Autonomy Mode を読む1関数であり、他の呼び出し箇所(amadeus-state.ts:1600, :4135)は本 R-21 是正の対象外(owned files 外、R-23 参照)。A へ切替える際は amadeus-log.ts のこの1箇所だけを Intent Autonomy Mode の直読(state.ts の autonomySegment(content) === "full" 相当)へ差し替え、他呼び出し箇所の Construction Autonomy Mode 読取は不変に保つこと(R-22 は逆に復元スキップの semi 拡大を防ぐ側であり、amadeus-state.ts:4135 は本則の対象外)。project.md cid:code-generation:c1-threshold-inside-observed-range 相当の懸念はないが、Intent Autonomy Mode が未投影(R-25 の unset pair)の state では A も B も C も fail-closed(presence 要求)側に落ちることを落ちる実証の一部として確認するとよい。
Late responses:
- None
Run lineage: run-1

## Timeline
- tallied at=2026-08-15T20:15:53Z run=run-1