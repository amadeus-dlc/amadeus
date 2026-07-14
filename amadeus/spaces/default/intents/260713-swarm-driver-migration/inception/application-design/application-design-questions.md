# Application Design の質問

- **モード:** Grill me
- **深度:** Standard

## 上流コンテキスト

`requirements`、`architecture`、`component-inventory`、`team-practices`を調査済みであり、コードベースから判定できる事実は質問しない。設計判断だけを1問ずつ確認する。

## Q1. Driver選択の所有境界

engineはswarm eligibility、`amadeus-swarm.ts`は収束判定をすでに所有している。driver選択とpreflightはどこへ置くか。

A. **共通driver toolを新設（推奨）** — harness conductorが`invoke-swarm`受領後に共通のdeterministic toolを呼び、選択planを得てから既存refereeへ進む。engineとrefereeの責務を維持し、純粋resolverをunit testできる
B. **engineへ統合** — `invoke-swarm` directive生成時にdriver選択と外部CLI probeまで行う
C. **refereeへ統合** — `amadeus-swarm.ts prepare`がdriver選択・probe・収束準備をまとめて行う
X. **Other (please specify)**

[Answer]: A — 共通driver toolを新設（ユーザー回答: 1）

## Q2. Native process topology

4 driverはnativeな複数agent協調を証明する必要がある。batchと外部AI processの対応をどうするか。

A. **batch単位のcoordinator process（推奨）** — Claude Agent Teams、Claude Ultra Code、Codex Ultraはbatchごとに1つのsupervisor processを起動し、Unit worktree manifestからnative agentへ委譲する。Kiroは上限4 Unitごとのwave coordinatorとする
B. **Unitごとの独立process** — driver名に関係なく各Unitへ1つの外部AI CLI processを起動する
C. **driverごとに自由** — 共通契約を置かず、各harness adapterがprocess数とUnit割当を決める
X. **Other (please specify)**

[Answer]: A — batch単位のcoordinator process（ユーザー回答: 1）。batchは同時実行可能なUnitの一時的な実行グループであり、Unit内部のAgent Team化は今回の対象外。

## Q3. Preflightとnative evidenceの境界

worker作成前のhard errorと、実行後のnative利用証明をどのように分けるか。

A. **二段階検証（推奨）** — preflightはCLI・認証・flag・trust・非破壊handshakeを検査し、dispatch後はnative event / traceを別のevidence verifierで検証する。preflight失敗時だけ`auto` fallbackでき、dispatch後の証跡欠落はbatch failureとして扱う
B. **実作業前にfull live canary** — 毎batchで小さなnative Team / subagentを実起動してから本Unitを開始する
C. **preflightだけで成功判定** — flagや環境変数の受理をnative利用証明とし、runtime eventは必須にしない
X. **Other (please specify)**

[Answer]: A — 二段階検証（ユーザー回答: 1）

## Q4. Crash recoveryのcheckpoint

driver選択後にprocessが停止しても、同じbatchへ新attemptを紐づけ、確定済みUnitだけを再利用する必要がある。再開判断の正本をどう持つか。

A. **atomic attempt checkpoint + audit（推奨）** — 共通driver toolがrecord配下のgitignored checkpointをatomic更新し、同じtransitionをaudit eventへ記録する。checkpointは即時再開、auditは追跡と再構築に使う
B. **audit replayだけ** — 全audit shardを毎回読み、最新attemptとUnit状態を再構築する。専用checkpointは持たない
C. **worktree再走査だけ** — auditやattempt状態を使わず、再開時に全Unit worktreeを検査して新batchとして作り直す
X. **Other (please specify)**

[Answer]: A — atomic attempt checkpoint + audit（ユーザー回答: 1）

## Q5. Driver eventと監査の正規化

4つの外部CLIはevent / trace形式が異なり、生出力にはpromptやprovider responseが含まれ得る。共通toolへどの契約で渡すか。

A. **閉じた型の正規化event（推奨）** — 各harness adapterがnative出力をversioned JSON eventへ変換し、共通toolだけがcheckpointとdriver監査eventを書く。refereeは既存の収束eventだけを所有する
B. **生JSONLを共通toolで直接解析** — providerのstdout / JSONLを共通toolが読み、必要fieldをその場で抽出する
C. **harness別の監査契約** — 各adapterが独自event名とpayloadでauditへ直接書く
X. **Other (please specify)**

[Answer]: A — 閉じた型の正規化event（ユーザー回答: 1）

## Q6. Grillingの継続

Standard深度の5つの設計判断に到達し、selector所有、process topology、二段階検証、crash checkpoint、event正規化を確定した。さらに深掘りするか。

A. **合意要約へ進む（推奨）** — 5判断を統合確認し、設計成果物の生成へ進む
B. **続ける** — adapter配置、checkpoint state machine、event schema等を追加で掘る
X. **Other (please specify)**

[Answer]: A — 合意要約へ進む（ユーザー回答: 1。直前の`6`は無効回答として再提示）

## Q7. 合意内容の確認

次の設計判断を共有理解として確定してよいか。

1. harness conductorが共通driver toolを呼び、engineのeligibility責務とrefereeの収束責務を維持する。
2. Claude Agent Teams、Claude Ultra Code、Codex Ultraはbatchごと、Kiroは最大4 Unitのwaveごとに1 coordinator processを起動する。batchは実行時の一時グループであり、各Unitのworktree隔離を維持する。
3. preflightで起動可能性を検査し、dispatch後にnative evidenceを検証する。`auto` fallbackはdispatch前だけに許し、dispatch後の証跡欠落はbatch failureとする。
4. gitignoredなatomic attempt checkpointを即時再開に使い、同じtransitionをauditへ記録する。
5. harness adapterがprovider固有出力を閉じたversioned eventへ変換し、共通toolだけがdriver checkpoint / auditを書き、refereeは既存の収束eventだけを所有する。
6. Unit内部のAgent Team化、追加AWS resource、GUIは今回の対象外とする。

A. **この理解で確定（推奨）** — 5つの設計成果物を生成する
B. **修正する** — 修正する判断番号と内容を指定する
X. **Other (please specify)**

[Answer]: A — この理解で確定（ユーザー回答: 1）

## Q8. Claude mode別transport

Code Generation入口の実機調査で、Claude Code 2.1.205は非対話`claude -p`ではsession team初期化を行わず、Agent Teamsではなく通常のasync Agentを起動することが判明した。一方、Ultra Codeは`claude -p --verbose --effort ultracode --output-format stream-json --include-hook-events`でnative Workflowと独立provider stateを証明できた。Claude adapterの起動transportをどう訂正するか。

A. **mode別の閉じたtransport（推奨）** — Agent Teamsはinteractive PTY上の`claude` coordinator、Ultra Codeはheadless `claude -p` coordinatorとする。共通runtimeには`stdio-json | pty-interactive`の閉じたtransportを置き、coordinator 1 process、capture-before-arm、native証跡、Unit worktree隔離は維持する
B. **両modeを`claude -p`へ統一** — transportは単純だが、Agent Teams初期化が抑止されるためFR-11を満たせない
C. **通常async AgentをAgent Teamsとして受理** — headlessのまま実行できるが、team stateとTeammate eventを欠き、floorとの区別を失う
X. **Other (please specify)**

[Answer]: A — mode別の閉じたtransport（ユーザー回答: 1）。Application Designへ戻して訂正し、その後の下流成果物を再生成する。
