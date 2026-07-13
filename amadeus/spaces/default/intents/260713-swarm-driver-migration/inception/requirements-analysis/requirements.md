# Swarm Driver Migration 要求仕様

## Intent分析

### 目的

Constructionのmulti-Unit `invoke-swarm`において、利用者が要求した実行方式と実際に使われたnative multi-agent能力を一致させる。通常時は`auto`がハーネス能力とtask topologyからdriverを決定し、明示指定時は指定driverを実証できない限り実行を開始しない。

中心価値は速度やtoken削減ではなく、次の3点である。

1. 同じ入力から同じdriverを選ぶ決定性
2. 明示driverを別方式へ置換しない保証
3. 選択・fallback・実行・収束を追跡できる監査可能性

### 変更種別と規模

| 項目 | 判定 |
|---|---|
| 変更種別 | 公開設定契約の移行を伴うbrownfield enhancement |
| 対象 | selector、capability probe、native driver起動、swarm収束、監査、互換層、配布、文書、テスト |
| 規模 | 複数ハーネスと生成物へ波及するsystem-wide変更 |
| 複雑度 | Large。外部CLIのnative証跡とcrash後の再開契約を含む |
| Depth / Test Strategy | Standard / Comprehensive |

### 利用者

- Claude Code、Codex、KiroでAmadeusを実行する利用者と開発チーム
- 特定のnative実行方式を再現可能に指定したい利用者
- ハーネス、配布物、監査契約を保守するAmadeus maintainer

## 上流成果物と根拠

