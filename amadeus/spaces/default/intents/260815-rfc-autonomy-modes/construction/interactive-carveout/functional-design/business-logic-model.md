# Business Logic Model — unit interactive-carveout(U4)

> 上流入力: `unit-of-work.md`(U4 = ADR-5、owned file `hooks/amadeus-stop.ts`)、`unit-of-work-story-map.md`(背骨 4「対話なら聞いてくる」)、`requirements.md` FR-4(前提 FR-2 / FR-3)、`components.md` C3、`component-methods.md` C1 / C3 / C4、`services.md` S1、`decisions.md` ADR-5(Q11=A)・ADR-4。本 unit が所有する変更面は `packages/framework/core/hooks/amadeus-stop.ts` のみで、`resolveSessionInteractivity`(U2)・waiting(U3)・`RecommendationOutcome`(U1)は読み口として消費する。

## 現行フロー(改修前の実測)

`amadeus-stop.ts` の本体は上から順に判定する。engine 相談(`runEngineNextKind` :763-795、null は fail-open で allow :925-929)→ `done` allow(:932-934)→ `parked` allow(:947-949)→ `ask` / `select-intent` allow(:953-955)→ 4 つの carveout(human-wait :966、pending-question :983、pending-compose :998、conversational :1018)→ 予算判定 `decideStopContinuation`(:1031)→ 予算内なら block(:1047)。

carveout 3 つは autonomy を根拠に殺されている。

- `isPendingQuestionStop`(:448-463)は冒頭で `isQuestionCarveoutIntent`(:192-205)が真なら `false` を返す(:450-452)。同関数は full なら `isFullyAutonomousIntent`(:170-181 — mode full かつ projection の `currentGrant.state === "active"`)、semi なら `modeProvenance.kind === "human-command"` で真。
- `isPendingComposeStop`(:481-514)は `isFullyAutonomousIntent`(:485)が真なら `false`。コメント逐語は "an unattended run has no human to answer the gate"(:477 付近)。
- `isConversationalStop`(:737-753)も同じ guard(:744)。

このうち **question(:450)と compose(:485)の 2 面**が RFC-0001 付録 C の D10 が名指す実体であり(D10 の根拠列は逐語 `amadeus-stop.ts:449-452`(`isPendingQuestionStop`)と `isPendingComposeStop`)、対話セッションの full が「推奨不一意 → 人間裁定」へ到達する経路を機構的に持たない原因である。

`isHumanWaitStop`(:381-391)は checkbox が `[?]` / `[R]` かどうかだけで判定し、autonomy guard を**持たない**。

## 改修範囲の確定(4 carveout × 2 軸)

ADR-5 の認可範囲は逐語「対話セッションでは裁定順序 3 到達(contested/専権)の**質問提示・compose 保留**でターン返却を許可」であり、conversational / human-wait は含まれない。この 2 つへ新たに対話性判定や終端束縛を課すと、**現在 allow している経路が block へ退行する**(conversational は semi で現に発火しており、human-wait は全 mode で発火する)。それは carveout を狭める変更であり、R-10「carveout は allow を増やす方向にのみ作用する」と自己矛盾する。したがって本 unit は次の表を確定範囲とする。

| # | carveout(判定関数) | 対話性を課すか | 終端束縛を課すか | 現行 guard の扱い |
|---|---|---|---|---|
| 1 | human-wait(`isHumanWaitStop` :381-391、発火点 :966) | **課さない** | **課さない** | 現行どおり autonomy guard なし。checkbox `[?]`/`[R]` のみ。**一切変更しない** |
| 2 | pending-question(`isPendingQuestionStop` :448-463) | **課す** | **課す**(mode `none` を除く) | `isQuestionCarveoutIntent`(:450)を撤去し、対話性 + 終端束縛へ置換 |
| 3 | pending-compose(`isPendingComposeStop` :481-514) | **課す** | 課す(compose 承認は全 mode で人間専権 = 裁定順序 1 のため、marker が fresh なら束縛は自動的に成立し、追加の記録読取を要しない) | `isFullyAutonomousIntent`(:485)を撤去し、対話性判定へ置換 |
| 4 | conversational(`isConversationalStop` :737-753) | **課さない** | **課さない** | `isFullyAutonomousIntent`(:744)を**現行のまま残す**。semi / none での発火・full での不発火という現行意味論を保存 |

