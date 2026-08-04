# Pi User / Maintainer Guides — Security Design

## 適用範囲

本設計はPi利用者・保守者向け日英guide、porting registry、command/fact projection、link/section checksが、危険な手順・秘密値・未検証claim・翻訳による意味反転を出荷しない境界を保護する。engine-resolved `consumes` は空で、条件付きの `security-requirements` / `tech-stack-decisions` も期待どおり不在である。

guideはPi runtime、setup transaction、doctor、formal evidenceを実行・所有しない。machine catalogと正式evidenceへの参照を読み、文書へ決定投影するだけである。

## Trust model for documentation

| Source | Trust role | Prohibited use |
|---|---|---|
| `PiGuideContractSpec` | mandatory sections/claim IDs/parity policy | runtime successの自己申告 |
| Runtime/package/doctor catalogs | verified public factの正本 | 文書からのreverse mutation |
| Command catalog | argv/safety/preconditionの正本 | prose shell文字列の実行 |
| Formal evidence reference | claimを出荷可能にする根拠 | guideがgreenを捏造 |
| Locale message catalog |表現だけを所有 | severity/negation/precondition変更 |
| Rendered guide | observed distribution artifact | expected fact setの正本 |

文書本文、READMEの固定件数、手書きinstall snippetを安全性の正本にしない。required claimはtyped catalogに存在し、対応するimplementation catalogまたはevidence referenceが解決できる場合だけ出荷する。

## Security-critical claims

次のclaimは `security-critical` とし、日英両方で同じfact ID、severity、negation、precondition、remediationを持つ。

- Pi Package extensionはhost user権限でcodeを実行し、skillはモデルへtool操作を指示できる。
- Pi project trustはload authorizationでありsandboxではない。setup/extensionはautoapproveしない。
- local/git sourceはinstall前にreviewし、formal sourceはimmutable full commitへpinする。
- package dependency/install lifecycleもcode executionを伴い得るため、lockfile/scripts diffを確認する。
- provider/Git/API credential、prompt、home path、private backupはmanifest/audit/evidenceへ保存しない。
- native WindowsとPi minimum未満はformal unsupportedで、advisory successへ縮退しない。
- update/remove/uninstallはrouteとmanaged ownershipを確認し、recursive deleteを案内しない。
- doctorはread-onlyでtrust/resourceを修復せず、blocked時もsafe remediationだけを返す。

locale rendererはfactのpolarityを入力として受け、翻訳文字列側がnegationを反転できないclosed templateを使う。security-critical claimのmissing、duplicate、severity downgrade、evidence unresolved、日英fact-set差分はbuild failureである。

## Command catalog safety

`PiGuideCommandSpec`はcommand ID、argv token array、typed placeholders、route、safety class=`read-only | install | update | remove | trust-decision`、preconditions、expected result、rollback/remediationを持つ。

- shell文字列を正本にせず、rendererがtokenをOS/shell dialect用の表示へescapeする。
- placeholderはproject path、repository URL、immutable commit、package ID等のclosed typeで、newline/NUL/control/operator tokenを拒否する。
- `;`、`&&`、`|`、redirect、command substitution、globを単一argv tokenへ混入させない。
- credentialをURL/argv/env assignment例へ置かない。credential-bearing URLはexample生成前に拒否する。
- remote script pipe、unbounded recursive delete、force trust、`--approve`自動化、moving Git refをmandatory command catalogへ登録しない。
- destructive classは対象、scope、managed ownership、dry/read-only check、期待結果を先に表示する。

guide verifierはrendered snippetを再parseして実行するのではなく、command catalog tokenとrenderer outputの対応を検証する。read-only commandだけをisolated fixtureで実行可能とし、install/update/remove/trust-decisionはproduction pathへ自動dispatchしない。

## Source, link, and path controls

external linkは`https`と許可されたofficial/repository domainに限定し、`javascript:`、`data:`、credential userinfo、secret query/fragmentを拒否する。link checkerはcredential env/cookieを送らず、timeout/redirect count/response byteをboundedにする。redirect先も再度scheme/domain policyへ通す。

source identityはcredential-free canonical repository URLとfull immutable commit placeholderで表示する。local setup pathはproject-relative placeholder、Pi Package local source pathは抽象placeholderだけを使い、home absolute path、username、workspace worktree pathをsnapshotへ固定しない。

guide内file linkはrepository-relative canonical pathへ解決し、root escape、symlink、case alias、generated/private installer rootへのlinkを拒否する。private transaction/quarantine/backup pathをtroubleshooting例へ載せず、doctorのopaque remediation IDを参照する。

## Code block and markup safety

Markdown rendererはuser/runtime textをraw HTMLとして挿入せず、code span/fence/heading/link textをcontext別escapeする。backtick/fence lengthはcontentより長いdelimiterを選び、frontmatterやHTML commentをruntime valueから生成しない。

command output例はsynthetic fixtureから作り、real stdout/stderr、trust entries、session transcriptをcopyしない。JSON exampleもtyped synthetic valuesだけをcanonical serializeする。translated string内のMarkdown/HTML/link syntaxはallowlist parserで検証する。

## Secret and privacy controls

guide source、rendered guide、locale catalog、snapshot、link report、command test outputへ次を含めない。

