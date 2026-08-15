# Functional Design — Questions(unit interactive-carveout)

> 承認: 2026-08-15T16:50:00Z — full 梯子 AUTO_DECIDED auto-decision-e12ac85dc9b1f60a37ea07aa12d2b556(全 unit の定型質問は RFC-0001 + 選挙 E-260815-RFC0001-DESIGN + ADR 留保 + Q6/Q9 人間裁定から一意導出 — 既決事項の再質問回避)。

## 上流入力

本 unit(U4 interactive-carveout)の設計は次を上流とする。`unit-of-work.md`(U4 = ADR-5 / FR-4 対話 arm、owned file は `hooks/amadeus-stop.ts`、見積 ~120 行)、`unit-of-work-story-map.md`(価値の背骨 4「対話なら聞いてくる」)、`requirements.md`(FR-4、および前提の FR-2)、`components.md`(C3 session-presence の単一ソース要求)、`component-methods.md`(C3 `resolveSessionInteractivity`、C1 `RecommendationOutcome`、C4 `enterWaiting`)、`services.md`(S1 裁定サービスのデータフロー — 非 unique → C3 → 対話は提示 / 非対話は C4 waiting)、`decisions.md`(ADR-5 = Q11=A、ADR-4 = 非対話の倒し先)。

## 質問

### Q1: Stop hook の対話性判定は、hook 独自の信号を持ってよいか

[Answer]: 持たない。判定は C3 の実効判定関数(`component-methods.md` C3 `resolveSessionInteractivity`)ただ一つを読む。ADR-5 の Decision 逐語「Stop hook は C3 の実効判定(HUMAN_TURN 造幣パイプライン由来・全消費者と同一ソース)で分岐」および components.md C3「全消費者が同一ソース」(UI 真実性 — RFC-0001 Guide-level「UI 真実性の契約」3)。現行 hook が持つ `transcriptIsConversational`(`packages/framework/core/hooks/amadeus-stop.ts:569`)は tier-3 の chat 判定用の補助信号として現位置に残し、セッション対話性の判定を上書きも代替もしない(ADR-5 逐語 + RFC-0001 Reference-level「対話/非対話検出の実装シーム(Q3=A′)」)。

### Q2: mode / grant を根拠にした現行 carveout guard は、4 つの carveout のどれについて撤去するか

[Answer]: **pending-question(:450 の `isQuestionCarveoutIntent`)と pending-compose(:485 の `isFullyAutonomousIntent`)の 2 つだけ**を撤去し、対話性判定へ置き換える。この 2 面が RFC-0001 付録 C の D10 が名指す患部(根拠列の逐語は `amadeus-stop.ts:449-452` と `isPendingComposeStop`)であり、ADR-5 Decision の認可範囲も逐語「対話セッションでは裁定順序 3 到達(contested/専権)の**質問提示・compose 保留**でターン返却を許可」である。

conversational(`isConversationalStop` :744)と human-wait(`isHumanWaitStop` :381-391)は**現行意味論を保存**する。理由は 2 つ。(1) ADR-5 の認可範囲外。(2) 課すと既存 allow が block へ退行する — :744 の guard は `isFullyAutonomousIntent` であり full のみを殺すため semi / none では現在 carveout が発火しており、`isHumanWaitStop` は autonomy guard を持たず全 mode で発火する。ここへ対話性や終端束縛を足すと非対話 full の `[?]` 停止まで block になり、business-rules.md の R-10「carveout は allow を増やす方向にのみ作用する」と自己矛盾し、RFC-0001 D5 / #1241 の膠着を hook 側で再生産する。4 carveout × 2 軸の確定表は business-logic-model.md「改修範囲の確定」に置き、保存する 2 面には無退行 pin を対で置く(business-rules.md 落ちる実証 6 / 7)。

### Q3: 対話セッションなら、未回答タグや compose marker があるだけで常にターンを返してよいか

[Answer]: よくない(対象は carveout 2 / 3)。ADR-5 の逐語「carveout 判定は RecommendationOutcome の終端種別に束縛」に従い、梯子を経由する裁定点(semi / full)では、当該裁定点の終端が unique 以外(contested / none)または裁定順序 1 の人間専権であることが記録から確認できるときにのみ carveout を発火させる。読み口は既に本 hook が import している `readProductionAutonomyProjection`(:105 / :176 / :200)1 つに限り、engine 呼出を新設しない(hook は spawn プロセスで、engine とは `runEngineNextKind` の directive kind 文字列しか交換しない — :925 / :932 / :947 / :953)。投影が保留封筒として何を載せるかは U1 / U3 の所有で、本 unit は入力要件(`occurrenceId` / 終端種別 / 発生時刻)を述べるにとどめる。unique で自動裁定できる質問でターンを返すことは、RFC-0001 の頻度予算(Q1 の UX 契約、ADR-9 の「通常進行 fixture で contested 発火 0 件」)に反し #2974 を再生産する。mode `none` は梯子を通らず全裁定点が人間であるため(RFC-0001 ToBe 行 5)、既存の positive signal(未回答 `[Answer]:` タグ / compose marker)だけで足りる。

### Q4: 非対話セッションで裁定不能に至ったとき、hook は何をするか

[Answer]: carveout 2 / 3 を発火させず、既存の継続強制(予算内 block)を維持する(1 / 4 は Q2 のとおり不変)。実際の停止は U3 の waiting が担い、hook は engine が返す `parked` 系 directive を既存の terminal allow(`amadeus-stop.ts:947-949`)で受ける。ADR-5 の逐語「非対話は継続強制を維持し waiting へ」、ADR-4(waiting は engine 発行専用 — CLI verb なし)、`services.md` S1 のデータフロー(非対話 → C4 waiting)に一致する。判定不能・読取不能は非対話として扱う(ADR-5「判定不能は非対話へ fail-closed」)。