2 と 3 は非対話セッションで現行より狭くなる(現行は mode `none` 等で対話性に関係なく allow していた)。この 1 点だけが本 unit で意図的に許す narrowing であり、ADR-5 の認可範囲内である。かつ補償経路があるため停止は生じない — 非対話で block した次ターンに engine が waiting(U3)を発行し、`parked` 系 directive の terminal allow(:947-949)でターンは返る。1 と 4 には narrowing を一切導入しない。

## 改修後のフロー(carveout 2 と 3 のみ)

判定軸を「mode / grant」から「セッション対話性」へ移す。carveout の並び順・fail-open/fail-closed の既存規律・予算機構は変えない。

1. **対話性の解決**: hook は C3 の実効判定 `resolveSessionInteractivity(projectDir)`(`component-methods.md` C3、実装は U2 が `amadeus-intent-autonomy.ts` に新設)を 1 回だけ呼び、`{ interactive, source, measuredAt }` を得る。例外・読取不能・信号不明は `{ interactive: false }` と同義に扱う(fail-closed)。
2. **裁定終端の解決(読み口を具体面まで降ろす)**: この hook は spawn される別プロセスであり、engine とは `runEngineNextKind`(:763-795)が返す directive kind 文字列でしか会話しない(:925 の `const kind = runEngineNextKind();` と :932 / :947 / :953 の分岐が全経路)。したがって終端種別は**ディスク上の投影から読む**。読み口は既に本 hook が import している `readProductionAutonomyProjection`(import :105、使用 :176 / :200)ただ 1 つとし、engine 呼出を新設しない。
   - **U1 / U3 への申し送り(handed-off input、本 unit の新規裁定ではない)**: `AutonomyProjection`(`amadeus-intent-autonomy.ts:165-182`)は既に `parkEnvelope: ParkEnvelope | null` という「保留中の封筒」フィールドを持つ。裁定順序 3 到達の escalate(`component-methods.md` C2 `resolveAutoDecision` の「unique のみ AUTO_DECIDED、それ以外は escalate(outcome 同梱)」)を、同じ形の保留封筒として投影へ載せることを要求する。本 unit が必要とする最小フィールドは `occurrenceId`(裁定点の同定)/ 終端種別(`contested` / `none` / 人間専権)/ 発生時刻の 3 点。フィールド名・スキーマ・書込点は U1 / U3 の所有であり、本書は入力要件としてのみ記述する。
   - 読めない・封筒が無い場合は「束縛未成立」として carveout を発火させない(下の 3 の分岐で block 側へ落ちる)。
3. **carveout の分岐(表の 2 と 3 のみ)**:
   - 対話 ∧(mode `none` の既存 positive signal、または 束縛成立(終端が contested / none / 人間専権))→ **allow**(ターンを返す)。
   - 非対話 → carveout 不発火 → 予算判定へ落ち、予算内なら block(継続強制)。次ターンで conductor が engine を回し、engine が waiting(U3)を発行すると `parked` 系 directive の terminal allow(:947-949)でターンが返る。
   - 判定不能 → 非対話と同じ扱い。
   - 表の 1(human-wait)と 4(conversational)はこの分岐に**入らない**。従来どおり :966 / :1018 の位置で、従来の述語のまま評価される。
4. **記録**: 2 / 3 が allow したときは既存の `recordHookDrop`(呼出は :967 / :984 / :999 / :1019 の 4 箇所。2 は :984、3 は :999)へ、対話性判定の根拠(`source`)と発火した carveout 種別を追記する。RFC-0001 Guide-level「判定結果と根拠は使用のたび監査へ記録」の hook 側の実現。1 / 4 の記録文言は変更しない。

## 状態遷移

