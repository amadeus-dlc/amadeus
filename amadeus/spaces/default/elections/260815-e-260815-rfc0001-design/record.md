# Election Record
Election ID: E-260815-RFC0001-DESIGN
Run ID: run-1
Lifecycle: tallied
Established questions: 11
Hold questions: 0
Held question IDs: none

## Question q2-gate-derivation: RFC-0001 Q2: ゲート(stage-gate)の推奨導出器。RFC は裁定順序(専権判定→導出→unique 自動/非 unique 人間・中断)を全裁定点に課すが、ゲートを『質問』と同じ RecommendationOutcome 導出器で扱うか、決定的承認のままにするかは未裁定。現行は production.ts:833-838 が定数 approve を返す。
Established: B: ゲートは決定的承認のまま — sensor/検証の green が前提条件でありゲート自体に選択肢はない(red は既存 fail-closed で停止)。RecommendationOutcome は質問・選挙・失敗裁定系のみに適用し、ゲートへの導入は型だけ共有の unique 固定 (choice 2)
Choice counts:
- Choice 1 A: ゲートも RecommendationOutcome 導出器に載せる — 成果物検証・sensor・ノルム適合が green なら unique(approve)、red/矛盾があれば contested(候補=approve/park+事由)として裁定順序 3 へ。全裁定点で単一概念: 0
- Choice 2 B: ゲートは決定的承認のまま — sensor/検証の green が前提条件でありゲート自体に選択肢はない(red は既存 fail-closed で停止)。RecommendationOutcome は質問・選挙・失敗裁定系のみに適用し、ゲートへの導入は型だけ共有の unique 固定: 2
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x1 3x1 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-16T00:52:00Z] GoA 3: 型の共有は名目でなく実配線とすること — ゲート導出器も RecommendationOutcome を返し、常に unique(approve) に固定する形で FR-4『すべての裁定点が裁定順序に従う』を例外規定でなく構成で満たす。semi のフェーズ境界/WS は裁定順序 1(人間専権)側で表現し、導出器の contested で表現しない。red の blocking sensor と NORM_CONFLICT は現行の fail-closed(guardDenied / park)を維持し、contested の候補へ降格させないこと。
- Reservation subagent-2 [original:2026-08-15T15:57:00Z] GoA 2: B を採るのは『ゲートに選択肢がない』が現に真である限りにおいて。実装時は (i) ゲートも裁定順序ステップ1(人間専権・mode 由来の phase-boundary/WS)を必ず通ること (ii) blocking sensor の未解決(amadeus-state.ts:2104-2131 guardDenied → 修復ループ)と NORM_CONFLICT park が現行どおり loud に残ること (iii) RecommendationOutcome の型は本当に共有し、ゲート専用の並行語彙を作らないこと、を受け入れ条件に固定する。
Late responses:
- None
Run lineage: run-1

## Question q4-semi-effect-ceiling: RFC-0001 Q4: semi の grant-less 設計の維持と効果認可上限。現行 semi は grant なしで workflow-reversible のみ認可。RFC の semi 再定義(full − 人間ゲート 2 種)で advisory 延期(quality-waiver 分類)等の自動化が必要になる。
Established: A: grant-less 維持 + 上限の最小拡張 — semi の効果認可を workflow-reversible + advisory-defer(quality-waiver のうち advisory 延期のみを新分類 advisory-deferral として切り出し)へ。prohibited effects の一般開放はしない (choice 1)
Choice counts:
- Choice 1 A: grant-less 維持 + 上限の最小拡張 — semi の効果認可を workflow-reversible + advisory-defer(quality-waiver のうち advisory 延期のみを新分類 advisory-deferral として切り出し)へ。prohibited effects の一般開放はしない: 2
- Choice 2 B: semi も grant 基盤へ統合 — full と同じ grant 造幣(HUMAN_TURN provenance)を semi にも要求し、効果上限は grant の scope で差別化。grant-less 特例を廃止して認可経路を一本化: 0
- Choice 3 C: grant-less 維持 + advisory 延期は quality-waiver のまま semi の allowedEffects へ個別追加(新分類を作らない最小差分。他の quality-waiver 効果は不可のまま列挙で制御): 0
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x0 3x2 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-16T00:52:00Z] GoA 3: 新分類 advisory-deferral は機構で定義すること — plugin.json の advisories 宣言に対する延期(amadeus-advisory-choice.ts の defer-with-risk)だけを対象とし、blocking sensor verdict・ノルム・カバレッジ等の品質判定には決して適用しない。延期は risk 記録つきで再提起可能であることを不変条件とし、FR-15 の無退行として『quality-waiver 分類の効果(および他の prohibited 4 種)が semi/full の新経路から到達不能』の落ちる実証を別途置くこと。この保証がなければ C ではなく B を選び直すべき。
- Reservation subagent-2 [original:2026-08-15T15:57:00Z] GoA 3: 新分類 advisory-deferral は plugin.json の advisories 宣言由来の advisory severity に限定し、blocking sensor verdict の延期は絶対に載せないこと。落ちる実証を2本要求する: (1) advisory 延期が新分類で自動裁定できる Green (2) blocking 相当の延期が従来どおり prohibited 経路で拒否される Red。これを欠くと advisory-deferral は quality-waiver の改名バイパスに退化する。
Late responses:
- None
Run lineage: run-1