- provider/API/OAuth token、SSH/Git credential、credential-bearing URL
- prompt/assistant/tool/session content、audit raw payload
- home/absolute workspace/private installer path、username
- trust file path/other project entry、committed backup content/path

hashはsecret maskingではないため、secretをhashしてexample/evidence IDへ載せない。canary scannerはauthored/rendered両面とtest snapshotsを検査し、redaction後の結果だけを保存する。redaction failureはguide build failureで、raw fallbackを行わない。

## Supply-chain guidance ordering

Pi Package local/git手順では、最初のmutating commandより前にhost-code execution、trust≠sandbox、source review、immutable pin、dependency/install-script reviewを表示する。CSS折畳み、脚注だけ、後段FAQだけにsecurity warningを置かない。

update手順は現在pin/revisionと候補revisionのdiff確認を先行し、remove/uninstallはsetup routeとPi Package routeを区別する。`pi remove` / `pi uninstall` の実際のcanonical command IDが実装catalogで確認できない場合、推測したcommandを出荷せずunresolved claimでbuildを止める。

npm publish、registry token、artifact signatureを提供しないことを明記し、unsigned sourceをsigned/verifiedと表現しない。

## Bilingual semantic parity

日英guideは同じ`PiGuideFactProjection`から生成し、localeごとの差はlabel、説明文、文法だけとする。verifierは次を比較する。

- required section/claim/command/evidence/link ID集合
- claim severity、polarity、preconditions、support status
- command argv token/placeholder/safety class/ordering
- warningが最初のmutating commandより前にあること
- unsupported/version/platform matrix

文字列類似度やheading数だけでparityを判定しない。security claimが翻訳で「必須」から「推奨」、「しない」から「できる」へ変わるmutation fixtureをfact metadata差分として拒否する。

## Generated documentation integrity

authored contract/catalogからrendered guideへ一方向生成し、rendered Markdownをcatalogへreverse importしない。same input/configで連続2回renderし、normalized bytesとsecond-run diff 0を要求する。

guide expected inventoryはrendererに束縛されたtrusted contractから取得し、observed docsを期待setにしない。日英fileとinventory entryを同時削除してもmissingとなる。unexpected extra guide、backup/temp file、unresolved placeholder、draft/TODO/予定claimを正式配布へ含めない。

## Threat matrix

| Threat | Control | Negative verification |
|---|---|---|
| shell injection command | typed argv/placeholders + renderer escape | operator/newline/substitution fixture拒否 |
| credential URL漏洩 | canonicalizer + link/secret scanner | userinfo/query/token canary 0件 |
| trust autoapprove誘導 | forbidden command/polarity claim | `--approve` mandatory command 0 |
| translationでwarning弱化 | shared fact metadata parity | severity/polarity mutationでbuild red |
| unverified green claim | evidence-backed claim admission | missing/stale evidence refで出荷0 |
| Markdown/HTML injection | context escape + syntax allowlist | fence/link/raw HTML mutation安全表示 |
| path/private backup disclosure | relative path policy + opaque remediation | home/private root canary 0件 |
| moving Git ref推奨 | immutable source placeholder | branch-only install claim拒否 |
| rendered docs自己整合 | trusted expected guide inventory | doc+inventory同時削除でmissing |
| outdated destructive command | implementation command catalog binding | command token driftでguide build red |

## Failure policy

| Failure | Result | Publication policy |
|---|---|---|
| Required fact/evidence missing | guide build blocked | speculative prose fallback 0 |
| Command/placeholder invalid | command projection failure | raw shell string fallback 0 |
| Locale parity mismatch | bilingual build failure | one-language publish 0 |
| Link/scheme/redirect invalid | link failure | credentialed retry 0 |
| Secret/path canary detected | security scan failure | artifact/snapshot publish 0 |
| Generated drift/unresolved TODO | distribution drift | formal guide success 0 |

## Verification gate

- command catalogへnewline/operator/substitution/glob/NUL/credential URL/path escapeを注入し、renderer/publicationを拒否する。
- trust/sandbox/pin/dependency/unsupported/remove claimのseverity/polarity/precondition/evidenceを日英片側でmutationし、parity guardをredにする。
- first mutating commandより前のsupply-chain warningを削除/移動し、ordering checkをredにする。
- Markdown fence/link/raw HTML/control characterをsynthetic valueへ混入し、rendered structureとlink policyを検証する。
- token/home/worktree/private-backup/trust-other-project canaryをauthored catalog、locale、rendered docs、snapshots、link reportでscanする。
- guide/inventory entryの同時削除、extra/temp file、unresolved placeholder、TODO/予定claim、stale evidence refを拒否する。
- same catalog/configを連続2回renderし、normalized byte一致とsecond-run diff 0を確認する。
- read-only commandだけをisolated fixtureで実行し、mutating/trust command dispatch count 0を確認する。

検証はREADMEの自己申告、heading数、翻訳文字列類似度ではなく、trusted fact/command/evidence catalog、typed renderer AST、actual generated inventoryから判定する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:10:57Z
- **Iteration:** 1
- **Scope decision:** none

typed fact projection、日英semantic parity、安全なargv表現、mutation前warning、trusted inventoryとsecret/private-path非開示が一貫し、具体的なsecurity・実装・契約上の阻害を認めない。

### Findings

- None
