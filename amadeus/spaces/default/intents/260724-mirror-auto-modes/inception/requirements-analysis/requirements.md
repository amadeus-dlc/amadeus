# Mirror三モード化 — 要件定義

> 上流入力（consumes 全数）: `intent-statement.md`、`scope-document.md`、`business-overview.md`、`architecture.md`、`code-structure.md`、`team-practices.md`

## Intent分析

利用者は、名称に反してsyncだけを自動化する現行`auto-mirror`を、予測可能な`off | prompt | auto`の三モードへ置き換えたい。`auto`はIntent Mirrorのcreate・sync・安全なcloseまでを一貫して自動化し、他開発者へIntentの存在と進捗を共有する。一方、GitHubの一時障害でAI-DLC本体を止めず、誤ったIssueを更新・closeしないことが同じ優先度の安全要件である。

本要件は`intent-statement.md`の三モード契約、`scope-document.md`のMust範囲、`business-overview.md`の利用者価値、`architecture.md`のrecord正本・GitHub派生ビュー、`code-structure.md`の正本／生成物境界、`team-practices.md`の限定的な継続同意と配布規律を具体化する。

変更種別はBrownfieldの利用者向け機能拡張、複雑度はStandardである。設定、orchestration、state、GitHub CLI、6ハーネス配布、日英文書にまたがるが、対象ドメインはIntent Mirrorに限定する。

## 用語と状態

| 用語 | 定義 |
|---|---|
| mode | `off`、`prompt`、`auto`のいずれか |
| operation | `create`、`sync`、`close`のいずれか |
| eligible boundary | operationを評価するIntent lifecycle上の時点 |
| pending | operationが必要だが、まだ成功していない状態 |
| unsynchronized warning | GitHubとIntent recordが未収束であることを示す永続的な警告 |
| provenance | 対象IssueがAmadeusにより当該Intent用として作成されたことを検証できる永続証拠 |
| landing check | Intent registryとstateの双方がworkflow完了を示す検査 |
| skip | `prompt`で提示された当該イベントのoperationを利用者が明示的に辞退すること |

## 機能要件

### FR-1 設定スキーマと解決

1. `auto-mirror`は文字列`off`、`prompt`、`auto`だけを受理しなければならない。
2. 未指定時の既定値は`prompt`でなければならない。
3. Global → Space → Intentの既存三層優先順位を維持し、最も狭い有効な値を採用しなければならない。
4. booleanの`true`と`false`、未知文字列、数値、null、object、arrayは設定エラーとして拒否しなければならない。
5. 無効な層がある場合、部分的な設定や`prompt`へのfallbackを返してはならず、層と設定キーを含む診断を返さなければならない。
6. 旧booleanの互換shim、非推奨期間、暗黙変換を設けてはならない。

**受け入れ基準**

- Given 三層すべてが未指定、When 設定を解決する、Then modeは`prompt`である。
- Given Global=`auto`、Space=`off`、Intent=`prompt`、When 解決する、Then modeは`prompt`である。
- Given いずれかの層が`true`または`false`、When 解決する、Then 設定エラーとなりmirror operationは実行されない。

### FR-2 三モードの共通決定表

| mode | create | sync | close |
|---|---|---|---|
| `off` | 実行も質問もしない | 実行も質問もしない | 実行も質問もしない |
| `prompt` | 当該イベントごとに確認 | 当該イベントごとに確認 | 当該イベントごとに確認 |
| `auto` | 安全ガード通過後に自動実行 | 安全ガード通過後に自動実行 | 安全ガード通過後に自動実行 |

1. `off`は新規operationだけでなくpending retryも抑止しなければならない。
2. `off`へ切り替えてもpending、provenance、unsynchronized warningを削除してはならない。
3. `off`から`prompt`または`auto`へ戻した後、次のeligible boundaryでpendingを再評価しなければならない。
4. `prompt`のskipは当該イベントだけに有効で、failureやretry attemptとして記録してはならない。
5. skip後の別のeligible boundaryでは、その時点のmodeと状態から通常どおり再評価しなければならない。
6. `auto`設定は当該IntentのMirror operationに限る継続同意であり、PR merge、release、publish、deployment、Issue以外の外部操作へ適用してはならない。

### FR-3 create lifecycle

