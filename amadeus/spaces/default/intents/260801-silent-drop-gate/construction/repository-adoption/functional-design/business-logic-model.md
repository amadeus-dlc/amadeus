# Business Logic Model — repository-adoption

## 目的と上流トレーサビリティ

本設計は U4 `repository-adoption` の統合境界を定義する。U1 が提供する read-only evidence command と gate を実 corpus、canonical ledger、trusted base revision、blocking CI、distribution drift へ接続し、U2／U3 の修正前後差分を再現可能な証跡として閉じる。U1〜U3 の内部 algorithm、runtime 修正、root package script は再実装しない。

入力は `unit-of-work.md` の U4 ownership、`unit-of-work-story-map.md` の SC-01／03〜07 と FR-12直接 acceptance、`requirements.md` の FR-05〜15・NFR-01〜09、`components.md` の C1〜C6／I1、`component-methods.md` の evidence／ratchet command 契約、`services.md` の短命 command・CI・bootstrap workflow である。UI はなく、`frontend-components.md` は生成しない。

## Evidence promotion workflow

証跡は次の一方向 pipeline で昇格する。各段階は前段の exact bytes と digest を参照し、後段から前段を書き換えない。

1. 修正前 full revision で U1 の `census-evidence` を実行し、存在しない明示 output path に `C_pre-raw` を生成する。
2. 修正後 full revision でも同じ command、同じ roots、同じ schema、同じ rule／semantic contract を使い `C_post-raw` を生成する。
3. 人間が各 raw identity を `TP | FP` のどちらかへ分類し、非空根拠と reviewer identity を持つ classification ledger を pre／post 別に作る。
4. quality review と人間 gate が classification digest、対象 raw digest、reviewer、承認時刻、audit event identity を結合した approval receipt を発行する。
5. U1 の `approve-evidence` が raw finding と classification entry の全単射、全 digest、receipt の参照整合性を検証し、新規 path に approved evidence を生成する。
6. U1 の `baseline-candidate` が approved pre／post evidence だけを読み、`B0 ⊂ B_pre`、削除集合が #1874／#1878 identity と一致、追加集合が空である場合だけ candidate と bootstrap provenance を生成する。
7. 人間レビューで candidate bytes、初期 exemption set、全 provenance を確認した後、通常の repository change として canonical `baseline.json`／`exemptions.json` へ昇格する。
8. 昇格後は通常 `check` だけを CI から呼び、CLI に canonical ledger の更新権限を与えない。

raw、classification、approval、approved evidence、candidate は別 artifact とし、一つの可変 ledger に統合しない。pre と post の各 revision は full Git object ID で固定し、同一 revision の再実行で raw evidence が byte-identical になることを昇格条件に含める。

## Classification と精度判定

classification は raw finding の identity ごとに一件だけ存在し、未分類、重複、余剰 identity を許可しない。TP／FP の根拠は finding shape、semantic contract、該当 source bytes をレビュー可能に説明する。

精度は `FP ÷ (TP + FP) × 100` で計算し、raw censusの探索時品質は5%以下とする。finding 0件は完全走査と全 positive／negative fixture 100%を確認した場合だけ0.0%とする。baseline promotionに使う最終承認済みpre／post evidenceはFP=0を必須とする。FPが1件でもあればclassifier／catalog／fixtureを修正してraw censusから再実行し、approval receiptを発行しない。FPをbaselineへ入れず、TPと偽装せず、intentional-drop exemptionへ変換せず、第三のsuppression ledgerも導入しない。

## Baseline candidate と bootstrap provenance

集合は identity の値で比較し、件数だけを比較しない。

- `B_pre` は修正前 approved evidence の effective TP identity 集合であり、evidence-only candidate である。
- `B0` は修正後 approved evidence の effective TP identity 集合であり、初回 committed baseline の candidate である。
- `removed = B_pre - B0` は #1874／#1878 に承認済み対応付けを持つ identity と完全一致する。
- `added = B0 - B_pre` は空である。
- `B0` は `B_pre` の真部分集合である。