## Question q5-full-inspection-point: RFC-0001 Q5: full の自動裁定の事後検収点。現行はフェーズ境界の人間ゲートが実質の検収点だが full では消滅する。
Established: B: workflow 完了境界に auto-decision 要約レポート(裁定点・選択・根拠の一覧)を機械生成して record へ置き、完了メッセージでユーザーへ提示する軽量検収を新設 (choice 2)
Choice counts:
- Choice 1 A: 専用検収点を新設しない — AUTO_DECIDED の監査列 + §12a 独立レビュー + workflow 完了時の goal reconciliation が検収を構成する(監査可能性=検収)。既存 /amadeus-replay 等の read-only スキルで事後閲覧: 0
- Choice 2 B: workflow 完了境界に auto-decision 要約レポート(裁定点・選択・根拠の一覧)を機械生成して record へ置き、完了メッセージでユーザーへ提示する軽量検収を新設: 2
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-16T00:52:00Z] GoA 2: レポートは監査イベント(AUTO_DECIDED 行)からの機械生成のみとし、LLM 側の計数・要約で作らないこと(P2)。ワークフローを止めるゲートにはせず、完了メッセージへの提示に留める。
- Reservation subagent-2 [original:2026-08-15T15:57:00Z] GoA 2: レポートは AUTO_DECIDED の監査レコードと既存 list-auto-decisions / get-auto-decision(amadeus-bolt.ts:1317)からの機械生成に限り、conductor の散文要約を混ぜないこと。件数は集計コマンド出力からの転記とし、また本レポートを新たな blocking ゲートにしないこと(full の無人完走性を壊さない)。
Late responses:
- None
Run lineage: run-1