1. 新規Intentでは、Intent Captureの承認がコミットされた直後をcreateの最初のeligible boundaryとしなければならない。
2. Intent Capture承認済みでMirror Issueがない既存Intentでは、次のphase完了、park、workflow完了のうち最初に到達した境界で追いつきcreateを評価しなければならない。
3. `prompt`ではcreate／skipを明示的に選べる確認を提示し、回答前にGitHubへ書き込んではならない。
4. `auto`ではprovenanceと冪等operation identityを準備した後にcreateしなければならない。
5. 既に当該IntentのMirror Issueが存在する場合、createを再実行せず、必要ならsyncへ正規化しなければならない。
6. remote create成功後にlocal state書込みが失敗しても、再試行は同じIssueへ収束し、重複Issueを作ってはならない。

createはremote call前に永続的なoperation identityと状態を準備し、再発見時は次の決定表に従わなければならない。

| local operation状態 | marker一致候補 | 必須結果 |
|---|---:|---|
| `prepared`（remote call未開始） | 0件 | 同じoperation identityでcreateを1回実行可能 |
| `prepared`（remote call未開始） | 1件 | provenanceとrepositoryを検証し、整合すれば既存Issueを採用 |
| `attempted`またはremote outcome不明 | 0件 | 新規createを禁止し、`safety-blocked` warningと手動修復案を残す |
| `attempted`またはremote outcome不明 | 1件 | provenanceとrepositoryを検証し、整合すれば既存Issueを採用してlocal stateを修復 |
| 任意 | 2件以上 | 新規createと自動採用を禁止し、重複候補を列挙しない安全診断を残す |
| local provenance部分保存 | 1件 | 保存済みidentityが候補と一致する場合だけ不足fieldを修復 |
| local provenance不一致 | 任意 | mutationを禁止し、`safety-blocked`とする |

Issue側markerが削除・改変され、`attempted`以後のoperationから一致候補を再発見できない場合は「0件／outcome不明」と同じくfail-closedとし、自動で2件目を作ってはならない。自動回復できない場合もAI-DLC workflowは継続するが、Mirrorは利用者によるrelinkまたは明示的な破棄判断まで安全停止する。

**受け入れ基準**

- Given mode=`auto`かつMirror Issueなし、When Intent Captureを承認する、Then承認後に1件だけIssueが作成されprovenanceが保存される。
- Given remote create成功後にlocal記録が失敗、When次のeligible boundaryで再試行する、Then新しいIssueを作らず既存Issueを再発見して収束する。
- Given remote outcome不明かつ一致候補0件、When再試行する、Then新規Issue作成件数は0件で、pendingは`safety-blocked`として残る。
- Given remote outcome不明かつ一致候補1件、When再試行する、ThenそのIssueだけを採用し、新規Issue作成件数は0件である。
- Given一致候補が2件以上、When再試行する、Thenいずれも自動採用・edit・closeせず、新規Issue作成件数も0件である。
- Given過去IntentがIntent Capture承認済みでIssueなし、When次のphase境界へ到達する、Then現在のmodeに従ってcreateが評価される。

### FR-4 sync lifecycle

1. Mirror Issueが存在する場合、各phaseのverification完了後をsyncのeligible boundaryとしなければならない。
2. park状態のコミット後をsyncのeligible boundaryとし、Issueへpark状態とparked stageを反映しなければならない。
3. workflow完了時はclose判断より先に最終syncを実行しなければならない。
4. syncはIntent record → GitHub Issueの一方向であり、Issue本文の利用者編集をrecordへ逆流させてはならない。
5. 同一snapshotの再syncは同じIssue本文へ収束し、追加Issue、追加コメント、重複provenanceを作ってはならない。
6. Mirror Issueがない場合、syncを直接実行せず、FR-3のcreate評価へ正規化しなければならない。

### FR-5 provenanceと安全なclose

1. provenanceは少なくともIntent identity、repository identity、Issue identity、Amadeus作成事実を相互検証できなければならない。
2. provenanceはIntent record側に永続化し、Issue側にも再発見可能な非機密markerを持たせなければならない。
3. close前に、Intent registry status=`complete`、state Status=`Completed`、provenance一致、対象repository一致、最終sync成功をすべて検証しなければならない。
4. いずれかの検査が欠落・不一致・不明な場合、Issueをeditまたはcloseしてはならず、fail-closedの警告を残さなければならない。
5. Amadeusが当該Intent用に作成していない外部Issueは、番号がstateに記録されていても自動closeしてはならない。
6. `prompt`でworkflow完了時のcloseをskipした場合、Issueを開いたままにし、workflow完了を巻き戻さず、後から明示的なmanual closeを許可しなければならない。
7. `auto`で全検査を通過した場合に限り、最終sync後にcloseしなければならない。

mutationの安全検査順序は次のとおりでなければならない。

