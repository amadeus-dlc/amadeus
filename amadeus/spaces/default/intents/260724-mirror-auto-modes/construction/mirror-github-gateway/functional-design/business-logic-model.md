# Business Logic Model — mirror-github-gateway

> 上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

## Functional Boundary

`unit-of-work.md`のGateway Unit、`unit-of-work-story-map.md`のAS-02〜05／08、`requirements.md`のFR-3〜7、`components.md`のC5、`component-methods.md`の`MirrorGitHubGateway`、`services.md`のexplicit repository flowを実装する。state、mode、provenance判断、lifecycle routingは所有しない。

## Command Execution Workflow

1. callerから検証済み`RepositoryIdentity`とoperation-specific inputを受け取る。
2. shell stringではなくargument arrayを構築する。
3. repositoryを`repos/{owner}/{name}/issues...` API pathへ明示する。
4. 全`gh api` commandに`--include`を付け、HTTP status／headersとJSON bodyを分離できるresponse envelopeを要求する。
5. 注入されたprocess runnerでshellなし同期実行し、spawn phase、timeout／termination、exit status、stdout、stderrを取得する。
6. exit非0をclassificationと副作用確定性へ変換し、stderrをredactしたsummaryだけ返す。
7. exit 0でもJSON parse／shape／repository identityが不正なら`invalid-response`にする。
8. valid responseをC0 DTOへparseして`GatewayOutcome.ok`を返す。

cwd、active git remote、`gh` default repositoryはmutation先の決定に使わない。

## Operation Workflows

### Readiness

`gh --version`と`gh auth status --hostname github.com`をmutation receiptの`attempted`前に確認する。readinessはIssue mutationを行わず、not-installed／unauthenticatedを区別する。

### Create

title、body、labelsを個別argumentとして渡す。bodyのmarker内容を解釈せず、remote Issueのnumber、title、body、state、repositoryをparseする。repository不一致は成功扱いしない。C6が発行したcreate permitを必須とする。

### Find by Marker

explicit repositoryのopen／closed Issueを全page取得し、pull request entryを除外して、callerが渡した完全markerのbody substring一致をlocal filterする。0件／1件／複数件を加工せず配列で返し、候補採用判断は行わない。paginationが完走しない、page shapeが不正、上限到達を判定できない場合はfailureとし、false zeroを返さない。

### View

explicit repositoryとpositive Issue numberを指定し、ownership検証に必要なbody／stateを取得する。read-onlyでedit／closeを伴わない。

### Edit and Close

editは完成済みbodyとC6発行permitを受け取り、一方向syncする。closeもC6発行permitを受け取る。各PATCH responseからIssue DTOとrepositoryを検証して返すため、追加viewは不要である。Gateway自身はprovenance／landingを判断しない。

## Operation Command Contract

`{repo}`はpercent-encoding不要な検証済みowner／name、`{n}`はpositive integerである。field値は各argumentの次要素として渡し、shell escapingしない。

| Operation | Exact argv shape | Success schema |
|---|---|---|
| readiness | `["--version"]`、次に`["auth","status","--hostname","github.com"]` | exit 0 |
| create | `["api","--include","--method","POST","repos/{repo}/issues","-f","title=…","-f","body=…","-f","labels[]=intent-mirror","-f","labels[]=enhancement"]` | HTTP envelope＋1 Issue object |
| find | `["api","--include","--method","GET","--paginate","--slurp","repos/{repo}/issues","-f","state=all","-f","per_page=100"]` | pageごとのHTTP envelope＋array |
| view | `["api","--include","--method","GET","repos/{repo}/issues/{n}"]` | HTTP envelope＋1 Issue object |
| edit | `["api","--include","--method","PATCH","repos/{repo}/issues/{n}","-f","body=…"]` | HTTP envelope＋updated Issue object |
| close | `["api","--include","--method","PATCH","repos/{repo}/issues/{n}","-f","state=closed"]` | HTTP envelope＋updated Issue object |

Issue schemaは`number: positive integer`、`title: string`、`body: string|null`、`state: "open"|"closed"`、`repository_url: https://api.github.com/repos/{owner}/{name}`を必須とし、search page elementだけは`pull_request?: object` discriminatorも受理する。searchは`pull_request` propertyが存在するelementを最初に除外し、残りだけをIssue DTOとしてparseしてmarker filterへ渡す。page elementのdiscriminatorまたはIssue shapeが不正ならsearch全体をfailureとし、候補0件へ変換しない。null bodyはempty stringへ正規化する。create／edit／closeは単一commandであり、追加commandの部分失敗はない。

runnerはfind stdoutをHTTP envelope込み64 MiB、単一Issue operation stdoutを1 MiBで打ち切る。parse前に各bodyのUTF-8 bytesが256 KiB以下であることを検証する。上限超過は`invalid-response`とし、read-onlyは`no-effect-confirmed`、mutation process開始後は`outcome-unknown`を返す。partial page／partial Issueをsuccessへ変換しない。

## Failure Normalization

| Observation | Classification | Retryable |
|---|---|---|
| executableなし | `not-installed` | false |
| authなし／期限切れ | `unauthenticated` | false |
| 403／権限拒否 | `permission` | false |
| rate limit | `rate-limit` | true |
| DNS／timeout／connection | `network` | true |
| GitHub API error | `api` | error内容により判定 |
| その他exit非0 | `command` | false |
| JSON／shape／repository不正 | `invalid-response` | false |

raw stderr、environment、token、credential helper出力をoutcomeへ含めない。

判定優先順位はspawn ENOENT → readiness auth failure → structured HTTP 429／rate-limit response → structured HTTP 401 → structured HTTP 403 permission → timeout／DNS／connection OS error → structured GitHub API error → generic command → success response parseである。複数条件が一致した場合は最初の分類だけを使う。

