# Decisions — intent 260816-priority-bug-batch-3

requirements.md 未解決事項の方式裁定(FR-1/FR-2/FR-3×2面/FR-5 の計5問)を、ソロ選挙 `E-260817-PBB3-FIX-METHODS`(2 fresh subagent voter、blind 配布)で実施した。q1/q5 は 2-0 established、q2/q3/q4 は tie hold となり正準リスト第1項(選挙の可否同数)によりユーザー裁定(2026-08-17 実 HUMAN_TURN、AskUserQuestion 応答)で確定した。票の全文(rationale・reservation)は `amadeus/spaces/default/elections/260817-e-260817-pbb3-fix-method/ballots/` が一次記録。**両票の reservation は採択案の実装契約として functional-design / code-generation を拘束する**(cid:code-generation:c1 の裁定様式)。

## ADR-1: #3153 の結線方式 = milestone 限定の presence 境界変更(q1、選挙 2-0)

- **Context**: human-required 宣言 milestone ゲートが、別目的の未消費 HUMAN_TURN で承認される(FR-1)。
- **Decision**: human-required 宣言 occurrence かつ interactionKind ∈ {phase-gate, walking-skeleton} に限り、presence 境界を「当該ゲートの `STAGE_AWAITING_APPROVAL` 以降の未消費 HUMAN_TURN」へ狭める。一般 stage-gate の prior-resolution 境界は無改変。
- **実装契約**(両票 reservation の合意分):
  1. 実装は既存 seam の再利用に限る — `scanPresenceLedger` に `STAGE_AWAITING_APPROVAL` を Stage 付き境界イベントとして追加し、`resolveGatePresence` の PresenceSlot を1本足す。第2の独立スキャンを作らない。同秒タイは既存 fail-closed 規則を再利用(#3153 代表例の同一秒3イベントは拒否側へ落ちること)
  2. `interactionKind` は `ProductionAutonomyContext` の戻り値として1定義から供給(amadeus-state.ts 側で再計算しない — cg2-agreeing-predicate-drift 防止)。境界セマンティクスは `humanTurnIsFresh`(presence-reservation)と同一定義を1箇所で共有
  3. `Recovered=true` の backfill gate-start しか無い場合は緩い境界へ fallback せず拒否し、gate-start して再提示するようメッセージで指示(milestone ゲートの gate-start 事実上必須化を契約として明示 — FR-2 の「ゲート未提示0行」と整合)
  4. `GATE_APPROVED` の機械識別フィールドは実行された分岐から導出(gate-open-turn / delegated / intent-grant / guard-disabled)。event-registry と audit-format.md を同一変更で同期(audit-format.md:150 の Presence Reservation Id 欠落 drift も同時是正)
  5. approve-batch 経路(verb-less)は射程外 — milestone ゲートが approve-batch で解決されうる場合は #1647 へ残存穴として明記して申し送る(無言で残さない)
  6. Red は3点 pin: gate-open 前ターンのみ→拒否 / 同配置の通常 stage-gate→承認(非退行)/ gate-open 後ターン→承認
- **Alternatives Rejected**: A(reservation 経路の必須化 — 0票。arm/consume の追加運用が milestone 全ゲートに乗る)、C(occurrence-bound トークン新設 — 0票。新機構追加は P5 違反)。
- **Reversibility**: 中 — 境界分岐は1箇所に集約されるため撤回可能。

## ADR-2: #3152 の冪等化 = 発火点分離 + 冪等鍵(q2、tie → ユーザー裁定 A)

- **Context**: `INTENT_AUTONOMY_HUMAN_REQUIRED` が projection 読取のたびに append される(FR-2)。両 voter は「発火点を read 経路からゲート提示点へ移す」ことに合意し、冪等鍵の上乗せで割れた(s1: 鍵は根本除去後に不要+再提示抑止の懸念 / s2: 再 gate-start・`--recovered` backfill の漏れ経路を実測)。ユーザー裁定 = A(両方)。
- **Decision**: `productionStageAutonomy` から emit を外し純粋読取化。宣言の emit は gate-start(`STAGE_AWAITING_APPROVAL` 発行と同一 operationWithLock 内)で明示的に行い、occurrence 恒等式由来の冪等鍵で shard 内 dedup する。
- **実装契約**(s2 reservation):
  1. 鍵は `createInteractionOccurrence`(intentUuid / kind / stage / phase / interactionId / selector)+ mode + graphRevision を正本とし、鍵生成を1関数へ集約(同意述語複製禁止)
  2. dedup は UNIT_POOL の既存様式(shard 内同一鍵 replay skip)を踏襲。cross-clone 一意性は主張しない。dedup 読取の失敗は fail-open(ゲート無傷)
  3. audit-format.md の当該行へ Idempotency Key を required として追加し正本・生成物・対訳を同一変更で同期
  4. 落ちる実証は2条件を別々に pin: (a) ゲート未開設 `next`×5 → 現行5行 → 修正後0行 (b) gate-start 再実行+approve 失敗再試行 → 現行2行以上 → 修正後ちょうど1行
  5. s1 の計数意味論の懸念への応答: reject 後の正当な再提示は新しい gate-open として新 occurrence 扱いになるか FD で occurrence 境界を定義し、「人間を何回止めたか」の計数が実提示回数と一致することをテストで確認する
- **Alternatives Rejected**: B(鍵のみ — read 経路の初回1行が残り AC 未達)、C(移動のみ — backfill/再試行の漏れ経路が実測済み)。
- **Reversibility**: 高 — emit 呼出点と鍵検査は局所的。

## ADR-3: #3149 クラスA = センサーを直す(converged は final のまま)(q3、tie → ユーザー裁定 A)

- **Context**: 「converged = final」(CLI)×「non-landed = live checkout 束縛」(センサー)の閉路(FR-3 クラスA)。s1 は CLI への converged→landed 遷移追加を、s2 はセンサー束縛の是正を支持して割れた。ユーザー裁定 = A(センサー側)。
- **Decision**: センサーの束縛選択を kind ベースから **attestation ベース**へ置き換える(「receipt が merge facts を attest しているか」で分岐、kind 分岐は削除して全 kind に同一規則)。merge facts の供給は CLI の merged arm が **kind: converged のままの in-place finalisation** として行う(`transitionAllowed` 無改変、既決ノルム converged-final-no-landed-rewrite 維持、attestation は打ち直して canonical audit 行を append)。
- **実装契約**(s2 reservation + s1 の caveat を制約化):
  1. merge facts 採取の条件は attested prHead == merged headRefOid または `verifyMergedEpochAncestry` の proof 成立。祖先が測れない場合は ADR-4 の経路へ回し、ここで救わない(証拠水準を landed arm より緩めない)
  2. センサーは無ネットワークのまま(receipt が attest した事実だけから決定的判定)— s1 の「センサーの GitHub 依存」懸念はこの契約で排除される
  3. kind 分岐の除去時は `checkCheckoutBinding` 冒頭の排他前提コメント含め、kind で分岐している箇所を grep 全列挙してから着手
  4. 落ちる実証: converged mint → HEAD 前進 → 現行 FAIL を Red 実測 → in-place finalisation 後 PASS。負例: attestation を伴わない手書き merge facts が引き続き FAIL(偽造経路にならないこと)
- **Alternatives Rejected**: B(converged→landed 再 mint — landed は converged:false を構造要求するため最強実測 verdict が消える(P2)、既決ノルムの反転を要する)。
- **Reversibility**: 中 — センサーの束縛規則は1関数に集約される。

## ADR-4: #3149 クラスB = human-presence 付き override のみ(q4、tie → ユーザー裁定 B)

- **Context**: rebase 孤児化 created の回復経路(FR-3 クラスB)。s2 の実測により、実在の孤児化3件はすべて merged head と tree 不一致・patch-id 不一致(別内容 — #3128 は merged 側に attested に無い16コミット)であることが確定。機械的同値証明は観測コーパスで一度も発火しない(観測レンジ外の機構 — c1-threshold-inside-observed-range)。ユーザー裁定 = B(override のみ)。
- **Decision**: 機械的同値証明の経路は作らない。report の merged arm に human-presence 付き override 系の最終化を追加する。
- **実装契約**(s2 reservation + s1 の fail-closed 懸念を情報提示で取込):
  1. live checkout 前提は `verifyLandedPrerequisites` と同じ緩和で置換(created attestation の live 有効性を要求して閉路にしない)
  2. 人間承認は既存 presence 機構(HUMAN_TURN 由来)で取る。既存 kind を使い新 kind を作らない。reason に祖先証明の失敗を実測の逐語(attested <sha> / merged <sha>)で記録し再導出可能にする — override 提示時にこの実測を人間へ表示する(s1 の「測定結果を見ずに承認するラバースタンプ化」懸念への応答)
  3. override finalisation でも merge facts を実測して attest し、ADR-3 の attestation ベース束縛に乗せる(checkout 束縛の同型閉路へ落ちない)
  4. 実装時にクラスB3件の現存性と patch 等価を再実測し、等価が成立する例が現れたら本裁定を再度選挙にかける
  5. 落ちる実証: 孤児 epoch への現行拒否を Red 実測 → human presence 付き override で PASS。負例: presence 不在では拒否
- **Alternatives Rejected**: A / C の機械証明経路(観測コーパス3件全てで不成立を実測済み — 受け入れテストが合成例しか持てない)。
- **Reversibility**: 高 — 将来、真の同値ケースが観測されたら機械経路を追加する再裁定が可能(契約4)。

## ADR-5: #3046 の並行安全化 = 採番の voter スコープ化(q5、選挙 2-0)

- **Context**: `appendPending` の全体読み→全体 max+1 採番→per-voter 書込の TOCTOU(FR-5)。
- **Decision**: 採番の読取を自 voter ファイルに閉じ(voter ローカル max+1)、一意性検査を (voter, arrivalSequence) 複合キーへ、全体順序を (arrivalSequence, voter) の決定的辞書式へ変更する。ロックは導入しない — TOCTOU をタイミングではなく構成で消す。
- **実装契約**(両票 reservation の合意分):
  1. 読取集合と書込集合をともに当該 voter の1ファイルへ一致させる(readAllPending を採番に使う経路を残さない — 明示テストで pin)
  2. 比較関数は1箇所へ集約し全消費点で共有。voter 内の順序(amendment 連鎖)は voter ローカル単調性で厳密保存 — cross-voter 順序に意味論を持たせない
  3. D-09 の設計コメント(単一 writer 前提)を同一変更で新不変条件へ書き換える(散文 drift 防止)
  4. 同一 voter の並行二重投稿は last-write-wins のまま(store は corrupt しない)ことを明文化しテストで覆う
  5. 互換シム・移行レイヤ禁止(Issue が破壊的変更を明示許容)
  6. 落ちる実証は実プロセス並行(またはシーム注入の決定的交錯)で corrupt を Red 実測(手書き重複 fixture のみは不可)。修正後は決定的順序 + property(voter ローカル単調・複合一意・到着順非依存の順序決定性)で pin
- **Alternatives Rejected**: B(mkdir ロック — 構成的解消が可能な場面でロックの複雑性を足す)、C(採番廃止 — スキーマ変更最大で受け入れ面が広がる)。
- **Reversibility**: 低〜中 — 破壊的スキーマ変更(許容済み)。

## 裁定の provenance

- 選挙: `E-260817-PBB3-FIX-METHODS`(open 2026-08-17T00:53Z、tally run-1 01:06Z — q1/q5 established、q2/q3/q4 hold reason: tie)
- ユーザー裁定: 2026-08-17 の実 HUMAN_TURN(AskUserQuestion 応答: q2=A / q3=A / q4=B)。tie の裁定は正準リスト第1項のユーザー専権事項
- C9 前例(E-260816-C9-SIGNATURE)に従い、選挙 store は established + hold の混在のまま保持し、ユーザー裁定は本 ADR が一次記録
