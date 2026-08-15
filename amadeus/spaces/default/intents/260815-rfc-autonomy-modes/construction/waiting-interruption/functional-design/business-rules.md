# Business Rules — unit waiting-interruption(U3)

> 各規則は FR / ADR / 選挙留保のいずれかへ trace する。R-* はテスト可能な述語として書く。落ちる実証(Red)の期待は §落ちる実証 に集約する。

## park guard の廃棄

**R-1**(FR-3、ADR-4): `Construction Autonomy Mode` が autonomous で未消費 HUMAN_TURN が 0 件でも `park` は成功する。`amadeus-state.ts:1600` の拒否条件は存在しない。
検証: 台帳に HUMAN_TURN を持たない autonomous fixture で `park` が exit 0 を返し、`WORKFLOW_PARKED` が 1 件出ること。

**R-2**(components.md C4「park の HUMAN_TURN 会計は無改変」): 未消費 HUMAN_TURN が存在する状態での park は、従来どおりその turn を 1 件消費する(1 turn = 1 park)。
検証: 未消費 1 件の状態で park を 2 回試み、2 回目の会計上の未消費件数が 0 のままであること(既存会計テストの無退行)。

**R-3**(FR-15 無退行): `handlePark` の他の拒否は保持される — `Status === "Completed"`(`:1608-1610`)と `Current Stage` 不在(`:1612-1614`)。
検証: 両条件で従来と同じエラー文字列・exit 非 0 を返すこと(既存テストの無改変 Green)。

**R-4**(requirements.md NFR「新分岐は無音バイパス・環境変数逃げ道を作らない」): guard 廃棄後に新設する admission 経路には環境変数による off-switch を設けない。`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` を含むいかなる env も admission を素通りさせない。
検証: 当該 env を設定した状態でもレート制約の refuse が発生することを実測。

**R-5**(FR-8 UI 真実性): 実装から消えた規則の説明文をコード・文書に残さない。`:1574-1595` の guard 解説コメントは条件と同時に除去する。
検証: guard の前提を述べる文字列(`must keep moving` を含む断片)がソースに残っていないことの grep(exit code を確認したうえでの不在確認 — team.md 検証・実測規律)。

## waiting 状態

**R-6**(ADR-4、components.md C4): waiting は engine 発行専用である。AI または利用者が直接呼べる CLI verb を持たない。
検証: `amadeus-state.ts` / `amadeus-bolt.ts` の subcommand dispatch 表に waiting 系の verb が追加されていないことの構造検査。

**R-7**(ADR-4): waiting への admission は事由オブジェクトへ束縛される。`occurrenceId` / `outcome` / `derivationTranscript` / `basisFingerprint` のいずれかを欠く `WaitingCause` では waiting へ入れない。
検証: 4 フィールドをそれぞれ 1 つずつ欠いた 4 入力が `WaitingRefusal` を返し、状態が変わらないことを実測。

**R-7a**(business-logic-model.md §2.1): `WaitingCause` の永続面は Intent autonomy トランザクション台帳のみである — `AutonomyRuntimeEvent`(`amadeus-intent-autonomy-runtime.ts:49-87`)の waiting 判別子の payload として、`INTENT_AUTONOMY_TRANSACTION_COMMITTED` 監査行へ格納する。record 配下の専用 runtime ファイル、Runtime State の新フィールド、`WORKFLOW_WAITING_*` 監査イベントの属性のいずれにも事由本体を書かない。
検証: waiting へ入れた後、(i) `amadeus-state.md` の差分が `Parked` 系フィールドを含まないこと (ii) `<record>/.amadeus-*` に新規ファイルが増えないこと (iii) 台帳の replay から `WaitingCause` が完全に復元できること、の 3 点を実測。

**R-7b**(business-logic-model.md §2.1、domain-entities.md): `ParkEnvelope`(`amadeus-intent-autonomy.ts:156-163`)は 6 フィールド固定のまま変えない。waiting の識別は既存フィールドのみで行う — `triggerOccurrenceId` に occurrenceId、`resumeCondition.evidenceFingerprint` に basisFingerprint、`parkTransactionId` に台帳トランザクションへの参照。
検証: `ParkEnvelope` のフィールド数が 6 のままであることの構造検査。waiting の envelope から台帳を引いて事由が得られること。

**R-7c**(`amadeus-intent-autonomy.ts:1104` の `SAFE_ID` 検査): `ResumeCondition.identity` には自由文を入れない。`autonomyStableId` による導出 ID のみを入れる(`parkForHuman` が `amadeus-intent-autonomy-runtime.ts:496-497` で行うのと同形)。
検証: waiting の resume 条件が `validateResumeCondition` を通ること。自由文を入れた入力が `ILLEGAL_STATE:resume-condition` で落ちること。