bootstrap provenance は pre／post revision、raw／classification／approval／approved evidence digest、candidate digest、初期 exemption identity set と digest、生成 command versionを結合する。初回 baseline が trusted base revision に存在しない場合だけ U1 がこの provenance を previous-set として検証する。一度 baseline が base revision に存在した後は bootstrap fallback を再利用しない。

U4はcanonical ledger schemaを変更しない。通常時の `previousDigest` はbase revisionから読んだ同種ledger exact bytesを指す。初回baseにledgerがない場合は、U1既存の `loadTrustedPreviousLedgers` がledger外の `bootstrap-provenance.json` を別入力として検証し、approved `B_pre`／initial exemption setをprevious setとして返す。初回current ledgerの `previousDigest` はprovenanceが宣言するprior identity-set digestと一致させるが、provenance自体やcandidate bytesのdigestへ読み替えない。base ledgerが存在する二回目以降はbootstrap入力を無視する。

## Trusted base revision workflow

CI wiring は event から比較元を推測せず、event 固有の full SHA を一つだけ選ぶ。

| Event | trusted base revision | 判定 |
|---|---|---|
| `pull_request` | event payload の base SHA | full SHA のときだけ実行 |
| push | event payload の before SHA | full SHA のときだけ実行 |
| その他／値なし | なし | fail-closed |

short SHA、空文字、全zero SHA、非hex、current HEAD、実行時 merge-base 推測を拒否する。revision が full SHA 形式でも repository object として解決不能なら U1 の typed error と非0 exitをそのまま blocking failure にする。current ledger の `previousDigest` だけを比較元の証明として使用しない。

正常時は CI が full SHA を `bun run no-silent-drop -- --base-revision <sha>` 相当の一つの argv として root script へ渡す。U1 の `GitReadPort` が shell を介さず base revision の baseline／exemption bytes を読み、current ledger と独立に previous set を作る。

### Base object materialization

U4が所有するcheckout設定はfull historyを取得する。SHA形式検証後に `git cat-file` 相当のliteral argvでcommit objectの存在を確認し、存在しない場合だけ同じoriginからliteral full SHAをdepth 1でfetchして再確認する。`pull_request` はbase repositoryのbase SHAだけを対象とするため、fork headへのwrite権限やsecretを要求しない。read-only contents権限でbase objectを取得できない、fetchが失敗する、再確認でもobjectがない場合はblocking failureとし、current HEADやmerge-baseへfallbackしない。

## Blocking CI workflow

既存 `.github/workflows/ci.yml` の lint job に、既存 lint と別の名前を持つ blocking stepを一つ追加する。新規 job、service、credential、artifact upload は作らない。

固定順序は次のとおりである。

1. checkoutをfull history設定で実行し、Bun 1.3.13、frozen installを完了する。
2. event payloadからtrusted base revisionを選び、形式検証する。
3. base objectを確認し、必要な場合だけliteral full SHAをoriginからfetchして再確認する。
4. GNU `timeout` を外側deadline ownerとし、`TERM` 30秒、追加5秒後の `KILL` でU1所有のroot `no-silent-drop` scriptを一回呼ぶ。job側の `timeout-minutes: 1` はbackup ceilingとする。
5. exit 0だけを成功とし、exit 1／2、GNU timeoutの124、KILLの137、signal、command／fetch起動失敗をstep failureにする。
6. `continue-on-error`、warning-only、stderr text判定、JSONのCI側再実装を行わない。

30秒deadlineはNFR-01の15秒性能合否を緩和せず、runnerの無期限占有だけを防ぐ。U1内部のchild-process timeoutが先に発火した場合はU1のtyped Error／exit 2を維持し、外側deadlineが発火した場合は124／137をCI infrastructure failureとして記録する。CIはCLIのstdout schemaを変更せず、exit contractを消費するだけである。baseline／exemptionの同時追加による隠蔽はtrusted previous setとのidentity subset比較で失敗する。

## Repository acceptance workflow

U4 の完了証跡は一つの evidence report に集約するが、raw artifact を複製せず digest と path で参照する。