1. すべてのsyncとcloseに先立ち、local provenance、Issue marker、Intent identity、repository identityの一致を検証する。
2. phase／park syncは1の検査通過後にのみIssueをeditする。landing checkは要求しない。
3. workflow完了境界では1の検査後、registryとstateのlanding checkを実行する。
4. landing check通過後にのみ最終syncを実行する。
5. 最終sync成功後にのみcloseを実行する。
6. 1または3が失敗した場合、最終syncを含むIssue editとcloseをどちらも禁止する。

したがって、外部作成Issue、marker欠落Issue、repository不一致Issueへはsync自体を行ってはならない。最終sync成功はcloseの事後前提であり、provenance／repository／landingは最終syncの事前条件である。

### FR-6 非阻害failureとreconciliation

1. `gh`不在、未認証、権限不足、network、rate limit、API、command failureはMirror operationの失敗として扱い、AI-DLC workflowのstage／phase遷移を恒久停止してはならない。
2. 失敗時はoperation、boundary、attempt timestamp、再試行要否、秘密情報を含まない原因概要をIntent recordへ永続化しなければならない。
3. status表示と次の境界の利用者向け出力でunsynchronized warningを確認できなければならない。
4. 次のeligible boundaryでは現在modeを先に解決し、`off`なら保持・抑止、`prompt`ならretry確認、`auto`なら自動retryしなければならない。
5. retry成功後は対象pendingとwarningを解消し、別operationの未解消警告を消してはならない。
6. 設定スキーマ違反、provenance不一致、landing check不成立はGitHubの一時障害と区別し、安全契約違反をfallbackで隠してはならない。
7. auditはoperation開始、成功、失敗、skip、reconciliationを既存のtool-owned event規律で追跡可能にしなければならない。

failure分類ごとの状態遷移は次のとおりでなければならない。

| 分類 | operation結果 | AI-DLC workflow | Mirror状態 | 自動retry条件 | 利用者への次アクション |
|---|---|---|---|---|---|
| GitHub一時障害 | `pending` | 継続 | `unsynchronized` warning | 次のeligible boundaryでmodeに従う | 認証・権限・networkを修復、または次境界を待つ |
| 設定スキーマ違反 | `suppressed` | 継続 | `configuration-error` warning、GitHub mutationなし | 設定が有効になった後の次境界 | 問題の層とキーを修正する |
| provenance／repository不一致 | `safety-blocked` | 継続 | Issue mutationなし、warning保持 | 自動retryしない。明示的なrelink／修復後だけ再評価 | ownershipを確認して修復または手動解決する |
| landing check不成立 | `safety-blocked` | workflow完了をMirrorから巻き戻さない | Issueを開いたまま、edit／closeなし | state修復後の明示manual closeで再評価 | registry／state整合を修復する |
| local永続化失敗（remote前） | `pending` | 継続 | remote mutationなし | 次境界で同じidentityを再利用 | local write障害を修復する |
| local永続化失敗（remote後またはoutcome不明） | `safety-blocked` | 継続 | FR-3再発見表に従う | 一致候補1件の検証成功時だけ自動収束 | 候補0／複数／不一致なら手動修復する |

設定エラーと安全契約違反はGitHub一時障害としてattempt回数を増やしてはならない。`off`は一時障害pendingを保持して抑止するが、`safety-blocked`を解除せず、`auto`へ変更してもprovenance guardを迂回できない。

### FR-7 CLIとproject／space解決

1. Mirror CLIはsource layoutと各self-install layoutのどちらから実行しても、同じworkspace rootを解決しなければならない。
2. `.codex/tools/amadeus-mirror.ts`を含む配布先で固定階層数による誤root解決を行ってはならない。
3. active space、explicit Intent、active Intentの既存selector規則を再利用し、non-default spaceのrecord pathを`default`へ固定してはならない。
4. `create | sync | close | status [--intent <dirName>]`の手動操作面を維持し、modeにかかわらず利用者が明示操作できなければならない。ただしcloseのprovenanceとlanding checkは手動でも緩和してはならない。

### FR-8 statusと利用者向け説明

1. statusはresolved mode、Mirror Issue、provenance検証結果、pending operations、unsynchronized warningsを表示しなければならない。
2. エラー出力は次に必要な操作を示し、token、credential、GitHub応答内の機密値を出力してはならない。
3. GuideとReferenceの日英版、および`amadeus-mirror` skillは、三モード、既定`prompt`、boolean拒否、全boundary、failure／retry、safe closeを同じ意味で説明しなければならない。
4. 「autoはsyncだけ」という旧説明を残してはならない。