- [`intent-statement`](../../ideation/intent-capture/intent-statement.md) は、boolean設定では「最良の利用可能方式」と「指定方式の保証」を区別できない問題を定義している。
- [`scope-document`](../../ideation/scope-definition/scope-document.md) は、5つの公開値、4つのnative driver、0.1.x互換、live proof、配布・文書までをIn Scopeとしている。
- [`business-overview`](../../../../codekb/amadeus/business-overview.md) は、Amadeusが決定的engineと人間のgateを中心にしたCLI workflow orchestratorであることを示す。
- [`architecture`](../../../../codekb/amadeus/architecture.md) は、engine、harness adapter、subprocess、audit、生成・配布面の既存境界を示す。
- [`code-structure`](../../../../codekb/amadeus/code-structure.md) は、`packages/framework`を正本とし、各harness、`dist`、self-installへ生成する構造を示す。
- [`team-practices`](../practices-discovery/team-practices.md) は、既存のWay of Working、Walking Skeleton、Testing Posture、Deployment、Code Styleを変更せず適用する判断を記録している。
- [Issue #688](https://github.com/amadeus-dlc/amadeus/issues/688) は、大きなIntentを複数Unitで扱う必要性の背景である。
- [PR #941](https://github.com/amadeus-dlc/amadeus/pull/941) は、Amadeus自身を対象にしたself-hosted scopeの前提を導入した。

## 公開契約

### 環境変数

| 変数 | 0.1.xの契約 |
|---|---|
| `AMADEUS_SWARM_DRIVER` | 正本selector。未設定時の既定値は`auto` |
| `AMADEUS_USE_SWARM` | 警告付き互換。現行のハーネス別意味を保持し、0.2.0で削除予定 |

`AMADEUS_SWARM_DRIVER`が受理する値は次の5つだけとする。値はcase-sensitiveな完全一致とし、設定済みの空文字列を含むそれ以外は不正値とする。

- `auto`
- `claude-agent-teams`
- `claude-ultracode`
- `codex-ultra`
- `kiro-subagent`

### `auto`選択表

| 検出ハーネス | topology | 第一候補 | 利用不能時 |
|---|---|---|---|
| Claude Code | 相互調整型 | `claude-agent-teams` | `claude-ultracode`、さらに利用不能なら既存floorへloud fallback |
| Claude Code | 独立並列・反復収束型 | `claude-ultracode` | 既存floorへloud fallback |
| Claude Code | 不明 | `claude-ultracode` | `topology=unknown`を表示・監査し、利用不能なら既存floorへloud fallback |
| Codex | 任意 | `codex-ultra` | 既存の`codex exec` worker floorへloud fallback |
| Kiro | 任意 | `kiro-subagent` | 利用可能な既存floorへloud fallback |

明示値ではこのfallback表を使用しない。明示driverが検出ハーネスと一致しない、または能力検査に失敗した場合はhard errorとする。

相互調整信号と独立並列・反復収束信号が同時に存在する場合は、Unit間の協調要件を失わないため**相互調整型を優先**する。同一優先度内で複数信号が競合しても分類結果は変えず、入力信号一覧と`coordination-precedence`を選択理由へ記録する。

### Floorと監査識別子

floorは公開selectorの値ではない。`selected`には実際の実行方式を示す次の内部識別子を記録し、`execution_mode=floor`を併記する。

| ハーネス | Floor ID | 実行方式 |
|---|---|---|
| Claude Code | `claude-task-floor` | Unitごとの並列`Task`呼び出し |
| Codex | `codex-exec-floor` | Unitごとのheadless `codex exec` process |
| Kiro | `kiro-subagent-floor` | UnitごとのKiro `subagent` tool fan-out |

native driverを選んだ場合は`selected`へ4つのdriver名のいずれかを記録し、`execution_mode=native`とする。requestedが`auto`でも、`selected`へ`auto`を記録してはならない。

`fallback_reason`は`none`、`cli-unavailable`、`authentication-unavailable`、`native-surface-unavailable`、`native-evidence-unavailable`、`trust-unavailable`、`capability-probe-failed`の列挙値に閉じる。複数原因がある場合は、この列挙順で最初の原因を主理由とし、残りは機密値を除いた`capability_details`へ記録する。

## 機能要求

### Selectorと適用境界

| ID | 要求 | 受入条件 |
|---|---|---|
| FR-01 | 共通selector | 新旧変数がともに未設定のとき、requested driverを`auto`として解決する。新変数の5値は全ハーネスで同じ意味を持つ |
| FR-02 | 厳格な入力検証 | 不正値、空文字、別ハーネスの明示driverをworker作成前に拒否し、受理値と検出ハーネスを診断へ含める |
| FR-03 | 適用範囲 | selectorはengineが発行したConstructionのmulti-Unit `invoke-swarm`だけへ適用する。通常stage subagent、対話conductor、single-Unit経路の既存挙動を変更しない |
| FR-04 | 設定競合 | `AMADEUS_SWARM_DRIVER`と`AMADEUS_USE_SWARM`が両方設定されている全ケースを設定競合として拒否し、優先順位を推測しない |

### 能力検査と選択

| ID | 要求 | 受入条件 |
|---|---|---|
| FR-05 | batch単位の能力検査 | 各`invoke-swarm`でnative workerを1件も作成する前にCLI、認証状態、必要なflag・環境変数、native surfaceを1回検査する。結果は同一batch内だけで共有し、batchを跨いでcacheしない |
| FR-06 | 明示driver保証 | 明示driverの能力検査が失敗した場合はhard errorとし、別driver、既存floor、通常subagentによる代替実行を0件にする |
| FR-07 | 決定的な`auto` | requested value、検出ハーネス、能力検査結果、機械可読なtask topologyだけから選択する。同一入力に対するselected driverとreasonが全反復で一致する |
| FR-08 | topology分類 | Unit間の共有task、直接message、相互調整の必要性を示す機械可読信号があれば相互調整型とする。独立fan-outまたは反復収束信号だけがあれば独立並列型とする。両方があれば相互調整型を優先し`coordination-precedence`を理由にする。どちらもなければ不明とする。4分類のfixtureで結果を固定する |
| FR-09 | topology不明時 | Claude Codeでtopologyが不明な場合は`claude-ultracode`を選び、`topology=unknown`と選択理由を利用者表示・監査へ残す |
| FR-10 | `auto` fallback | `auto`の第一候補が利用不能な場合だけ選択表の次候補または定義済みFloor IDへ縮退できる。requested、selected、execution mode、capability result、列挙済みfallback reasonを表示・監査し、silent fallbackと未定義selectedを0件にする |

### Native driver

| ID | 要求 | 受入条件 |
|---|---|---|
| FR-11 | Claude Agent Teams | `claude-agent-teams`はAgent Teamsを有効化して2 Unit以上を実行し、Team固有のnative eventまたはtraceと各Unitの成果を取得する。単なる環境変数設定や自己申告だけを成功証拠にしない |
| FR-12 | Claude Ultra Code | `claude-ultracode`は非対話Claude processをUltra Code modeで起動して2 Unit以上を実行し、Ultra Code固有のnative workflow証跡と各Unitの成果を取得する |
| FR-13 | Codex Ultra | `codex-ultra`は通常の`xhigh`や単純な`codex exec` floorと区別できるUltra modeを明示し、2 Unit以上へのnative委譲eventまたはtraceを取得する |
| FR-14 | Kiro subagent | `kiro-subagent`は非対話trust条件をworker作成前に確認し、最大並列数を超えるUnitを決定的なwaveへ分割する。2 Unit以上のsubagent証跡と各Unitの成果を取得する |
| FR-15 | 共通収束境界 | 4 driverすべてが既存のUnit worktree、protected spec、`prepare` / `check` / `finalize`、lying-conductor guardを使用し、native driverの自己申告だけでUnitをconvergedにしない |

### 互換、監査、再開

| ID | 要求 | 受入条件 |
|---|---|---|
| FR-16 | 0.1.x旧互換 | 新変数が未設定で旧変数が設定されている場合、`1`とそれ以外を含む現行ハーネス別挙動を回帰fixtureどおり再現する。新しいdriver意味へ読み替えない |
| FR-17 | deprecation warning | 旧変数を検出した各`invoke-swarm`の解決試行ごとに標準エラーへ警告を表示し、同じexecution idの監査へ旧変数利用を記録する |
| FR-18 | 監査相関 | batch execution idとattempt idを用い、requested、selected、harness、topology、capability result、fallback reason、CLI / mode識別子、Unit、native evidence種別、収束結果を相関できる |
| FR-19 | 監査の機密性 | prompt本文、credential値、provider token、providerの生レスポンスを表示・監査・fixtureへ保存しない |
| FR-20 | crash後の再開 | driver選択後からbatch完了前に停止した場合、同じbatchへ紐づく新attempt idを発行して能力検査から再開する。既存worktreeとレフェリーが確定済みの収束結果だけを再利用し、未完了attemptを成功扱いしない |
| FR-21 | 原子的な完了 | native worker成功、レフェリー収束、merge-backの全結果が確定する前にbatchまたはIntentを成功扱いしない。merge失敗は成功auditを残さず、再開可能な失敗として扱う |

### 0.1.x legacy互換表

旧変数のbaselineは現在の各harness SKILLに記録された`invoke-swarm`挙動とし、次表を回帰fixtureの正本にする。すべての行でFR-17のdeprecation warningを追加する。

| ハーネス | `AMADEUS_USE_SWARM` | 0.1.x期待結果 | 既存監査差分 |
|---|---|---|---|
| Claude Code | `1` | inline Dynamic Workflowを使用する。Workflow unavailable時だけ`claude-task-floor`へloud-degrade | degrade時は既存`SWARM_DEGRADED`を維持 |
| Claude Code | `1`以外の設定値 | `claude-task-floor`を使用する | 新規deprecation warning以外の実行差分なし |
| Codex | `1` | `codex-exec-floor`を使用し、ultracode要求からのloud-degradeとして扱う | 既存`SWARM_DEGRADED`を維持 |
| Codex | `1`以外の設定値 | `codex-exec-floor`を使用する | 新規deprecation warning以外の実行差分なし |
| Kiro / Kiro IDE | `1` | `kiro-subagent-floor`を使用し、ultracode要求からのloud-degradeとして扱う | 既存`SWARM_DEGRADED`を維持 |
| Kiro / Kiro IDE | `1`以外の設定値 | `kiro-subagent-floor`を使用する | 新規deprecation warning以外の実行差分なし |

旧変数が未設定ならlegacy表を使わず、新変数未設定時の`auto`契約を適用する。legacy fixtureは各行についてcommand、environment、Floor ID、`SWARM_DEGRADED`有無、deprecation warningを検証する。

### 検証、配布、移行完了

| ID | 要求 | 受入条件 |
|---|---|---|
| FR-22 | 決定的test suite | 5値、不正値、未設定、旧新競合、明示hard error、`auto`選択全分岐、fallback、警告、監査payload、crash再開をunit / integration testで網羅する |
| FR-23 | opt-in live suite | 非機密の2 Unit以上のfixtureを使い、4 driverそれぞれでnative証跡、Unit成果、`check`、`finalize`を検証する。未認識event、認証不足、skipをpassへ読み替えない |
| FR-24 | 配布同期 | `packages/framework`の正本からClaude、Codex、Kiro、`dist`、self-install成果物を生成し、既存drift guardが差分0を報告する。生成先を正本として直接編集しない |
| FR-25 | 文書同期 | User Guide、harness guide、developer reference、migration guide、環境変数例が同じ5値、選択表、hard error、fallback、0.1.x互換、Windows未保証を説明する |
| FR-26 | 0.2.0追跡 | `AMADEUS_USE_SWARM`の読取、互換分岐、警告、旧専用test、暫定文書を削除する0.2.0向けGitHub Issueを日本語で起票し、各削除項目と全ハーネス検証を受入条件にする |

## 利用シナリオとエラーケース

| ID | シナリオ | 期待結果 |
|---|---|---|
| USR-01 | Claude Codeで相互調整型batchを`auto`実行 | Agent Teamsが利用可能なら選択し、native Team証跡と収束結果を記録する |
| USR-02 | Claude Codeで独立Unit batchを`auto`実行 | Ultra Codeを選択し、native workflow証跡と収束結果を記録する |
| USR-03 | Claude Codeでtopologyを確定できない | Ultra Codeを選択し、`topology=unknown`と理由を表示・監査する |
| USR-04 | Codexで`codex-ultra`を明示 | Ultra capabilityを実証してから開始する。`xhigh`しか利用できなければ開始前にhard errorとなる |
| USR-05 | Kiroで5 Unitを`auto`実行 | capabilityがあれば`kiro-subagent`を選び、上限4以下のwaveへ分割して全Unitを収束させる |
| USR-06 | 別ハーネスのdriverを明示 | workerやworktreeを新規作成せずhard errorとなり、修正可能な値を表示する |
| USR-07 | `auto`のnative候補が利用不能 | 既存floorへ縮退し、requested / selected / reasonを利用者表示と監査へ残す |
| USR-08 | 旧変数だけを設定 | 0.1.xの現行意味で実行し、解決試行ごとに警告する |
| USR-09 | 旧変数と新変数を同時設定 | 設定競合として実行前に停止する |
| USR-10 | worker実行中にprocessが停止 | 新attemptで能力検査から再開し、確定済みUnitだけを再利用する |

## 非機能要求

| ID | 品質属性 | 要求と検証可能な目標 |
|---|---|---|
| NFR-01 | 決定性 | 選択表の全fixtureを同じ入力で複数回実行し、selected driver、fallback reason、topology分類が100%一致する |
| NFR-02 | 信頼性 | 明示driverのprobe失敗、native evidence欠落、レフェリー失敗、merge失敗、監査書込失敗の各ケースをfail-closedにし、false successを0件にする |
| NFR-03 | crash safety | 状態と監査の更新は既存lock・atomic write境界を使用する。任意の永続化境界で停止して再開しても、成功eventの二重発行と未完了Unitの成功化を0件にする |
| NFR-04 | セキュリティ | provider credentialを新規保存せず、child processへ必要最小限の既存環境だけを継承する。secret scanner fixtureでcredential値のstdout、stderr、audit混入を0件にする |
| NFR-05 | 監査可能性 | 任意のbatchについてexecution idから選択入力、probe、native evidence、Unit結果、fallback、finalize結果まで欠落なく追跡できる |
| NFR-06 | 保守性 | driver値、選択規則、probe result schema、audit fieldを共通の正本から参照し、harness prose内の重複selectorを新設しない |
| NFR-07 | 後方互換性 | 0.1.xの旧変数fixtureを全対象ハーネスで維持し、新変数未設定時の現行挙動差分を0件にする。意図した差分は警告追加だけとする |
| NFR-08 | 対象platform | 新driver契約のrelease criterionはmacOSとGitHub Actions上のLinuxとする。両環境で決定的suite、配布検査、self-install検査を通す |
| NFR-09 | Windows非回帰姿勢 | Windowsは今回の保証対象外と文書化する。既存Windows専用コードを目的なく変更せず、Windows対応を示す未検証の成功表現を追加しない |
| NFR-10 | 拡張規模 | Unit数は既存swarmの許容範囲を維持し、driver固有上限は決定的なwaveへ変換する。Unitの黙示的dropを0件にする |
| NFR-11 | Testability | Comprehensive戦略としてunit、integration、E2E、failure injection、opt-in live testを用意し、各FRを1件以上のtestまたはlive evidenceへ追跡する |
| NFR-12 | 配布整合性 | package、dist check、self-install promotion checkの全検査をgreenにし、正本と生成物のdriver契約driftを0件にする |

実行時間とtoken消費には数値SLOを設定しない。能力検査はbatchごとに1回へ限定し、決定性・native保証・監査可能性を損なわない範囲で後続最適化する。

## Comprehensiveテスト要求

| Test層 | 必須対象 |
|---|---|
| Unit | env解析、5値、不正値、旧新競合、旧互換、topology分類、選択表、wave分割、監査redaction |
| Integration | 各harness adapterと共通selector、subprocess command / env / cwd / stdin、probe失敗、fallback、audit相関、crash再開 |
| E2E | 2 Unit以上のfixture、worktree分離、protected spec、`prepare` / `check` / `finalize`、merge失敗 |
| Failure injection | probe timeout、認証不足、native evidence欠落、worker partial failure、process停止、audit失敗、merge-back失敗 |
| Opt-in live | `claude-agent-teams`、`claude-ultracode`、`codex-ultra`、`kiro-subagent`のnative証跡と収束 |
| Distribution | package drift、各harness生成物、`dist`、self-install、文書内の値・警告・platform表記 |

各FRは後続のUnits Generationでtestまたはlive evidenceへ1対1以上で紐づける。opt-in live testは通常CIのcredentialed jobへ追加しないが、Intent完了前の必須証拠とする。

### Platform別完了マトリクス

| 検証 | ローカルmacOS | GitHub Actions Linux | Windows |
|---|---|---|---|
| 決定的unit / integration / E2E fixture | 必須 | 必須 | 対象外 |
| package / dist / self-install drift | 必須 | 必須 | 対象外 |
| `claude-agent-teams` native live proof | 必須 | 不要 | 対象外 |
| `claude-ultracode` native live proof | 必須 | 不要 | 対象外 |
| `codex-ultra` native live proof | 必須 | 不要 | 対象外 |
| `kiro-subagent` native live proof | 必須 | 不要 | 対象外 |

4 driverのnative live proofは、現在の認証済みローカルmacOSで各1回以上、2 Unit以上のfixtureを収束させればplatform要件を満たす。GitHub Actions Linuxはcredentialを使わないfake CLI / fixtureによる決定的検証を必須とし、native live proofは要求しない。Linuxでlive proofを実行できてもmacOSの必須証拠を置き換えない。

## 制約

1. 既存のdeterministic engineと`prepare` / `check` / `finalize`レフェリーをloop ownerへ変更しない。conductorがfan-outとretryを所有する。
2. driverは現在の利用者CLI認証を使い、Amadeus独自のAPI key、session token、credential storeを追加しない。
3. 新しいAWS resource、account、network boundary、credentialed GitHub Actions live jobを追加しない。
4. `packages/framework`を正本とし、`dist`やself-install後の生成物を直接編集しない。
5. 0.1.xでは旧変数の現行意味を保持し、完全削除は0.2.0へ延期する。
6. live fixtureは非機密データだけを使用する。
7. 新driver機能の保証対象はmacOSとGitHub Actions上のLinuxに限定する。Windowsは今回のrelease criterion外とする。
8. Agent TeamsまたはCodex Ultraのnative利用を機械判定できなければ、既存floorによる同名driverの成功扱いをせず、scope再承認まで停止する。

## 前提

| ID | 前提 | 根拠・破れた場合 |
|---|---|---|
| A-01 | 既存のUnit worktreeとレフェリー境界を再利用できる | REの`architecture`と`code-structure`に既存経路がある。破れた場合はApplication Designで境界を再評価する |
| A-02 | 現在の認証済みClaude Code、Codex、Kiroをlive proofに利用できる | Ideation Approvalで承認済み。認証不足はskip-as-passにせずdependency failureとする |
| A-03 | Units Generation成果物からtopology信号を抽出できる | 不足時はQ1で確定した`unknown`規則を使用する |
| A-04 | CLI version文字列より振る舞いprobeを優先できる | 外部CLI surfaceは変化し得るため、version一致だけではcapability=trueにしない |
| A-05 | 既存Windows経路は今回のdriver変更から分離できる | 分離できない変更が必要なら、Windows未検証リスクをgateで再提示する |

## 対象外

| ID | 対象外 | 扱い |
|---|---|---|
| OOS-01 | Responses API Multi-agent | 別Intentで評価する |
| OOS-02 | custom driver / plugin SDK | 公開値を既知の5値に閉じる |
| OOS-03 | 通常stage subagentのdriver選択 | 既存stage topologyを維持する |
| OOS-04 | 対話conductorと支援agentの起動制御 | Construction multi-Unit以外へ適用しない |
| OOS-05 | driver選択UI、dashboard、cost optimizer | CLI表示と監査だけを提供する |
| OOS-06 | credentialed GitHub Actions live matrix | opt-in local live suiteを採用する |
| OOS-07 | 0.2.0での旧変数削除実装 | 受入条件付きIssueだけを今回作る |
| OOS-08 | token量、速度、費用の保証 | 数値SLOを設定しない |
| OOS-09 | Windowsでの新driver保証 | 今回は未保証と明記し、将来の検証対象とする |

## Open Questions

| ID | 未確定事項 | 解消stage | Exit条件 |
|---|---|---|---|
| OQ-01 | headless Agent TeamsのTeam実起動を安定して示すnative event / trace | Application Design前半のRG-01 | 2 Unit以上の実起動をenv設定や自己申告と区別して機械判定できる |
| OQ-02 | Codex Ultraのnative委譲を通常の`codex exec` / `xhigh`と区別するevent / trace | Application Design前半のRG-01 | Ultra固有の2 Unit以上の委譲を機械判定できる |
| OQ-03 | topology分類が参照するUnits Generationの最小schema | Application Design / Units Generation | 相互調整、独立並列、不明を同一入力から決定できるschemaとfixtureが確定する |
| OQ-04 | 外部CLIの最低versionとprobe timeout | Application Design | versionは診断情報とし、capabilityを振る舞いprobeで判定できる境界が確定する |

OQ-01またはOQ-02を解消できない場合はRG-01不成立とし、該当driverを既存floorで代替せずscopeへ戻る。

## Scope Traceability

| Scope ID | 対応要求 |
|---|---|
| S-01 | FR-01、FR-02、FR-04 |
| S-02 | FR-03 |
| S-03 | FR-07〜FR-10、NFR-01 |
| S-04 | FR-05、FR-06、NFR-02 |
| S-05 | FR-08、FR-09、FR-11、FR-12 |
| S-06 | FR-13 |
| S-07 | FR-14、NFR-10 |
| S-08 | FR-10、FR-18、NFR-05 |
| S-09 | FR-04、FR-16、FR-17、NFR-07 |
| S-10 | FR-19、FR-20、FR-21、FR-22、NFR-02〜NFR-05、NFR-11 |
| S-11 | FR-15、FR-23、NFR-08 |
| S-12 | FR-24、FR-25、NFR-06、NFR-09、NFR-12 |
| S-13 | FR-26 |

### 要求側の逆引き

| 要求範囲 | 由来 |
|---|---|
| FR-01〜FR-04 | S-01、S-02、S-09 |
| FR-05〜FR-10 | S-03、S-04、S-08、Q1、Q4 |
| FR-11〜FR-15 | S-05〜S-07、S-11 |
| FR-16〜FR-18 | S-08、S-09、Q2 |
| FR-19 | S-10およびfeasibility制約C-17、C-18 |
| FR-20 | S-10およびQ5 |
| FR-21〜FR-23 | S-10、S-11および既存レフェリー制約 |
| FR-24〜FR-26 | S-12、S-13 |
| NFR-01〜NFR-03 | S-03、S-04、S-10、Q4、Q5 |
| NFR-04〜NFR-05 | S-08、S-10およびfeasibility制約C-17、C-18 |
| NFR-06〜NFR-07 | S-09、S-12、CodeKB `architecture` / `code-structure` |
| NFR-08〜NFR-09 | S-11、S-12、Q7、Q8 |
| NFR-10〜NFR-12 | S-07、S-10〜S-12 |

## Review — Iteration 1

**Reviewer:** amadeus-product-lead-agent  
**Verdict:** NOT-READY

### 指摘

1. **`auto`のtopology競合時の決定規則が未定義。** FR-08は相互調整信号と独立並列・反復収束信号をそれぞれ定義しているが、同一入力に両方が存在する場合の優先順位、`unknown`への分類、またはhard errorのいずれにするかを定めていない。このままではFR-07とNFR-01の決定性を全入力について検証できない。競合規則と対応fixtureを明記する必要がある。
2. **`auto` fallback先の識別契約がテスト可能な粒度に達していない。** Claude Codeの「既存floor」とKiroの「利用可能な既存floor」は具体的な実行方式・識別子が未定義であり、公開値が5値に閉じている一方、FR-10とFR-18が要求する`selected`へfloorをどう記録するかも不明である。ハーネスごとの正確なfloor、機械可読なselected / execution-mode値、fallback reasonの列挙を定義する必要がある。
3. **0.1.x互換契約が成果物単独では再現不能。** FR-16は`AMADEUS_USE_SWARM`の「現行ハーネス別挙動」をfixtureどおり再現するとしているが、Claude Code、Codex、Kiroごとの入力値と期待結果、参照するbaseline fixtureを特定していない。警告追加以外の差分0を客観判定できる対応表またはfixture参照を追加する必要がある。
4. **macOS / Linuxのlive proof完了条件が曖昧。** Q7・Q8でWindowsをrelease criterion外とした判断は、FR-25、NFR-08、NFR-09、制約7、OOS-09へ一貫して反映されている。一方、FR-23は4 driverのlive proofを必須とし、NFR-08はmacOSとGitHub Actions Linuxで決定的suite等を要求し、OOS-06はcredentialed GitHub Actions live matrixを対象外としているため、各driverのnative live proofをどのOSで取得すればIntent完了となるか確定できない。driver × macOS / Linuxの必須・非必須マトリクスを明記する必要がある。Windows未保証の表現自体は明確である。
5. **scope traceabilityが片方向かつ不完全。** S-01〜S-13には対応要求があるが、FR-15、FR-19〜FR-21、NFR-03〜NFR-06、NFR-08、NFR-09はどのScope IDにも紐づかない。上流scopeから直接導出した要求でない場合も、`Derived`、Q&A、制約など由来を明示し、全要求を逆引きできるようにする必要がある。

### 検証結果

- **Q&A完全性:** PASS — Q1〜Q8の`[Answer]:`は8件すべて記入済みで、空欄は0件。
- **必須内容:** PASS — Intent分析、機能要求、非機能要求、制約、前提、対象外、Open Questionsを含み、機能・品質・利用シナリオ・事業・技術の各観点を扱っている。
- **明示driver契約:** PASS — ハーネス不一致またはprobe失敗時のhard errorと代替実行0件が明記されている。
- **`auto` / fallback契約:** FAIL — 通常分岐と`topology=unknown`は定義済みだが、信号競合とfloor識別が未確定。
- **platform契約:** PARTIAL — macOS / GitHub Actions Linux限定とWindows未保証は反映済みだが、OS別live proof完了条件が未確定。
- **scope traceability:** FAIL — S-01〜S-13の上流側カバレッジはあるが、要求側からの逆引きに欠落がある。
- **`required-sections` sensor:** PASS — 終了コード0。
- **`upstream-coverage` sensor:** PASS — 終了コード0。`intent-statement`、`scope-document`、`business-overview`、`architecture`、`code-structure`、`team-practices`への参照を確認。ただし、このsensorは参照の存在を検査するもので、意味上の完全性は上記指摘とは別である。

上記5点を解消し、対応fixtureまたは受入条件で決定性を確認できる状態になれば再レビュー可能である。

## Review

**Iteration:** 2  
**Reviewer:** amadeus-product-lead-agent  
**Verdict:** READY

### 前回指摘の解消確認

1. **topology競合規則:** PASS — 相互調整信号と独立並列・反復収束信号が同時に存在する場合は相互調整型を優先し、理由を`coordination-precedence`として記録する規則が明記された。FR-08は相互調整、独立並列、両方、どちらもなしの4 fixtureを要求しており、FR-07およびNFR-01の決定性を検証できる。
2. **Floorと監査識別子:** PASS — `claude-task-floor`、`codex-exec-floor`、`kiro-subagent-floor`の3つのFloor ID、`execution_mode=native|floor`、`selected`の記録規則、閉じた`fallback_reason`列挙と複数原因時の優先順位が定義された。明示driverはfallback禁止、`auto`だけが定義済みfloorへ縮退可能という境界も維持されている。
3. **0.1.x互換契約:** PASS — Claude Code、Codex、Kiro / Kiro IDEについて、`AMADEUS_USE_SWARM=1`とそれ以外の設定値ごとの期待実行方式、Floor ID、`SWARM_DEGRADED`有無、deprecation warningを検証する回帰表が追加され、FR-16・FR-17を成果物単独でテスト可能になった。
4. **platform完了条件:** PASS — ローカルmacOSでは4 driverのnative live proof、GitHub Actions Linuxではcredential不要の決定的fixtureと配布検査、Windowsは対象外とする完了マトリクスが追加された。NFR-08、NFR-09、制約7、OOS-06、OOS-09と内部整合している。
5. **scope traceability:** PASS — S-01〜S-13から要求への対応が補完され、FR-01〜FR-26とNFR-01〜NFR-12の全範囲についてScope、Q&A、feasibility制約、CodeKB等への要求側逆引きが追加された。

### 総合検証結果

- **完全性:** PASS — stage定義が要求するIntent分析、機能要求、非機能要求、制約、前提、対象外、Open Questionsを備え、機能・品質・利用シナリオ・事業・技術の6観点を扱っている。
- **Q&A反映:** PASS — Q1〜Q8は全件回答済みであり、Q7・Q8によるQ3のplatform保証範囲変更が最終要求へ反映されている。
- **テスト可能性:** PASS — selector、probe、topology競合、明示hard error、fallback、legacy互換、監査、crash再開、platform別完了条件がfixtureまたは測定可能な受入条件へ結び付いている。
- **内部整合性:** PASS — 明示driver、`auto`、native、floor、hard error、loud fallbackの各契約が相互に矛盾せず、未確定のnative evidence種別等はOQ-01〜OQ-04で解消stageとExit条件を持つためRequirements Analysisの完了を妨げない。
- **macOS / Linux / Windows契約:** PASS — release criterionはmacOSとGitHub Actions Linuxに限定され、Windowsは非回帰姿勢のみで未保証と明記されている。
- **`required-sections` sensor:** PASS — 親エージェントによる再実行結果を確認済み。本iterationでは再実行していない。
- **`upstream-coverage` sensor:** PASS — 親エージェントによる再実行結果を確認済み。本iterationでは再実行していない。

Requirements Analysisの成果物は、後続のApplication DesignおよびUnits Generationへ進める品質に達している。
