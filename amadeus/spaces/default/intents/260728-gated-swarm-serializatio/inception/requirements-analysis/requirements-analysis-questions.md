# Requirements Analysis Questions — 260728-gated-swarm-serializatio

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md — 各質問の選択肢は architecture.md「swarm dispatch と autonomy ゲーティング」節の実測(tryEmitSwarm :2526 / approve ガード :3824-3826 / InvokeSwarmDirective に gate フィールド不在 / stage-protocol.md:123-125)から導出。business-overview.md / code-structure.md は影響面(配布7ハーネス・consumer 文書)の確認に使用。

E-OC1 判定: 本ファイルの質問は3問とも既決ノルム・既存実装パターンで一意に決まらない真の設計判断(修正方式の選択・unset の扱い・スコープ裁定)であり、ソロモードではユーザー裁定事項。選挙不要判定の対象外(ユーザーへの質問そのもの)。

## Q1: gated 時のバッチ末尾ゲートの実装方式

背景(実測): 現行エンジンには「バッチ末尾ゲート」機構が存在しない。invoke-swarm directive は `units`/`repo?` のみで gate フィールドを持たず(amadeus-directive.ts:173-185)、swarm 経路のゲートは全バッチ covered 後の1回のみ(emitPerUnitRunStage :2757)。仕様(stage-protocol.md:123-125)は gated で「各 Bolt または並列バッチの完了後にゲート」を要求する。

- A. 【拡大】エンジン主導 — gated でも invoke-swarm を emit し、バッチ finalize 後の next 再入時にエンジンがバッチ末尾ゲート付き directive(ask または gate 付き再入形)を返す新遷移を追加する。ゲートは engine 強制(P2 整合が最強)だが、directive 契約と全ハーネス SKILL.md の consumer 改修を伴う
- B. 【維持】ハイブリッド — gated でも invoke-swarm を emit する(engine 変更は :2526 と :3825 の対称緩和が中心)。バッチ末尾ゲートの提示は conductor 側規範(SKILL.md 手順 (5) finalize 後の gated 分岐)で規定する。変更面が最小で bugfix の範囲に収まるが、ゲート実施はプロトコル文書 + Stop hook(invoke-swarm を PENDING 扱い)依存で engine 非強制
- C. 【縮小】現状維持+文書側修正 — 実装は変えず stage-protocol.md を実装に合わせて書き換える(gated = 直列を仕様化)。Issue #1612 の趣旨(並列度の回復)を放棄する

[Answer]: A(エンジン主導 — バッチ末尾ゲートを engine 遷移として実装)

## Q2: walking skeleton 完了後の unset の扱い

背景(実測): readAutonomyMode は unset と gated を同一の null へ潰す(:1164-1168)。仕様(stage-protocol.md :121)は「resume 時に unset かつ skeleton 完了済みなら ladder prompt を再提示」と定めるが conductor prose のみで engine 強制なし。Issue #1612 は「skeleton 完了後も unset のまま後続 Unit へ進んだ場合」を問題範囲とする。

- A. 【維持】unset は gated と同挙動に固定する(Q1 の修正後は「並列 dispatch + バッチ末尾ゲート」)。ladder 再提示は現行どおり conductor prose の責務とし、engine 変更は行わない — 安全側デフォルト(ゲートあり)を保ちつつ直列化だけを解消
- B. 【拡大】engine が skeleton 完了 + unset を検出したら ladder 再提示の ask directive を emit する遷移を追加する(仕様 :121 の engine 強制化)。修正面が広がる
- C. 【縮小】unset は本 intent のスコープ外とし、gated のみ修正する(Issue の unset 論点を別 Issue へ分離)

[Answer]: B(engine が skeleton 完了+unset を検出したら ladder 再提示の ask directive を emit)

## Q3: スコープ裁定 — amadeus-bugfix のままか amadeus-feature へ切替か

背景(規範): project.md Scope Overrides は「修正に新機能や仕様の設計が必要な場合は、ユーザーの明示指示を得て amadeus-feature へ切り替える」と定める。本修正は文書化済み仕様(stage-protocol.md:123-125)への回復であり bugfix の定義(仕様への回復)に合致する一方、Q1=A を選ぶ場合はエンジン新遷移の設計を伴う。

- A. 【維持】amadeus-bugfix のまま続行 — 仕様は既に文書化済みで、実装をそれへ整合させる作業は bugfix。Q1=A でも設計成果物は requirements + plan で足りる(bugfix scope は functional-design を SKIP)
- B. 【拡大】amadeus-feature へ切替 — エンジンの遷移追加を新設計と見なし、application-design / functional-design / units-generation を通す(所要ステージ 7→15、ゲート 4→12)

[Answer]: A(amadeus-bugfix のまま続行)

## 裁定の記録

- Q1 = A: 初回 AskUserQuestion でユーザーが「現行の不整合実装を許容しない選択肢にしてほしい」と再指示 → chat モードで A/B/C の許容性を対比提示(B は prose ゲートという別の不整合を残す)→ ユーザーが「Q1 = A」と確定。
- Q2 = B: chat モードで A/B を対比提示(B は Q1=A の「不整合を許容しない」原則と一貫、ask directive 機構は既存)→ ユーザーが「Q2 = B」と確定。
- Q3 = A: 初回 AskUserQuestion で「A: bugfix のまま(推奨)」を採択。
- ユーザー承認: 2026-07-28T07:26:47Z(3問とも実 HUMAN_TURN による直接裁定。ソロモード — 明確化質問はユーザー裁定事項であり選挙対象外)