### FR-9 配布同期

1. 実装正本は`packages/framework/core/`と必要なharness overlayに置かなければならない。
2. Claude、Codex、Cursor、Kiro、Kiro IDE、OpenCodeの6配布面へ同じ契約を生成しなければならない。
3. `dist/`とself-install面を生成コマンドで同期し、生成物を独立正本として手編集してはならない。
4. `dist:check`と`promote:self:check`がbyte driftなしで成功しなければならない。

### FR-10 event identityと完了境界のoperation連鎖

1. 各評価は`Intent identity × boundary type × boundary instance × operation`で一意なevent identityを持たなければならない。
2. phase boundary instanceはphase verification transition、park instanceはpark receipt、workflow completion instanceはcompletion transitionに結び付けなければならない。
3. 同じboundary instanceへresume／再入しても同じevent identityを再利用しなければならない。
4. `prompt`でskipしたevent identityは`skipped-for-event`として永続化し、同じboundary instanceへの再入では再質問してはならない。
5. 次の異なるboundary instanceでは新しいevent identityを作り、その時点のmodeとMirror状態から再評価しなければならない。
6. skipはfailure attemptに数えず、unsynchronized warningを新規作成してはならない。ただし既存warningを消してはならない。

workflow完了境界で複数operationが必要な場合は、次の順序と依存を適用しなければならない。

| 順序 | operation | 実行条件 | skip／failure時の後続 |
|---:|---|---|---|
| 1 | create | Issueなし、かつFR-3の追いつき対象 | syncとcloseを抑止し、Issueなしのままworkflow完了を許す |
| 2 | final sync | Issueあり、provenance／repository／landing検査通過 | closeを抑止し、Issueを開いたままworkflow完了を許す |
| 3 | close | final sync成功済み | skipならIssueを開いたまま完了、failureならpending／warningを残して完了 |

`prompt`では各operationを同一completion boundary内で別々に確認する。前段が成功した場合だけ次の確認へ進む。`auto`では同じ順序を自動実行する。`off`では全段を評価せずworkflow完了だけを継続する。createまたはfinal syncがskip／failure／safety-blockedの場合、同じ境界で後段を質問または実行してはならない。

**受け入れ基準**

- Given completion boundaryでIssueなし・mode=`prompt`、When createを承認して成功する、Then同じboundaryでfinal syncを別に確認し、その成功後だけcloseを確認する。
- Given completion boundaryでcreateをskip、When同じworkflowへresumeする、Thencreateを再質問せずsync／closeも提示しない。
- Given次の異なるeligible boundaryが存在する、When到達する、Then前境界のskipをfailure扱いせず新eventとして再評価する。
- Given final syncが失敗、When workflow completionを確定する、ThenIssueは開いたまま、close mutationは0件で、unsynchronized warningが残る。

## 非機能要件

### NFR-1 安全性

- 外部Issueの誤edit／誤closeを、provenanceとrepository一致のfail-closed検証で防止する。
- credentialは`gh` credential storeへ委譲し、永続state、audit、Issue marker、標準出力へ保存しない。
- 外部コマンドはshell文字列ではなくargument arrayで起動する。
- `auto`の継続同意境界を型とテストでMirror operationに限定する。

### NFR-2 信頼性と冪等性

- create、sync、closeの各operationは、同じIntent・同じoperation identityの再実行で単一の外部結果へ収束する。
- remote成功／local失敗を含む各failure injection境界をintegration testで再現し、重複Issueと誤closeが0件であることを検証する。
- GitHubが利用不能でもstage stateの正当な遷移とIntent成果物生成を継続できる。

### NFR-3 保守性

- mode × operation × boundaryの判断を、I/Oから独立した狭いdecision contractとして一か所で検証可能にする。
- `amadeus-orchestrate.ts`、`amadeus-state.ts`、`amadeus-lib.ts`の一般的な分割や周辺refactorを本Intentへ含めない。
- 新しいstate fieldはpolicy、status、retry、close guardのいずれかで実際に消費し、未使用の将来予約fieldを追加しない。

### NFR-4 テスト可能性

- unit testで三モード、三operation、全boundary、三層設定、invalid schemaの決定表を網羅する。
- integration testで実filesystem、fake GitHub runner、partial success、retry、provenance mismatch、non-default space、配布layout rootを検証する。
- e2eまたはdistribution testで6ハーネスのtool／skill配置と同一契約を検証する。
- 変更対象に応じてtypecheck、Biome、complexity、project／patch coverage、dist／self-install driftを通す。