**R-7d**(business-logic-model.md §2.2): `WORKFLOW_WAITING_ENTERED` / `WORKFLOW_WAITING_RESUMED` はライフサイクルマーカーであり、事由の格納先ではない。属性は Stage / Occurrence Id / Basis Fingerprint / Transaction Id / Timestamp に限り、`outcome`・`derivationTranscript`・`interactivityBasis` を持たない。マーカーと台帳が食い違う場合は台帳が正である。
検証: マーカーの属性集合が宣言どおりであること(event-registry の requiredAttributes / optionalAttributes の実読)。マーカーの各属性が台帳から再導出できること。

**R-8**(ADR-4、FR-1): `WaitingCause.outcome` は `contested` または `none` のみを取る。`unique` を格納できない(一意に決まった裁定は中断の理由にならない)。
検証: `unique` を渡す呼び出しが型として構築できないこと(構造検査)。

**R-9**(ADR-4 Q8=B): レート制約の鍵は `occurrenceId + basisFingerprint` である。同一鍵での再到達は拒む。照合の読み口は R-7a の台帳のみで、実行中プロセスのメモリに保持した状態を鍵の根拠にしない。
検証: 同一 `occurrenceId` かつ同一 `basisFingerprint` の 2 回目の admission が `RateRefusal` を返すこと。

**R-9a**(ADR-4「セッション跨ぎ」、business-logic-model.md §3.1): レート鍵の照合はセッションを跨いで成立する。前セッションで waiting へ入った事由は、新しいプロセスでの replay 後も同一鍵として検出される。
検証: 1 回目の admission 後にプロセスを終了し、新しいプロセスで同一鍵の admission を試みて `RateRefusal` になることを実測(メモリ状態を共有しない条件で)。

**R-10**(ADR-4「根拠が実質変化した再到達は正当」): `occurrenceId` が同一でも `basisFingerprint` が異なる再到達は許可される。
検証: 同一 occurrenceId・異なる fingerprint の 2 回目が許可されること。

**R-11**(ADR-4「超過はエスカレーションのみ(自動続行分岐なし)」): レート超過時の遷移先は人間または REPAIR のみである。「超過したので進む」分岐は存在しない。
検証: 超過経路のすべての戻り値が停止系であること(網羅的な分岐検査。自動続行を返す枝がないこと)。

**R-12**(FR-3、RFC-0001 Guide-level): 非対話セッションで裁定順序 3(unique 以外)または人間専権事項に到達した実行は、理由付きで waiting へ入る。走り続けない。
検証: 非対話 fixture で contested を返す裁定点を通したとき、waiting へ入り次段のステージが実行されないこと。

## 3 終端の分離

**R-13**(ADR-4 Q14=A): park / waiting / REPAIR_STALLED は状態(`StopReason`)・監査イベント・resume 経路の 3 面で相互に区別できる。3 終端の遷移表をテストで pin する。
検証: 3 終端 × (進入 / 提示 / resume) の遷移表テスト。各セルが他の 2 終端と異なる値を持つこと。

**R-14**(FR-8): waiting の終端提示は `parked` directive を用いず、固有の directive kind を持つ。
検証: waiting 中の `next` が返す directive の `kind` が `parked` でないこと。`amadeus-directive.ts` の検証テーブルが新 kind の必須フィールドを強制すること。

**R-15**(functional-design-questions.md Q2 のスコープ判断、FR-15 無退行): REPAIR_STALLED の現行提示(`amadeus-orchestrate.ts:3186` および `:6156` の `parkedDirective` 経由)は本 unit では変更しない。
検証: REPAIR_STALLED の既存 directive テストが無改変で Green。

**R-16**(component-methods.md C4): resume の入口は 1 つ(`resumeInterruption`)で、記録種別により内部 dispatch する。種別ごとに別の公開入口を作らない。
検証: 3 種の記録それぞれで単一入口から正しい経路へ分岐すること。

**R-17**(component-methods.md C4): REPAIR_STALLED の resume は `remediationEvidence` を要求し、欠く場合は refuse する(fail-closed)。
検証: 証跡なしの REPAIR resume が exit 非 0 と理由を返し、状態を変えないこと。

**R-18**(ADR-4 Alternatives Rejected Q14-B): 記録の種別が判定できない場合、resume は refuse する。park 扱いへフォールバックしない。
検証: 種別フィールドが壊れた記録で resume が refuse すること。

## 再提示の忠実性

**R-19**(RFC-0001 Reference-level UX 契約、FR-1): waiting へ格納した `WaitingCause` は、resume 時に **同内容** の `RulingPresentation`(候補 + 各候補の根拠 + 非一意事由 + 推奨順)として再提示される。
検証: round-trip プロパティ(fast-check、固定 seed・低 numRuns)。**往復の対象面は R-7a の台帳に束縛する** — 任意の妥当な `WaitingCause` について、waiting イベントを載せたトランザクションを `encodeIntentAutonomyTransaction`(`amadeus-intent-autonomy-replay.ts:48-51`)で符号化し、`readIntentAutonomyTransactions`(同 `:95-121`)で復元し、payload を U1 の `parse` へ通して `presentationOf` した結果が、進入時に組み立てた `RulingPresentation` と等価であること。オラクルは被検実装から独立に `RulingPresentation` を再実装せず、進入時に実際に生成した値と突き合わせる(project.md `cid:build-and-test:pbt-oracle-cancellation` — 不変量の独立再実装は相殺を生む)。

