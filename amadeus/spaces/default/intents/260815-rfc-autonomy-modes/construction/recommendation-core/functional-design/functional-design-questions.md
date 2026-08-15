# Functional Design — Questions(unit recommendation-core)

> 承認: 2026-08-15T16:50:00Z — full 梯子 AUTO_DECIDED auto-decision-e12ac85dc9b1f60a37ea07aa12d2b556(全 unit の定型質問は RFC-0001 + 選挙 E-260815-RFC0001-DESIGN + ADR 留保 + Q6/Q9 人間裁定から一意導出 — 既決事項の再質問回避)。

## Q1: `RecommendationOutcome` が unique 以外で終端した梯子は、既存 `AutoDecisionResolution`(`amadeus-intent-autonomy.ts:807-810`)のどの枝を返すか

現行の `resolveAutoDecision`(`amadeus-intent-autonomy.ts:930`)は `decided` / `park(NORM_CONFLICT)` / `invalid` の 3 枝しか返せず、「候補が複数ある」を表現する枝がない。contested/none を新しい第 4 枝にするのか、既存の park へ写像するのか。

[Answer]: 新しい escalate 枝を追加し、contested/none をその payload として運ぶ。ADR-1 の Decision(「RecommendationOutcome を C1 に新設し梯子全段へ実配線」)と component-methods.md C2 の `resolveAutoDecision(input): AutoDecisionResolution` 注記(「unique のみ AUTO_DECIDED、それ以外は escalate(outcome 同梱)」)から一意に決まる。park(NORM_CONFLICT) への写像は Q1-B として RFC-0001 Rationale で明示棄却済み(「『推奨が複数ある』(裁定可能・候補提示可)と『機構が壊れた』(park)の区別が潰れ、裁定順序 3 と 4 を実装できない」)。既存の `park(NORM_CONFLICT)`(`:943`)と `invalid`(`:932` 他)は FR-15 の効果天井無退行として不変のまま残す。

## Q2: 現行の history 段の "conflict" 黙殺(`amadeus-intent-autonomy.ts:952`)は contested か invalid か

`uniqueOption`(`:813-817`)は競合時に `"conflict"` を返すが、norm 段(`:943`)が park するのに対し history 段は `if (history !== null && history !== "conflict")` という条件で **競合を無視して次段(選挙・エージェント推奨)へ落とす**。これは D4「決められなくても進む」の具体的な実例だが、是正先が contested なのか機構欠陥なのかは decisions.md に明記がない。

[Answer]: contested。FR-4 が「梯子⑤の『決められなくても進む』縮退を除去し」と規定し、ADR-1 が非一意の表現を `contested` に一元化しているため、過去人間裁定が複数選択肢に割れている状態は「機構故障」(裁定順序 4)ではなく「推奨が一意でない」(裁定順序 3)に分類される。RFC-0001 Guide-level「裁定の順序」の 3 と 4 の区別(3 = 推奨が一意でない、4 = 機構故障・ノルム矛盾)がこの割り当てを決める。したがって history 段の `"conflict"` は `RecommendationOutcome.contested(競合した各 optionId を候補として列挙, "past-rulings-conflict")` を返し、次段へ落とさない。

## Q3: ゲート導出器は contested を返しうるか。blocking sensor 未解決や NORM_CONFLICT はどう表現するか

`commitProductionStageGateDecision`(`amadeus-intent-autonomy-production.ts:794-843`)は `recommend: () => ({ optionId: "approve", ... })`(`:836`)という定数 approve で、そもそも選択肢の概念を持たない。型を通したときにゲートが contested を返せる設計にするか。

[Answer]: 返さない。ADR-1(Q2=B)が「ゲートは決定的承認のまま。導出器は型を実配線で返し常に unique(approve) — 『選択肢がない』ことを型で表現」と裁定済み。red(blocking sensor 未解決 / NORM_CONFLICT)は同 ADR の「既存 fail-closed のまま導出器の contested で表現しない」に従い、`amadeus-state.ts` の guardDenied 経路(RFC-0001 付録 B のプラグイン対応表・sensor 節)と `resolveAutoDecision` の park 枝にそれぞれ残す。semi の phase-boundary / walking-skeleton は裁定順序 1(人間専権)側で表現するため、ゲート導出器の戻り値では区別しない(ADR-1 Decision 末尾)。この区別は本 unit ではなく U5 が所有する。

## Q4: `RecommendationBasis.fingerprint` と ADR-4 の `basisFingerprint` の算出法を本 unit で確定するか

component-methods.md C1 は `RecommendationBasis = { source; fingerprint: string }` を定めるが、fingerprint の算出規則は書かれていない。U3 のレート制約の鍵にもなるため、正規化規則を本 unit で決めるべきか。

[Answer]: 決めない。ADR-11 Decision が「C4 の basisFingerprint の算出法(自明摂動でレート制約を回避できない正規化 — 導出過程の正規形 digest)は code-generation への明示入力として申し送る」と裁定しており、unit-of-work.md の「code-generation への明示申し送り」節も同内容を再掲している。本 unit は fingerprint を **不透明な SHA-256 文字列として型に載せて運ぶだけ**とし、算出は既存 `autonomyDigest` の呼び出し側(各導出段)に置く。新しい裁定はここでは行わない(申し送り入力として受け取る)。