1. 3 shape の positive／negative fixture が100%分類されることを記録する。
2. `C_pre`／`C_post` の完全走査 receipt と byte determinism を確認する。
3. TP／FP 数、式、率、classification approvalを記録する。
4. `B_pre`／`B0` の retained／removed／added identity を記録する。
5. zero／partial／symlink／source change／tool／rule／schema failureが非0になることを確認する。
6. #1874／#1878 の focused regression と #1963 の既存 t407／t411 regression を実行する。
7. full test、lint、typecheck、既存 coverage gate を実行する。
8. NFR-01 の cold／warm各5試行を測定する。
9. canonical source から全 projection を生成し、package／promotion drift guard を実行する。
10. PR base、fork PR base、通常push beforeの各event fixtureでobject materializationと実 `git show` を検証し、欠落object／fetch failure／hang injectionがblockingになることを確認する。

各 command record は full revision、cwd、command argv、environment contract、exit code、stdout／stderr digest、開始／終了時刻を持つ。secret やrunner固有tokenは記録しない。

## Performance measurement

GitHub Actions `ubuntu-latest`、Bun 1.3.13、frozen install 完了後を測定環境とする。独立した5つの fresh workspaceで最初の実行を cold、その直後の同じ workspace での一回を warm とする。

- cold sampleは5値、warm sampleも5値を保持する。
- 両群とも最大値15秒以下を合格とする。平均や中央値で超過を隠さない。
- command は通常CIと同じ root script、同じ base revision、同じ ledgerを使う。
- timeout、非0 exit、母集団差異を時間値として採用せず、測定失敗として扱う。
- 超過時は完全性、精度、fail-closedを緩めず、実装最適化またはscope再承認へ戻す。

## Distribution workflow

U2／U3 の canonical runtime source と U1 の canonical gate sourceだけを編集元とする。U4 は packagerを実行して全 harness projectionを再生成し、生成 treeを直接修正しない。

1. canonical変更と生成対象を inventory する。
2. repository既定の package生成 commandを実行する。
3. `bun scripts/package.ts --check` で generated projection driftがないことを確認する。
4. `bun run promote:self:check` で promoted root suffixのdriftがないことを確認する。
5. full regressionで harness間の既存byte parityと公開挙動を確認する。

drift failureは完了証跡へ記録するが、生成物の手修正では解消しない。

## Failure handling と停止境界

- digest mismatch、identityの不足／余剰／重複、approval参照不一致は次段を生成せず停止する。
- candidate集合条件の不成立はcanonical ledgerを書かず、scope changeの要否を人間へ戻す。
- invalid base revisionはgateを呼ぶ前またはU1のcontract loadで非0とし、current HEADへfallbackしない。
- base object materialization／literal SHA fetchの失敗はgateを開始せずblocking failureにする。
- CI failureをwarningへ変換せず、同じstep内で成功commandを後置してexitを上書きしない。
- 外側30秒deadlineのTERM／KILLを124／137として保持し、success exitへ変換しない。
- performance／precision／regression／driftのいずれかが不合格なら evidence reportを不合格として閉じる。
- canonical fileへの昇格は人間レビュー後だけであり、evidence commandは既存fileを上書きしない。

## Acceptanceシナリオ

- raw→classification→approval→approved evidence→candidate→canonical promotionの各digest改変が次段で拒否される。
- pre／post identity集合が #1874／#1878 の削除だけを示し、新規identityが0件になる。
- baseline／exemptionをsource findingと同じ変更で増やしてもtrusted base comparisonが拒否する。
- missing／short／zero／unresolvable base SHAがblocking failureになる。
- shallow clone、fork PR base、push beforeのfixtureでliteral object materialization後の実 `git show` が成立し、fetch failureはblockingになる。
- localとCIが同じrevision／ledgerで同じGateResultとexitを返す。
- violation exit 1とinfrastructure exit 2がいずれもlint jobを失敗させる。
- hang injectionが30秒TERM／5秒KILLの境界内で124／137となり、job successにならない。
- #1963の既存回帰、U2／U3 focused regression、full testがgreenになる。
- cold／warm各5値の最大が15秒以下、corpus FP率が5%以下になる。
- package／promotion driftがgreenで、generated treeの直接編集が0件になる。