## Question q7-noninteractive-park-contract: RFC-0001 Q7: 非対話中断(FR-3)の resume 契約 — 記録内容・再開者・park 会計。非対話セッションには HUMAN_TURN が存在しないため現行 park の provenance 前提が使えない。
Established: B: #1241 の一級 wait directive を park と別の状態として新設 — workflow state に waiting(理由・再提示ペイロード)を追加し、park(人間都合の中断)と裁定待ち(機構都合)を状態機械上で分離 (choice 2)
Choice counts:
- Choice 1 A: 既存 park 機構を拡張 — park 理由に RecommendationOutcome(contested の候補・根拠・非一意事由)を構造化記録し、resume 時に同内容を AskUserQuestion 相当で再提示。park 会計は新 provenance 種 non-interactive-interruption(HUMAN_TURN 不要・裁定不能事由に束縛)を導入。再開者は次の対話セッションの人間または full 対話 conductor: 0
- Choice 2 B: #1241 の一級 wait directive を park と別の状態として新設 — workflow state に waiting(理由・再提示ペイロード)を追加し、park(人間都合の中断)と裁定待ち(機構都合)を状態機械上で分離: 2
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x1 3x1 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-16T00:52:00Z] GoA 2: 新設 waiting が park の第二経路にならないこと — 待ち状態への admission は Q8 の事由オブジェクト(裁定点 id・候補・導出過程)へ束縛し、park 側の HUMAN_TURN 会計(1 ターン=1 park、amadeus-state.ts:1595-1600)は無改変で残す。Stop hook と state validation が waiting を当該セッションの正当な終端として扱うこと、および Q14=A(REPAIR_STALLED と別状態)と同時に成立させることを前提とする。
- Reservation subagent-2 [original:2026-08-15T15:57:00Z] GoA 3: wait 状態は engine 発行専用とし、AI/利用者が直接呼べる CLI verb を与えないこと(与えると自己 park 脅威が新しい入口を得る)。park の人間実在会計(#365/#3016、amadeus-state.ts:1574-1605 の『1 HUMAN_TURN = 1 park』不変量)は無改変で残し、wait には contested ペイロード(候補・根拠・非一意事由)を格納して復帰時に同内容で再提示できることをテストで pin する。
Late responses:
- None
Run lineage: run-1

## Question q8-self-park-threat: RFC-0001 Q8: park guard 廃棄後の自己 park 脅威(作業回避・偽の人間実在 — #365/#3016 の脅威モデル)を何で防ぐか。
Established: B: A + レート制約 — 同一裁定点での反復中断を検知して 2 回目以降は REPAIR/エスカレーション経路へ倒す機械ガードを追加 (choice 2)
Choice counts:
- Choice 1 A: 事由の構造化束縛 — 非対話中断は RecommendationOutcome の contested/none または人間専権事項の到達のみを事由として許可し、事由オブジェクト(裁定点 id・候補・導出過程)を監査へ append。自由文 park は対話セッション(実 HUMAN_TURN 承認)限定に保つ: 0
- Choice 2 B: A + レート制約 — 同一裁定点での反復中断を検知して 2 回目以降は REPAIR/エスカレーション経路へ倒す機械ガードを追加: 2
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x1 3x1 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-16T00:52:00Z] GoA 3: レート制約のキーは『裁定点 id + 導出根拠の digest』とし、根拠が実質変化した場合(人間の部分回答後の再 contested 等)は正当な再中断として通すこと。2 回目以降を一律 REPAIR(欠陥終端)へ倒すと健全な待ちが欠陥に化けるため、まずエスカレーション経路へ、欠陥判定は別条件で行う設計にすること。
- Reservation subagent-2 [original:2026-08-15T15:57:00Z] GoA 2: 反復判定の鍵は occurrenceId + basis fingerprint とし(production.ts:805 が既に occurrenceId で自動裁定の重複を判定している)、根拠が実際に変わった再到達を『反復』と誤カウントしないこと。エスカレーション先は必ず人間/REPAIR であり、レート超過を理由に自動続行へ倒す分岐は作らないこと。
Late responses:
- None
Run lineage: run-1

## Question q10-s13-zero-mechanization: RFC-0001 Q10: §13『候補 0 件』判定の機械化。現行は AI の自己申告で 0 件確認選挙(実測 79 件・情報量ほぼゼロ)。
Established: B: A に加え conductor 追加候補の申告枠を残す — surface=0 でも conductor が候補を追加でき、その場合のみ裁定発火(自己申告は『増やす』方向のみ許可、『0 件にする』方向の申告は不可) (choice 2)
Choice counts:
- Choice 1 A: surface コマンド出力を正本化 — amadeus-learnings surface の candidates 配列と diary 実エントリ数(テンプレートコメント除く)の機械判定で 0 件を確定し、0 件時は選挙・梯子を発火させない(監査に surface 出力 digest を記録)。非 0 件時のみ選定裁定: 0
- Choice 2 B: A に加え conductor 追加候補の申告枠を残す — surface=0 でも conductor が候補を追加でき、その場合のみ裁定発火(自己申告は『増やす』方向のみ許可、『0 件にする』方向の申告は不可): 2
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x1 3x1 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-16T00:52:00Z] GoA 3: conductor が追加する候補も disk 上の記録(diary エントリ等)から再導出可能であることを要件とし、申告だけで候補が存在する経路を作らないこと。監査には surface 出力の digest と追加候補集合の双方を記録する。
- Reservation subagent-2 [original:2026-08-15T15:57:00Z] GoA 2: 『増やす』方向の申告も監査に残すこと — 0 件確定は surface 出力の digest のみを根拠とし(conductor の散文は根拠にしない)、追加候補は surface digest への追記として記録して、追加の有無が事後に機械再導出できる形にする。
Late responses:
- None
Run lineage: run-1