response envelope parserはHTTP status line、headers終端、JSON bodyをbyte境界で分離し、statusをnumeric valueとして返す。envelope欠落／重複／不完全pageは`invalid-response`である。

mutation failureのeffectは、spawn前validation／spawn失敗／readiness失敗=`not-started`、process開始後のexit非0／timeout／connection reset／HTTP error／parse不能=`outcome-unknown`と保守的に扱う。`gh` process開始だけではrequest未送信を証明できないため、mutationで`no-effect-confirmed`を返さない。read-only method failureだけを`no-effect-confirmed`とする。

## Redaction Contract

summaryはraw stderr／stdout／exception messageを加工せず、classification、effect、numeric exit code、numeric HTTP statusだけから固定templateで再構成する。形式は`GitHub unavailable ({classification}; {effect}; exit={number|none}; http={number|none})`とし、GitHub message、URL、path、environment、header、token断片は一切転記しない。例は`GitHub unavailable (network; outcome-unknown; exit=1; http=none)`である。未知値や非numeric statusは`none`へ正規化するため、入力内容やentropy判定に依存せずfail-closedになる。秘密fixtureごとに完全一致の期待summaryをtestする。

## Repository Canonicalization

owner／nameはASCII英数字、`-`、`_`、`.`だけを許可し、先頭末尾空白やslashを拒否する。parserがtrimせず検証し、canonicalはlowercase `owner/name`として一度だけ生成する。表示用caseは別fieldに保持しない。remote `repository_url`はHTTPS URLとしてparseし、pathが`/repos/{owner}/{name}`の2 identity segmentだけであることを確認して同じlowercase canonicalへ変換する。

## Mutation Capability

C6はoperation-specific guardとreceipt precondition通過後だけnominal `MirrorMutationPermit`を生成する。`amadeus-mirror-capability.ts`は非exportの`unique symbol`、module-private `WeakSet<object>`、factory、validatorを所有する。factoryはevent、repository、operation、Issue numberをbindしたfrozen objectをWeakSetへ登録する。C6だけがfactory、Gatewayだけがvalidatorをinternal pathからimportし、package public exportへ含めない。GatewayはWeakSet membershipとbinding不一致をprocess起動前に拒否する。dependency testは許可外importとmutation callを、runtime testはobject literal／type assertion／JavaScript callerによる偽造を拒否する。

## Test Seams

production codeは`MirrorProcessRunner` portだけを受け取る。fake／failing runnerはtest側に置き、本番分岐を追加しない。全testはargument array、repository API path、mutation command回数、response parsing、redactionを観測する。

## Edge Cases

- owner／name／Issue numberがinvalidならprocess起動前にfail-fastする。
- bodyが空でもmarker contractがcallerで成立していればGatewayは内容を補完しない。
- search 2件以上を1件へ丸めない。
- pagination failureを候補0件へ変換しない。
- closed Issueのviewはvalid responseだが、edit／close可否はcallerが判断する。
- stdoutに複数JSON値、unknown state、missing numberがあればinvalid-response。

## Review Iteration 1 Remediation

- failure outcomeへ`not-started | no-effect-confirmed | outcome-unknown`を追加した。
- 全operationを単一`gh api` command、exact argv、Issue response schemaへ固定した。
- marker searchをopen／closed全page＋local exact marker filterとし、網羅不能はfailureにした。
- classification優先順位とretryability、allowlist-based redactionを定義した。
- mutationはC6発行opaque permitを必須とした。
- repository identityの構文、lowercase canonical、remote URL parseを固定した。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T05:00:07Z
- **Iteration:** 1
- **Scope decision:** none

explicit repository、argument array、read-only operationの非mutation、C5/C6の責務分離方針は概ね整合しているが、副作用確定性、operation別command／response contract、marker検索の完全性が未定義。

### Findings

- Blocker — Gateway failureにremote mutationの開始／未開始／結果不明を表す情報がない。
- Blocker — operation別の正確なargv、stdout schema、repository検証元、追加viewの有無がない。
- Blocker — marker検索のopen／closed、pagination、escaping、完全一致filter、網羅不能failureが未定義。
- Major — failure classification根拠と優先順位がない。
- Major — redaction contractが検証不能。
- Major — public edit／close portをC6以外から呼べるためguard省略防止が構造化されていない。
- Major — RepositoryIdentity canonicalizationと比較規則が不足。
- read-only非mutation、argument array、explicit repo、C5/C6一方向依存は整合。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T05:05:53Z
- **Iteration:** 2
- **Scope decision:** none

effect certainty、全ページ検索、classification priority、repository canonicalizationは具体化されたが、exact argv、readiness順序、mutation permit強制に矛盾が残る。

### Findings

- Critical — gh api pathと--repo必須記述が矛盾。
- Critical — readiness-before-attemptedがC6／services exact sequenceへ未反映。
- Major — permitがstructural typeで偽造可能。
- Major — PR除外用pull_request discriminatorがschemaにない。
- Major — redaction fallback条件が決定的でない。
- effect certainty、pagination、classification、canonicalizationは解消済み。

## Review Iteration 2 Remediation

- 全remote operationを`gh api repos/{owner}/{name}/issues...`へ統一し、`--repo`要件を廃止した。
- 全mutationを`prepare → readiness → attempted → remote → complete`の順序へ統一した。
- permitを非export `unique symbol`でbrandし、internal factoryをC6だけへ閉じた。
- search page schemaへ`pull_request` discriminatorを追加し、PRをIssue DTO parse前に除外する。
- summaryをclassification、effect、numeric exit／HTTP statusだけから作る固定templateへ変更し、raw diagnosticsの転記とentropy判定を廃止した。