hook 自体は状態を持たない(engine / state を変更しない — project.md の engine mutation 禁止に加え、本 hook の契約は allow / block の二値のみ)。carveout 2 / 3 について観測可能な遷移は次の 3 経路(1 / 4 は現行の遷移を保存)。

| セッション | 裁定終端 | hook の出力 | 後続 |
|---|---|---|---|
| 対話 | contested / none / 人間専権 | allow | 人間が画面上で裁定 → 次ターンで梯子再開 |
| 対話 | unique(自動裁定可) | block(予算内) | 梯子が AUTO_DECIDED で進行 |
| 非対話 | contested / none / 人間専権 | block(予算内) | engine が waiting 発行 → `parked` 系で terminal allow |

## 他 unit との統合シーム

- **U2(presence-detection)**: `resolveSessionInteractivity` の唯一の消費者の 1 つ。`unit-of-work-dependency.md` の U4 `blockedBy` に U2 が入っており、統合ポイントは「対話性の実効判定関数(単一ソース — UI 真実性)」。hook 側に別実装を持たない。
- **U3(waiting-interruption)**: 非対話 arm の倒し先。`unit-of-work-dependency.md` U4 `blockedBy` に U3。hook は waiting を**発行しない**(ADR-4 の「engine 発行専用」)。既存の `parked` 分岐がその受け口。
- **U1(recommendation-core)**: `RecommendationOutcome` 終端種別の供給元(`unit-of-work-dependency.md` 統合ポイント「U1 → U3/U4/U5/U8: `RecommendationOutcome` 型」)。U4 の `blockedBy` に U1 は列挙されていないが、U3 経由の推移依存で満たされる。
- **U5(semi-authority-projection)**: 直接の依存はない。`stopBudgetMode`(:160-163)は `Intent Autonomy Mode`(state フィールド)を読み、U5 が変える `Construction Autonomy Mode` の投影を読まないため、semi の投影 autonomous 化は継続上限に影響しない。

## エラー経路(fail-closed / fail-open の使い分け)