**R-19a**(business-logic-model.md §3.4): 台帳から事由を引けない場合(`parkTransactionId` が指すトランザクションが不在)、resume は refuse する。envelope 側の識別子だけで部分的な再提示を組み立てない。
検証: 該当トランザクションを欠く fixture で resume が refuse し、`RulingPresentation` を生成しないこと。

**R-20**(FR-3 受け入れ確認): waiting の理由には対話 / 非対話の判定根拠が含まれる(どの HUMAN_TURN / headless 信号によるか)。
検証: waiting 記録に判定根拠フィールドが非空で存在すること。RFC-0001 Guide-level「中断を駆動した場合は park 理由に判定根拠を含め、誤判定を利用者が反証・是正できる形にする」。

## 監査台帳の同期

**R-21**(project.md `cid:build-and-test:bt-ledger-resync` と同族): マーカー 2 種の追加は `VALID_EVENT_TYPES`(`amadeus-audit.ts:64-113`)・`EVENT_HEADINGS`(同 `:236-237` 近傍)・`otel/event-registry.ts`・`audit-format.md`(`:33` と `:35` の件数見出しを含む)・`t28-audit-event-sync.test.ts:83` の `CANONICAL_COUNT` を同一変更で更新する。
検証: 四集合一致の drift ガードと t28 が Green。

**R-21a**(business-logic-model.md §5.1): 台帳側の追加はイベント union(`amadeus-intent-autonomy-runtime.ts:49-87`)への 2 判別子のみで、codec(`amadeus-intent-autonomy-replay.ts:48-62`)と形状ガード(同 `:34-46`)は変更しない。変更が要るなら格納先の選定が誤っている。
検証: 両ファイルの codec / `transactionShape` に差分がないことを実測。差分が出た場合は設計へ差し戻す。

**R-22**(project.md `cid:build-and-test:c1`): 新規テストファイルを追加する場合、`tests/.coverage-registry.json` の regen(`bun tests/gen-coverage-registry.ts`)を同一変更に同梱する。
検証: `bun tests/gen-coverage-registry.ts --check` が exit 0。

## 順序制約

**R-23**(requirements.md Constraints、unit-of-work-dependency.md): 本 unit の park guard 廃棄は U5(semi の Bolt 自律化)より先行する。誤順では semi が park 能力を失う。
検証: delivery-planning の Bolt 順序に本制約が反映されていること(文書検査)。

## 落ちる実証(実装前に Red で実測すべきもの)

FP-1 は FR-3 の受け入れ確認が名指す実証である。TDD 既定(team.md Testing Posture)により、実装前に赤を実測してから最小実装で緑にする。注入 → 赤の実測 → revert を 1 セットで実施し、残渣ゼロを機械確認する。

| # | 何を注入するか | Red が示すべきこと | trace |
|---|---|---|---|
| FP-1 | `Construction Autonomy Mode: autonomous` かつ presence 台帳に未消費 HUMAN_TURN 0 件の fixture で `park` を実行 | `amadeus-state.ts:1600` の guard が拒否し exit 非 0 — **非対話 full が止まれない** | FR-3 受け入れ確認、D1 / D5 |
| FP-2 | 非対話セッションで contested 終端に到達させ、理由付きの待ち状態へ入れようとする | waiting 状態も `enterWaiting` も存在せず、実行は次のステージへ進む(または既存 `AWAITING_HUMAN` park と区別できない) | FR-3、ADR-4 |
| FP-3 | 同一 `occurrenceId` + 同一 `basisFingerprint` で 2 回続けて admission を試みる | レート制約が存在せず 2 回目も通る(反復中断による作業回避が検知されない) | ADR-4 Q8=B、Alternatives Rejected Q8-A |
| FP-4 | REPAIR_STALLED の resume を是正証跡なしで実行 | 現行に waiting との型 dispatch がないため、証跡要求が waiting resume と同じ入口で強制されていない | ADR-4、component-methods.md C4 |
| FP-5 | `WORKFLOW_WAITING_ENTERED` を監査へ出そうとする | `VALID_EVENT_TYPES` に未登録のため append が拒否され、event-registry drift ガードと t28 の `CANONICAL_COUNT`(`:83` — 現在 93)が赤化する | R-21、監査語彙の閉集合契約 |
| FP-6 | `WaitingCause` を台帳へ載せて replay から復元しようとする | `AutonomyRuntimeEvent`(`amadeus-intent-autonomy-runtime.ts:49-87`)に waiting 判別子がなく payload を載せられない(型として不能)。復元経路も存在しないため R-19 の往復が成立しない | R-7a、R-19、ADR-4 の「同内容再提示」 |

FP-5 は「実装は正しいのに台帳未同期で赤い」型の失敗を **先に観測して閉じる** ためのもので、台帳同期を実装と同じ変更列へ載せる根拠になる。