## Question q11-stop-hook-redefinition: RFC-0001 Q11/D10: Stop hook の継続強制と質問/compose carveout の semi/full 再定義。対話モードの full は人間裁定へ到達するためターンを返せる必要がある。
Established: A: 対話性で分岐 — セッションが対話(FR-2 検出)なら、裁定順序 3 到達時(contested/専権)の質問提示・compose 保留でターン返却を許可。非対話なら現行の継続強制を維持し FR-3 の中断へ倒す。carveout の判定は RecommendationOutcome の終端種別に束縛 (choice 1)
Choice counts:
- Choice 1 A: 対話性で分岐 — セッションが対話(FR-2 検出)なら、裁定順序 3 到達時(contested/専権)の質問提示・compose 保留でターン返却を許可。非対話なら現行の継続強制を維持し FR-3 の中断へ倒す。carveout の判定は RecommendationOutcome の終端種別に束縛: 2
- Choice 2 B: mode で分岐 — full だけ Stop hook の継続強制を全面解除し、semi/none は現行維持(対話性検出を Stop hook に持ち込まない): 0
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-16T00:52:00Z] GoA 2: Stop hook が読む対話判定は FR-2 / --status と同一ソース(HUMAN_TURN 造幣パイプライン由来の実効判定)から取り、hook 内で独自再導出しないこと(UI 真実性の契約 3)。transcriptIsConversational(amadeus-stop.ts:569)は現行位置の補助信号に留め、判定不能時は非対話へ fail-closed。
- Reservation subagent-2 [original:2026-08-15T15:57:00Z] GoA 2: Stop hook 内の transcript 分類(transcriptIsConversational — amadeus-stop.ts:569)はあくまで補助信号に留め、セッション単位判定(FR-2 / mintHumanPresence 一次信号)を上書きしないこと。信号が不明・読めない場合は RFC Guide-level どおり非対話へ fail-closed。
Late responses:
- None
Run lineage: run-1

## Question q14-park-representation: RFC-0001 Q14: 修復不能停止(REPAIR_STALLED)と非対話中断を同じ park 表現に載せるか分けるか。
Established: A: 分離 — REPAIR_STALLED は欠陥系の終端(是正が必要)、非対話中断は健全な裁定待ち。状態・監査イベント・resume 経路を別に保ち、混同による誤 resume を構造的に防ぐ (choice 1)
Choice counts:
- Choice 1 A: 分離 — REPAIR_STALLED は欠陥系の終端(是正が必要)、非対話中断は健全な裁定待ち。状態・監査イベント・resume 経路を別に保ち、混同による誤 resume を構造的に防ぐ: 2
- Choice 2 B: 統合 — 単一の中断表現に reason 種別を持たせ、状態機械の分岐を増やさない: 0
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-16T00:52:00Z] GoA 2: reason 語彙・提示様式(候補+根拠+非一意事由)は両者で共有してよいが、状態・監査イベント・resume 経路は分けること。Q7=B の waiting 新設と同一設計として一体で実装し、park / waiting / REPAIR_STALLED の 3 終端の遷移表をテストで pin すること。
- Reservation subagent-2 [original:2026-08-15T15:57:00Z] GoA 2: 分離しても利用者向けの resume 入口は 1 つに保ち、記録された種別で内部 dispatch すること。REPAIR_STALLED からの resume は是正証跡の記録を要求して fail-closed にし、『裁定待ちのつもりで欠陥を再開する』誤 resume を型で塞ぐ。
Late responses:
- None
Run lineage: run-1

## Question q15-grant-ceremony: RFC-0001 Q15: grant ceremony(preview-autonomy → set-autonomy の 2 段 + display digest 確認)の簡素化と、相互必須不変量・発効前プレビュー(nonAutoDecidedKinds 提示)の扱い。
Established: B: 現行 2 段を維持(preview の人間可読提示と発効の分離が確認の実質 — 統合は確認の形骸化リスク) (choice 2)
Choice counts:
- Choice 1 A: 2 段を 1 verb に統合(set-autonomy --mode が preview 内容を stdout に出し、同一実行内で digest を自己確認して発効)。ただし AskUserQuestion 等の実 HUMAN_TURN provenance 要求と nonAutoDecidedKinds の提示内容は不変 — 簡素化は往復回数のみ: 0
- Choice 2 B: 現行 2 段を維持(preview の人間可読提示と発効の分離が確認の実質 — 統合は確認の形骸化リスク): 2
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-16T00:52:00Z] GoA 2: 現行 2 段の維持は往復の据え置きであって改善不要の意味ではない — preview の出力を nonAutoDecidedKinds 含め 1 画面で読める形へ改善し、相互必須不変量(preview なしの発効拒否・digest 不一致の拒否)の落ちる実証を本 intent で置くこと。
- Reservation subagent-2 [original:2026-08-15T15:57:00Z] GoA 2: 簡素化を否決する代わりに往復の摩擦は文書・出力で下げること — preview-autonomy の出力に nonAutoDecidedKinds と併せて『次に打つべき set-autonomy --mode <m> --confirmed-display-digest <digest>』を貼り付け可能な完全形で印字する(確認の実質は変えず、手数だけ減らす)。
Late responses:
- None
Run lineage: run-1