### NFR-5 性能と運用負荷

- daemon、polling service、常駐schedulerを追加しない。
- GitHub操作は既存lifecycle boundaryまたは明示CLI呼出しでのみ行い、背景ネットワーク通信を追加しない。
- statusなどread-only操作は、closeを除き不要なGitHub mutationを行わない。

## 制約

1. Bun、TypeScript、既存`gh` CLI runner、既存state／audit／config resolverを再利用する。
2. GitHub以外のtracker抽象化や汎用transport portは導入しない。
3. 新しいruntime dependencyを追加しない。
4. 旧boolean互換を維持しない。
5. `amadeus/**/*.md`は日本語、コードコメントと公開コード識別子は英語とする。
6. 日英対訳文書は意味を同期する。
7. GitHub security advisoryなど本Intentと無関係な既存依存問題は隠さず品質評価へ記録するが、本実装へ混在させない。

## 前提

1. `gh` CLIとcredential storeは任意依存であり、利用不能はMirror failureとして扱える。
2. Intent recordとauditはGitで共有され、GitHub Issueより強い正本である。
3. lifecycle boundaryはengineが一意に決定し、Mirror policyはそのboundary入力を消費する。
4. GitHub Issueに保存するprovenance markerは秘密情報を含めず、利用者が本文を閲覧しても安全である。
5. close対象は1 Intentにつき最大1件の正準Mirror Issueである。

## スコープ外

- PRの自動作成・merge、release、npm publish、deploymentの自動承認
- GitHub以外のIssue tracker
- Issueコメントの双方向同期
- daemon、webhook receiver、定期polling
- 既存の一般的なCI security gate追加、dependency advisory修復、Actions SHA pin全面移行
- 巨大core moduleの一般リファクタリング
- 旧boolean設定の移行shim
- Amadeusが作成していないIssueの自動close

## トレーサビリティ

| 要件 | 上流根拠 | 主な検証面 |
|---|---|---|
| FR-1、FR-2 | `intent-statement.md`、Q2・Q3、`team-practices.md` | config／policy unit |
| FR-3 | `scope-document.md` PU-01、Q1 | lifecycle integration |
| FR-4 | `intent-statement.md`、`business-overview.md` | phase／park／complete integration |
| FR-5 | `architecture.md`のCritical risk、`team-practices.md` | provenance／close failure injection |
| FR-6 | feasibilityのConditional GO、Q2、`team-practices.md` | non-blocking retry integration |
| FR-7 | `code-structure.md`、Reverse Engineering実測 | source／self-install layout integration |
| FR-8 | 利用者向け三モード契約 | docs parity／status tests |
| FR-9 | `code-structure.md`、project配布規律 | dist／self-install drift |
| FR-10 | Q3、close-after-landing、安全なライフサイクル連鎖 | event再入／completion chain integration |
| NFR-1〜5 | `architecture.md`、`team-practices.md` | security、idempotency、quality gates |

## Open questions

なし。Q1〜Q3は2026-07-24にユーザーが回答し、統合内容も確認済みである。provenance schema、operation receiptの具体形式、policy moduleのファイル境界はApplication Designで本要件を満たす範囲に限定して決定する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-24T03:03:27Z
- **Iteration:** 1
- **Scope decision:** none

三モード、利用者価値、配布境界、旧boolean拒否は上流成果物と整合するが、部分失敗回復、完了境界の複数operation、provenance異常時の状態遷移が一意でない。

### Findings

- remote create成功後の候補0件・1件・複数件とmarker欠落時の再発見規則を定義すること。
- workflow完了境界のcreate・sync・close順序と前段skip／failureの効果を定義すること。
- skip event identityと同一境界再入・次イベントでの再評価を定義すること。
- sync前とclose前のprovenance・repository・landing guard順序を定義すること。
- 一時障害・設定エラー・安全契約違反ごとのworkflow、pending、warning、retryを定義すること。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-24T03:06:04Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の5 blockersは決定表、順序制約、状態遷移、受け入れ基準により一意かつテスト可能に解消され、EngineeringとQAが追加判断なしで着手できる。

### Findings

- 再発見0／1／複数件とmarker欠落のfail-closed規則が定義済み。
- completion create→sync→closeの順序と前段失敗時の後続抑止が定義済み。
- skip event identityと同一boundary再入・別boundary再評価が定義済み。
- provenance／repository、landing、final sync、closeのguard順序が明確。
- failure分類ごとのworkflow、Mirror状態、retry、利用者対応が定義済み。
- 新たなblocker、矛盾、スコープ追加、孤立要件はない。