## Revision Cycle 2 Resolution

- ユーザー裁定により、最終承認済みpre／post evidenceはFP=0を必須とした。NFR-02の5%はraw census探索時の品質上限として維持する。
- U4が提案した `PreviousSetReference` unionは撤回した。canonical ledger schemaと検証algorithmはU1の既存契約を維持し、bootstrap provenanceはledger外の別入力、U4はその正本値とCI供給だけを所有する。
- Iteration 2の残存2件は上記裁定で解消した。過去Review blockは履歴として改変しない。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T05:20:39Z
- **Iteration:** 1
- **Scope decision:** none

evidenceとratchetの骨格は妥当だが、CIでのbase object可用性、bootstrap digest意味、FP合否に本番導入を阻む未閉鎖契約がある。

### Findings

- CIはevent payloadから正しいbase／before SHAを選ぶが、そのGit objectをcheckoutへ確実にmaterializeする設計がない。一般的なshallow checkoutではPR baseやpush before objectが存在せず、git showが全PR／pushでtyped failureになり得る。U4が所有するworkflowでfetch-depthまたはliteral SHA fetchの契約、fork PRでの権限、fetch失敗時のblocking挙動を定義し、PR／push両方の実Git integration acceptanceを追加する必要がある。
- 初回bootstrap時の CanonicalBaseline.previousDigest の意味が通常運用と両立しない。domain-entitiesはpreviousDigestをtrusted baseの同種ledger bytes digestと定義するが、初回baseにはbaseline ledgerが存在せず、business-logic-modelはevidence-only B_pre digestをpreviousとして要求する。ledger bytes digestとidentity-set／approved-evidence digestは同じものではないため、初回canonical baselineを一意にserializeできない。git-ledgerまたはbootstrap-evidenceのtyped provenance sourceを設けるなど、初回と通常時のdigest対象・検証式を明示する必要がある。
- FP処理が上流の合否境界を実質的に強化している。requirementsのNFR-02とAR-RA-12はcorpus FP率5%以下を合格とする一方、Functional DesignはFPが1件でも残ればcanonical promotionとblocking CI有効化を完了不可とし、事実上FP=0をrepository adoptionの追加blocking criterionにしている。FP=0を正式要件として人間承認するか、5%以下の承認済みFPをbaseline／intentional-dropと混同せず安全に扱うversioned suppression契約が必要である。
- CI stepはtimeoutをblocking failureにすると規定するが、workflow側の具体的なtimeout境界がない。CLIやchild processがhangした場合、既存jobの既定上限まで占有し、NFR-01の15秒基準とも連動しない。stepのtimeout-minutesだけでは15秒を表現できないため、U1 command timeoutまたは外側process timeoutの所有者・値・signal／exit transportを定義し、hang injectionをCI acceptanceへ含める必要がある。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T05:23:36Z
- **Iteration:** 2
- **Scope decision:** none

base object取得とtimeoutは閉じたが、FP policyは明示的に未解決であり、bootstrap digest修正もU4の所有境界を越えている。

### Findings

- 成果物自身が、FPが1件以上かつ5%以下の場合の通常check契約を上流だけでは一意に決まらない未解決事項と認め、scope decisionまでpromotionを保留している。これはrequirements上は合格し得る入力でrepository adoptionを完了できない状態であり、READY条件を満たさない。FP=0を正式要件化するか、baseline／intentional-dropと分離したversioned suppressionをRequirements／Application Designで承認してから結果写像、ratchet、CI acceptanceを確定する必要がある。
- bootstrap digestの曖昧さは PreviousSetReference = git-ledger | bootstrap-evidence で解消されたが、このschemaとsource-kind別検証algorithmのownerはU1と明記されている。上流 component-methods.md のcanonical ledger契約は単一 previousDigest であり、U4はU1のschema／algorithmを変更しない境界であるため、本Unitだけではこのunionを実装できない。U1の権威成果物へ同じschema、serialization、exhaustive validationを反映するか、既存U1契約のままbootstrap provenanceを別入力として検証する設計へ戻し、Unit間contractを一致させる必要がある。