## Question q18-consent-key-rename: RFC-0001 Q18(Q17 派生): consent 軸キー(intent-mirror.github.issue.mode / finding.github.issue.creation.mode)から『mode』の語を外す改名の要否。UI 真実性の契約下で autonomy mode との語彙衝突が残る。
Established: A: 改名する — *.github.issue.consent(語彙: manual/auto 等は維持)へ。旧キーは loud fail(solo-election.trigger.mode の廃止と同じ流儀・同一 PR)。文書・テスト・投影を同一変更で同期 (choice 1)
Choice counts:
- Choice 1 A: 改名する — *.github.issue.consent(語彙: manual/auto 等は維持)へ。旧キーは loud fail(solo-election.trigger.mode の廃止と同じ流儀・同一 PR)。文書・テスト・投影を同一変更で同期: 2
- Choice 2 B: 改名しない — キー名は維持し、文書と --status 表示で consent 軸であることを明示(改名の波及コスト > 語彙混同の実害): 0
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x0 3x2 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-16T00:52:00Z] GoA 3: Q17 の solo-election.trigger.mode 廃止と同一 PR・同一 loud fail 機構で行い、旧キーのエラーメッセージが新キー名を明示すること。本 workspace の amadeus/config.json、docs、tests、投影面を同一変更で同期し、語彙(manual/auto)は不変とする。同一 PR で全面同期できないなら B を選び直すべき。
- Reservation subagent-2 [original:2026-08-15T15:57:00Z] GoA 3: 改名は solo-election.trigger.mode 廃止と同一 PR に載せ、旧キーの loud fail は既存の LEGACY_KEY_REPLACEMENTS 経路(amadeus-config.ts:706-716 — valueConversion 併記)を再利用し互換シムは作らないこと。文書・テスト・投影・registry(config.ts:585 / :615)の同期を同一変更で行い、移行面が solo-election の先例より有意に大きいと実測されたときの退避先は B(改名しない)であって無音互換ではないことを明記する。
Late responses:
- None
Run lineage: run-1

## Question q19-contested-rate-criterion: RFC-0001 Q19: contested 発火率の受け入れ基準(頻度予算の機械化)。RFC は『真に人間の判断が要る面は全体の 1 割未満』を実測済み。閾値は観測レンジ内側に置く(c1-threshold-inside-observed-range)。
Established: B: 受け入れテストは発火率でなく『機構起因クラスの contested 0 件』(172 件・79 件クラスの fixture が contested を出さないこと)で固定し、割合閾値は導入しない(母数依存の割合は fixture 構成で恣意化するため) (choice 2)
Choice counts:
- Choice 1 A: 実装後の検証固定 — 本 intent の build-and-test で、代表 fixture 群(付録 B の停止クラス再現 + 通常進行)に対する contested 発火率 < 10% を受け入れテストで固定し、実運用の恒常監視は metrics スナップショットの観測項目に追加(閾値運用は次 intent で実測レンジを見て裁定): 0
- Choice 2 B: 受け入れテストは発火率でなく『機構起因クラスの contested 0 件』(172 件・79 件クラスの fixture が contested を出さないこと)で固定し、割合閾値は導入しない(母数依存の割合は fixture 構成で恣意化するため): 2
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x0 3x2 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-16T00:52:00Z] GoA 3: 0 件クラスに『通常進行 fixture』も含め、機構起因クラスだけでなく平常経路で contested が湧かないことを同じ述語で固定すること。発火率自体は閾値なしの観測項目として metrics スナップショットへ出し、次 intent が実測レンジ(観測最小 < 閾値 < 観測最大)を見て閾値を裁定できる材料を残すこと。
- Reservation subagent-2 [original:2026-08-15T15:57:00Z] GoA 3: B を採るうえで 2 点を条件とする: (1) 0 件固定の fixture 群に付録 B の 172 件クラス(phase-gate 106 / walking-skeleton 66)と 79 件クラス(§13 0 件確認)の再現を必ず含めること (2) 割合閾値は導入しないが、contested の発火件数と裁定点クラスを metrics スナップショットの観測項目として追加し、実運用の観測レンジが溜まってから次 intent で閾値を裁定できる素地を残すこと(c1-threshold-inside-observed-range の両側固定は実コーパスでしか成立しない)。
Late responses:
- None
Run lineage: run-1

## Timeline
- tallied at=2026-08-15T15:57:37Z run=run-1