# Functional Design — Questions(unit waiting-interruption)

> 承認: 2026-08-15T16:50:00Z — full 梯子 AUTO_DECIDED auto-decision-e12ac85dc9b1f60a37ea07aa12d2b556(全 unit の定型質問は RFC-0001 + 選挙 E-260815-RFC0001-DESIGN + ADR 留保 + Q6/Q9 人間裁定から一意導出 — 既決事項の再質問回避)。

## Q1: waiting は既存の `StopReason` / `ParkEnvelope` 機構の上に載せるのか、独立の状態機械を新設するのか

現行の中断表現は `StopReason = "AWAITING_HUMAN" | "REPAIR_STALLED" | "NORM_CONFLICT" | "USER_PARKED"`(`amadeus-intent-autonomy.ts:15`)と `ParkEnvelope`(`:156-163`)に集約され、`workflowExecutionState === "suspended"` と `parkEnvelope !== null` の同値が projection 不変条件として検査されている(`:209-213`)。waiting を独立の状態機械として新設すると、この不変条件と二重管理になる。

[Answer]: 既存の suspension 機構の上に **新しい `StopReason` と対応する `ResumeCondition` の種別** として載せる。ADR-4 の Decision が分離を要求しているのは「状態・監査イベント・resume 経路」の 3 面であり、格納機構そのものの二重化ではない。`StopReason` に waiting 用の値を 1 つ追加し、`validateResumeCondition`(`:1097-1108`)の対応表へ新しい resume 条件種別を 1 行加えることで、park(`USER_PARKED`)・REPAIR_STALLED・waiting が **同じ検査を通りながら型で分かれる**。これは ADR-4 の「3 終端の遷移表をテストで pin」を最小の差分で満たす形であり、components.md C4 の「park の HUMAN_TURN 会計(1 turn = 1 park、state.ts:1574-1605)は無改変」という制約とも両立する。

## Q2: waiting の終端提示は既存の `parked` directive を使うのか、新しい directive kind を作るのか

現行は REPAIR_STALLED も `parked` directive で提示されている(`amadeus-orchestrate.ts:3186` の `emit(parkedDirective(repairStalledReason(stall), stall.stageInstanceId))`)。すなわち **directive のレベルでは終端がすでに 1 種に潰れている**。waiting をここへ相乗りさせるか。

[Answer]: 新しい directive kind を作る。ADR-4 が「REPAIR_STALLED とは状態・監査イベント・resume 経路を分離」と定め、FR-8(UI 真実性の契約 — 表示と実挙動の乖離を作らない)が「利用者が見る終端」と「内部の終端種別」の一致を要求するため、waiting を `parked` と同じ kind で提示すると新たな乖離を作る。`amadeus-directive.ts` の追加点は `DirectiveKind` 列(`:56` 付近)、`VALID_KINDS`(`:466`)、フィールド集合表(`:568`)、検証テーブル(`:668-671`)の 4 箇所で、既存 `ParkedDirective`(`:395-399`)と同じ様式に従う。

**スコープの明示**: REPAIR_STALLED を `parked` directive で提示している現行の形(`:3186`)は本 unit では **変更しない**。ADR-4 の分離対象 3 面に directive は含まれておらず、REPAIR_STALLED の提示面を触ることは承認済み設計からの逸脱にあたる。本 unit は waiting に固有の提示面を新設するに留め、REPAIR_STALLED 側の提示は無退行として保つ。

## Q3: park guard(`amadeus-state.ts:1600`)の廃棄は、guard が守っていた脅威(#365 / #3016 の自己 park)を何に置き換えるのか

現行 guard は `isAutonomousMode(content) && outstandingHumanTurns(pd).length === 0` で自律 run の park を拒む。これを削除すると、AI が作業回避のために自己 park する経路が開く。

[Answer]: ADR-4(Q8=B)が置換先を裁定済み。waiting への admission を **事由オブジェクト(occurrenceId・candidates・derivation transcript・basis fingerprint)へ束縛** し、レート制約の鍵を `occurrenceId + basisFingerprint` とする。同鍵の反復到達は「根拠が変わっていない再到達」= 作業回避の疑いとして拒み、超過はエスカレーションのみ(自動続行分岐を作らない)。すなわち guard が「無人なら止まるな」で防いでいたものを、「止まるには裁定不能の構造的根拠を示せ」へ置き換える。RFC-0001 が D1 で指摘した逆転(「none/semi はいつでも park できるのに full だけが止める自由を失う」)は、この置換で解消される。

なお `handlePark` の HUMAN_TURN 消費会計(1 turn = 1 park)は guard とは別の機構であり、components.md C4 が明示的に「無改変」と定めているため保持する。廃棄するのは `:1600` の拒否条件のみである。

## Q4: waiting の resume は誰が実行できるのか。非対話セッションには HUMAN_TURN が存在しない

component-methods.md C4 は `resumeInterruption(projectDir): ResumeDispatch` を単一入口とし「記録種別で park | waiting | repair-stalled へ型 dispatch」すると定めるが、waiting resume の実行主体は書かれていない。

[Answer]: waiting へ入った実行は定義上「人間が見ていないセッション」であり、resume は **人間が戻った次のセッション** が行う。ADR-4 の Decision「waiting resume → `RulingPresentation` を再提示して裁定を受ける」がその形を定めており、RFC-0001 Guide-level の「いなければ(非対話モード)ワークフローは理由を記録して中断し、あなたが戻ったときにその場で裁定を受ける」が根拠である。したがって resume の入口は CLI verb を新設せず(components.md C4「engine 発行専用(AI/利用者向け CLI verb なし)」)、既存の再開経路(`--resume`)から `resumeInterruption` が呼ばれ、記録種別が waiting であれば裁定の再提示へ分岐する。REPAIR_STALLED の resume は是正証跡(`remediationEvidence`)必須という既存の厳格さを保つ(component-methods.md C4)。