- **対話性判定の失敗**(例外・ファイル不在・パース不能)→ **非対話**(fail-closed)。誤って聞けずに走り続けるより、誤って中断する方が RFC-0001 のコンセプト適合(Guide-level「信号が不明・読めない場合も非対話へ fail-closed」)。適用先は carveout 2 / 3 のみ。
- **裁定終端の読取失敗** → 束縛未成立 → carveout 2 不発火。allow 側へ倒さない。
- **engine 相談の失敗**(`runEngineNextKind` が null)→ 既存どおり fail-open で allow(:925-929)。本 unit は変更しない — hook がターンを罠にしないための既存安全側であり、carveout 判定より前段。
- **carveout 判定内の例外** → 既存 `catch` の `false` を維持(2 は :459-462、4 は :749-752)。例外時に block を増やさない、という既存契約の保存。
- **人間ゲートとの関係**: carveout 1(human-wait)は `[?]` / `[R]` の停止をそのまま許す唯一の経路であり、対話性・終端束縛を課さない。ここへ判定を足すと、非対話 full の `[?]` 停止が allow から block へ退行し、外部人間ゲート待ちの膠着(RFC-0001 D5 / #1241)を hook 側で再生産する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:31:07Z
- **Iteration:** 1
- **Scope decision:** none

Citations are exact and the question/compose arms are well specified, but the rules never scope the new binding across all four carve-outs — as written they narrow human-wait and leave conversational without a firing condition, contradicting R-10 and exceeding ADR-5.

### Findings

- BLOCKER | business-rules.md R-4/R-5/R-8/R-10 + business-logic-model.md §改修後のフロー 3 | 新束縛が4 carveout のどれに掛かるかが未確定で、書かれたとおりだと allow を狭める。(a) R-4 は :744 の guard 撤去を命じるが(実測: amadeus-stop.ts:744 `if (isFullyAutonomousIntent(...)) return false` — guard は full のみを殺し semi では現状 carveout が発火する)、R-5 の終端束縛は「質問提示・compose 保留」しか対象にしていないため、conversational carveout の改修後の発火条件がどの規則にも存在しない。§3 の一般分岐(対話 ∧ 束縛成立)を機械的に当てると、裁定点を持たない chat ターンは束縛未成立となり semi の既存 allow が block へ退行する。(b) human-wait carveout(:966 `if (isHumanWaitStop(stateContent))`)は現行 autonomy guard を持たない(実測: isHumanWaitStop は :381-391 で checkbox 状態のみを見る)にもかかわらず、R-8『非対話セッションでは carveout を発火させず』と domain-entities の CarveoutBasis(carveout に "human-wait" を含み outcomeKind を要求)が対話性・終端束縛を新たに課しており、非対話 full の [?] 停止が allow→block へ退行する。いずれも ADR-5 Decision(逐語で対象は「質問提示・compose 保留」)が認可した範囲外で、R-10『carveout は allow を増やす方向にのみ作用する』と同一文書内で矛盾する。落ちる実証節にも conversational / human-wait の Red も無退行 pin も無い(1〜5 は question/compose/非対話/unique/fail-closed のみ)。4 carveout それぞれについて『対話性を課すか』『終端束縛を課すか』を明示し、狭める側の変更には無退行 pin を対で置くこと。
- FOLLOW-UP | business-logic-model.md §改修後のフロー 2 | 『裁定終端の解決』の読み口が未指定。hook は spawn される別プロセスで engine とは runEngineNextKind の directive kind 文字列でしか会話しない(実測: amadeus-stop.ts:925 `const kind = runEngineNextKind();` と :932/:947/:953 の kind 分岐のみ)。『梯子が残した記録から読む』とあるが、その記録の所在(ファイル・フィールド・スキーマ)と U1 側の公開責務が名指されていないため、R-5 の束縛が実装時に検査不能な入力へ依存する。dependency 文書の統合ポイント『U1 → U3/U4/U5/U8: RecommendationOutcome 型』を、hook が読める具体面まで降ろして input として記述すること。
- NIT | business-rules.md R-3 出典欄 | 出典を『ADR-5 Decision(留保)』としているが、decisions.md ADR-5 には ADR-2 のような独立の留保節はなく、transcriptIsConversational の扱いは Decision 本文の一部(逐語『transcriptIsConversational(amadeus-stop.ts:569)は補助信号のまま、セッション判定を上書きしない』)。内容の転写は正確なので表記のみの指摘。
- NIT | business-logic-model.md §記録 | recordHookDrop の行範囲を :984-989 / :999-1004 / :1019-1024 と記すが、実測では呼出は 984 / 999 / 1019 から始まり各ブロックは allowStop まで(grep -n 'recordHookDrop(' hooks/amadeus-stop.ts → 967, 984, 999, 1019)。他の全引用(:141-147 / :158 / :160-163 / :170-181 / :192-205 / :422-443 / :448-463 / :450-452 / :481-514 / :485 / :569 / :737-753 / :744 / :925-929 / :932-934 / :947-949 / :953-955 / :966 / :983 / :998 / :1018 / :1031 / :1047)は行単位で一致を実測確認済み。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:57:26Z
- **Iteration:** 2
- **Scope decision:** none

iteration-1 の BLOCKER は実質解消(4 carveout の適用範囲表・保存規則・無退行 pin 6/7・終端読み口の具体化がすべて上流逐語で裏付けられる)が、規則 ID R-11 と R-12 がそれぞれ 2 つの別規則に重複付番され、適用範囲表・落ちる実証・domain-entities の参照が一意に解決できない。

### Findings

- BLOCKER | business-rules.md 規則表(:30 と :32、:31 と :33)+ domain-entities.md(:35 と :43/:53)| 規則 ID が重複しトレース不能。business-rules.md には R-11 が 2 つ(:30『carveout 1(human-wait)は一切変更しない』/ :32『継続上限 stopContinuationBlockCap :141-147、stopBudgetMode :160-163、hard cap 10 :158 は変更しない』)、R-12 も 2 つ(:31『carveout 4(conversational)は現行意味論を保存』/ :33『carveout で allow したときは source と carveout 種別を recordHookDrop に残す』)ある。この ID は他所から参照されており一意解決を要求する — 適用範囲表 :11『R-11 のみ(保存)』/ :14『R-12 のみ(保存)』、落ちる実証 :48『R-11 / R-12 は「変えない」規則』/ :50『R-11 の無退行 pin』/ :51『R-12 の無退行 pin』、および domain-entities.md :35『保存対象(R-11 / R-12)』に対し、同 :43『不変(R-11)』と :53『継続上限(R-11)』は別の R-11 を指す。code-generation がテストを R-* へ trace する前提(business-rules は検査可能な述語集合)が崩れるため、機械的な再付番(重複する後段 2 件を R-14 / R-15 等へ)と全参照箇所の追随が必要。規則の内容そのものに問題はない。
- FOLLOW-UP | business-logic-model.md §改修範囲の確定 表 :27(carveout 3 の終端束縛)| pending-compose の終端束縛を「compose 承認は全 mode で人間専権 = 裁定順序 1 のため marker が fresh なら束縛は自動的に成立」とし、記録読取を不要としている。この前提は RFC-0001 の ToBe 行 19(逐語『intent birth / compose 承認 | 人間 | 人間(現行維持。変更は Q13)』、`amadeus/spaces/default/specs/rfc/0001-intent-autonomy-modes.md:106`)と整合するが、行 19 は Q13 での変更可能性を明記している。Q13 が将来 compose 承認を自動裁定側へ動かした場合、この自動成立は無条件 allow に退化する。束縛の根拠が「行 19 が人間専権であること」に依存していることを規則側(R-5 相当)に明記しておくと、行 19 が動いたときに検査で捕まる。
- NIT | business-rules.md :23(R-4 の出典欄)| D10 の根拠列の引用は実測一致を確認した。RFC-0001 付録 C の D10 行(`amadeus/spaces/default/specs/rfc/0001-intent-autonomy-modes.md:281`)の根拠列は逐語『`amadeus-stop.ts:449-452`(`isPendingQuestionStop`)、同 `isPendingComposeStop`(full で無効 — コメント逐語 "an unattended run has no human to answer the gate")』で、conversational(:744)を含まない。したがって :744 を撤去対象から外す iteration-2 の判断は上流に裏付けられている(参考: 同 :16 のフロントマターも `hooks/amadeus-stop.ts(D10 — 質問/compose carveout)`)。
- NIT | domain-entities.md :21 / business-logic-model.md §改修後のフロー 2 | 新規引用も実測一致。`readProductionAutonomyProjection` の import は hooks/amadeus-stop.ts:105、使用は :176 / :200(grep -rn 'readProductionAutonomyProjection' hooks/ の全 hit)。`AutonomyProjection` は amadeus-intent-autonomy.ts:165-182 で、`readonly parkEnvelope: ParkEnvelope | null;` は :176 に実在。`:543-546` の in-process 検査の先例コメント、`:381-391`(isHumanWaitStop に autonomy guard なし)、:966 / :983 / :998 / :1018、recordHookDrop :967 / :984 / :999 / :1019 も再実測で一致。

## Review — Post-repair verification(quality repair 経路)

- Iteration 2 の NOT-READY(規則 ID 重複)は reviewer_max_iterations=2 到達のため §12a の quality repair 経路で処理: `amadeus-bolt observe-quality` に NOT-READY 観測(evidenceFingerprint `sha256:9f60405b…`)→ kind **repair** → conductor が再付番是正(R-14/R-15 + 参照追随)→ 独立 reviewer の焦点再検証(invocation `be6d3e07-94ef-4de5-98c7-339b03bab29e`)**READY・BLOCKER 0** → READY 観測(evidenceFingerprint `sha256:5a9c46ed…`)→ kind **READY** でループ終端。
- 一次記録: 監査ログの quality repair イベント列と scratchpad の reviewer 結果 JSON(fd-rev3-b.json)。
