# Design Decisions — no-silent-drop

## 設計入力と裁定方針

本 ADR 集は `requirements.md` の FR-01〜FR-15／NFR-01〜NFR-09、Brownfield の `architecture.md` と `component-inventory.md`、`team-practices.md` の self-feature／Walking Skeleton 方針、および `application-design-questions.md` の Q1〜Q5 に対するユーザー裁定を入力とする。

選択肢が複数成立する境界では、fail-closed、決定性、既存 runtime の局所変更、配布物の非増加を優先した。AWS、UI、HTTP、DB、常駐 service は要件上非適用であり、新たな設計判断の対象にしない。

## ADR-001 単一 contributor CLI と6つの内部 component

- Context: 静的 gate は local／CI で同じ結果を返す短命 command であり、独立配備、remote API、永続 state を必要としない。一方、完全走査、ast-grep 接続、正規化、baseline／exemption、出力契約は別々に検証できる責務である。
- Decision: `tests/no-silent-drop-gate.ts` を唯一の entrypoint とし、Gate Contract、Source Manifest Scanner、Ast-grep Rule Adapter、Census Normalizer、Baseline & Exemption Policy、Gate Command & Result Renderer の6 component を同一 Bun process 内で構成する。Q1 の A を採用する。
- Positive Consequences: composition root が1つになり、CI は1 step／1 exit code contract だけを扱う。pure component と I/O adapter を分離でき、fixture と failure injection を局所化できる。
- Negative Consequences: component ごとの独立 versioning／scaling はできない。ただし本 gate にその要求はない。
- Neutral Consequences: ast-grep だけは child process として動くが、deployable service 数は0のままである。
- Alternatives Rejected: rule ごとの独立 CLI は orchestration と schema 統合を重複させる。既存 runtime tool への統合は配布先 workspace の責務を増やす。既存 gate への統合は異なる policy と台帳を一つの file に集中させる。
- Reversibility: 中。内部 interface を維持したまま file 分割は可能だが、複数 CLI／service 化には新しい実行契約が必要になる。

## ADR-002 exact pin した公式 ast-grep CLI を型付き process adapter から使う

- Context: AST 判定には parser を自作せず ast-grep を使う。Bun frozen install、network 非依存、15秒 budget、tool／schema failure の fail-closed が必要である。Node API は experimental であり、system binary や `bunx` は実行環境差を持ち込む。
- Decision: `@ast-grep/cli` を `package.json` の exact devDependency と `bun.lock` に固定し、repository-local binary を絶対解決する。C3 は shell を介さず argv 配列で起動し、exit、stdout JSON、stderr、timeout、spawn failure を閉じた result に decode する。Q2 の A を採用する。具体的な数値 version は Construction 開始時に package／lockfileへ同時記録し、range指定を許可しない。
- Positive Consequences: local と CI の parser／rule engine が一致し、PATH、registry、shell quoting に依存しない。adapter fake と実 binary integration を分けて検証できる。
- Negative Consequences: upstream update は dependency と decoder fixture の明示更新を要する。
- Neutral Consequences: child process overhead が生じるため、rule invocation 数と固定並列度は NFR-01 の実測で決める。
- Alternatives Rejected: `@ast-grep/napi` は experimental API への直接結合になる。system binary は version 再現性を失う。`bunx` は検査時の network／registry resolution を導入する。独自 parser は scope 外である。
- Reversibility: 容易。C3 の `ProcessPort` 背後を交換できるが、交換先も同じ typed result と再現性を満たす必要がある。

## ADR-003 gate 専用 directory と分離台帳を正本にする

- Context: contributor gate の実装、rule、catalog、fixture、baseline、exemption は一緒にレビューできる必要がある。一方、既存債務の ratchet と意図的 drop の承認は意味と更新条件が異なる。
- Decision: Q3 の A を採用し、source／rule／catalog／fixture を `tests/no-silent-drop/` に集約する。baseline は `tests/no-silent-drop/baseline.json`、exemption は `tests/no-silent-drop/exemptions.json` として別 schema／別 file にする。通常の `--check` は両台帳を read-only で扱う。
- Positive Consequences:変更差分から実装、検出 rule、fixture、債務、例外を追跡しやすい。baseline 削減と exemption 承認を混同しない。
- Negative Consequences: `tests/` 配下に executable gate source が置かれるため、命名と package script で entrypoint を明示する必要がある。
- Neutral Consequences: scan roots は `packages/framework/core/`、`packages/framework/harness/`、`scripts/` のままであり、gate 自身を自己走査対象にはしない。
- Alternatives Rejected: `scripts/` への全配置は authored scan root と gate policy を混在させる。`.codex/` は配布 framework sensor の責務を増やす。`package.json` 埋込みは大きな台帳差分と schema validation を読みにくくする。
- Reversibility: 容易。C1 の明示 path と package script を同時に変更すれば移動できるが、baseline と exemption の分離は維持する。

## ADR-004 manifest 完全性と identity-set ratchet を件数比較より優先する

- Context: scan 漏れ、走査中変更、line 移動、既存1件削除と新規1件追加の同数置換は、単純な finding 件数では検出できない。要件は修正前の `C_pre`／`B_pre` と修正後の committed `B0` を区別している。
- Decision: C2 が regular file の expected manifest と bytes snapshot を作り、その bytes だけから read-only mirror を生成する。C3 は検出 rule と全 file の root `program` を返す coverage sentinel を単一 invocation で実行し、path＋snapshot digest receipt を返す。C2 は expected／receipt と mirror／元 source の走査後 hash を照合する。C4 は path、RuleId、AST fingerprint を基に安定 identity を作る。C5 は `effective current ⊆ committed baseline` の集合関係だけを許可し、added identity が1件でもあれば削除数に関係なく拒否する。`C_pre`／`B_pre` は修正前 evidence、`B0` は同じ修正を含む commit 時点の正本とする。
- Positive Consequences: omitted file、mid-scan race、line-number churn、同数置換を別々に検出できる。既存債務の純減だけが ratchet を通る。
- Negative Consequences: read-only mirror と coverage sentinel の fixture が必要になり、fingerprint schema の変更時は明示 migration が必要になる。
- Neutral Consequences: path と finding は identity 順で sort し、時刻や filesystem 順序を結果へ含めない。
- Alternatives Rejected: count-only baseline は同数置換を許す。line／column identity は無関係な行移動で churn する。argv に path を渡した事実だけを receipt にすると ast-grep の partial scan を証明できない。元 filesystem をC2とC3で別々に読む方式は finding と manifest の由来 bytes がずれる。
- Reversibility: 中。identity schema は versioned migration で変更できるが、過去 baseline との対応表が必要になる。

## ADR-005 gate の public result を閉じた3分岐にする

- Context: policy 違反、infrastructure／contract error、成功を同じ boolean や warning に畳むと、CI と人間が failure の意味を復元できない。requirements.md の FR-09 は stdout、stderr、exit code の閉じた対応を要求する。
- Decision: public result は `Pass | Violations | Error` の discriminated union とし、`Violations.findings` は `NonEmptyArray<Finding>` とする。stdout は単一 JSON object、stderr は人間向け要約、exit は順に `0 | 1 | 2` とし、C6 entrypoint が各出力を一度だけ確定する。binary missing／spawn ENOENT=`TOOL_MISSING`、contract 不正／起動済み ast-grep の nonzero／semantic unresolved=`RULE_INVALID`、timeout／signal／spawn I/O failure／stdout schema drift=`INTERNAL_ERROR`、manifest／source failure は FR-09 の対応 code へ exhaustive に写像する。stderr 文言は分類に使わず、未知 failure を finding 0件の Pass へ変換しない。
- Positive Consequences: CI、unit test、利用者が同じ machine contract を共有し、policy failure と実行不能を区別できる。
- Negative Consequences: schema field の追加や code 変更には versioning と fixture 更新が必要である。
- Neutral Consequences: stderr 文言は補助情報であり、automation は stdout JSON と exit code を正本とする。
- Alternatives Rejected: boolean result は error taxonomy を失う。例外のみは expected failure の test を不安定にする。stderr parsing は人間向け文言に machine contract を混在させる。
- Reversibility: 中。schema version を上げれば拡張できるが、同一 version 内で optional 分岐を増やさない。

## ADR-006 text mutation は `changed | not-found` を全 callsite で消費する

- Context: #1874 の `setCheckbox`／`setStageSuffix` は bare `String.replace` の不一致を unchanged string として返し、caller が成功扱いできる。新 gate の `NSD003` はこの同族を検出するが、runtime 修正自体も明示的な failure boundary が必要である。
- Decision: Q4 の A を採用し、R1 が共通 `TextMutationResult = { kind: "changed"; content } | { kind: "not-found"; target }` を返す。全 caller は先に `validateStageState` で slug ごとの canonical line 一意性を検査し、opaque `ValidatedStageState` だけを setter に渡す。重複／malformed は既存 validation failure、0件だけは `not-found` とする。対象が既に期待値なら再 parse した postcondition を根拠に同一 bytes の idempotent `changed` とし、既存挙動を壊さない。R2 の全 callsite は `kind` を検査し、`not-found` を write／audit／success JSON より前に既存 typed error boundary へ昇格する。retry は0回とする。
- Positive Consequences: TypeScript の exhaustive check により未処理 callsite を compile 時に露出でき、silent no-op を成功経路から排除できる。
- Negative Consequences: helper の全 callsite を同一 change で移行する必要がある。
- Neutral Consequences:新しい exception class や自動 resync は追加せず、既存 CLI failure transport を維持する。
- Alternatives Rejected: helper 内 throw は正常分岐と予期しない例外を混ぜる。strict wrapper の併設は旧 silent API を残す。`{ content, changed: boolean }` は caller に無視を許す。
- Reversibility: 中。public return type を戻すことは可能だが silent-drop 防止の型保証を失うため、後方互換 wrapper は設けない。

## ADR-007 mirror 永続化失敗は既存 `stateFailure` へ昇格する

- Context: #1878 の `persistBlocked` は `applyTransition` の `StateResult` を破棄し、永続化失敗でも `safety-blocked` を返し得る。既存 Mirror State Store は atomic write と transactional outbox の commit-state-machine をすでに所有している。
- Decision: Q5 の A を採用し、R3 は `applyTransition` を1回だけ呼ぶ。内部 `StateResult` は `failed(pre-commit | durability-unknown)` と `ok(clean | outbox-pending)` を保持する。pre-commit は既存 `stateFailure` の `warning.effect="not-started"`、durability unknown は `warning.effect="outcome-unknown"` へ写像し、caller は既存 field だけで文字列解析なしに判別する。`ok` は従来の business `safety-blocked` を返す。audit append／outbox clear failure は store の `written(snapshot.auditOutbox != null)` から `ok(outbox-pending)` へ写像し、次回 drain に収束させる。`MirrorOperationOutcome`／`MirrorWarning` variant、rollback、同期 retry、outbox protocol は変更しない。
- Positive Consequences: 永続化されていない blocked state を business success として報告せず、commit 前／durability unknown／commit 後 pending を内部型と summary で区別しながら既存 public classification と caller contract を再利用できる。
- Negative Consequences:一時的 I/O failure もその invocation では failure になり、caller に再実行判断を委ねる。
- Neutral Consequences: rename 後の audit failure と audit 後の clear failureは `outbox-pending` recovery policyを共有し、既存 transaction ID による後続 drain が冪等に処理する。R3 は commit-state-machine を複製しない。
- Alternatives Rejected:新しい `persistence-failed` variant は全 consumer への不要な波及を生む。throw は typed outcome contract を壊す。同期 retry／rollback は既存 outbox の責務と競合する。
- Reversibility: 容易。R3 の局所分岐であり、既存 public type と store protocol は変わらない。

## ADR-008 ast-grep candidate を TypeScript semantic catalog で確定する

- Context: `NSD001` の許可 return union、`NSD002` の `StateResult` 消費、`NSD003` の write-before-success は構文文字列だけでは一意に判定できない。初回 catalog は閉じており、汎用 data-flow framework は scope 外である。
- Decision: ast-grep は構造候補抽出だけを担当し、C4 は同じ C2 snapshot を overlay した repository-local TypeScript `Program`／`TypeChecker` で callee symbol、宣言済み union、discriminant variant、Result 検査を解決する。全候補 census の公開 interface は structural candidates、同一 Program、C1 semantic catalog、compiler／external declaration dependency receipt を必須入力とし、別 Program／digest 不一致で実行できない。C1 は許可 terminal、status API、write／postcondition／success outcome の明示 catalog を所有する。C4 の path evaluator は catalog 対象の分岐と早期 return を全列挙し、証明不能または複数 contract 一致を `RULE_INVALID` にする。
- Positive Consequences: 命名ヒューリスティックだけで違反を確定せず、見逃しになり得る unresolved state を green にしない。
- Negative Consequences: TypeScript compiler と tsconfig／external declaration の version・digest が再現性入力になり、semantic fixture が必要になる。
- Neutral Consequences: 汎用 interprocedural analysis は行わず、初回3 rule の明示 catalog と candidate 周辺 path に限定する。
- Alternatives Rejected: ast-grep pattern だけでは union と all-path postcondition を証明できない。新規 compiler／汎用 CFG framework は scope と保守コストを超える。unresolved candidate を source violationへ推測分類すると FP を増やす。
- Reversibility: 容易。C4 の `TypeScriptCompilerPort` 背後で projector を交換できるが、catalog closure と fail-closed は維持する。

## ADR-009 baseline bootstrap を通常 check から分離する

- Context: `check` が baseline を必須にする一方、初回 `B0` は修正前後の完全 census と人間分類からしか作れない。baseline 欠落を空集合として扱うと CI を誤って green にし、正本を自動更新すると ratchet の承認境界を失う。
- Decision: C6 に baseline 非依存かつ read-only source の `census-evidence`、分類と承認を再取込みする `approve-evidence`、承認済み pre／post evidence から新規 output path にだけ candidate を生成する `baseline-candidate` を設ける。`approve-evidence` は raw census と classification の identity 全単射、manifest／rule／semantic／classification digest、reviewer、approval timestamp／audit event ID を検証する。`check` は常に baseline 必須とする。candidate は `B0 ⊂ B_pre`、対象 issue identities のみ削除、追加0件を機械検証し、人間レビュー後の通常 change だけが `baseline.json` へ昇格する。
- Positive Consequences: 初回実行の循環を解消しながら、baseline missing の fail-closed と人間承認を維持できる。
- Negative Consequences: Construction で pre-fix と post-fix の2 evidence revision、全 finding classification、昇格手順が必要になる。
- Neutral Consequences: evidence command は CI lint step には接続せず、`check` と同じ scanner／classifier を再利用する。
- Alternatives Rejected: baseline 欠落時の自動生成は意図しない債務増加を承認なしで正本化する。空 baseline fallback は既存 finding を全違反にするだけで bootstrap を解決しない。手編集 baseline は manifest／identity 集合証跡を失う。
- Reversibility: 中。初回 bootstrap 完了後も監査再現用 command として残し、通常 gate contract からは独立させる。

## ADR-010 exemption 後の effective finding set だけを baseline に渡す

- Context: raw finding、valid exemption、baseline identity の集合関係が曖昧だと、正当な exemption を新規違反にしたり、exemption 解除後の債務を見逃したりする。
- Decision: C5 は `rawFindings` から valid な `NSD002` exemption identity だけを差し引き、`effectiveFindings` と invalid／stale marker の policy finding を返す。baseline と `B_pre`／`B0` は effective TP identities だけを保持する。exemption ledger は別集合として subset ratchet を行う。
- Positive Consequences: exemption の適用・解除・陳腐化と baseline の挙動が集合式で一意になる。解除された finding は effective set に戻り、新規 baseline identity として拒否される。
- Negative Consequences: evidence は raw／exempted／effective の3集合を保存する必要がある。
- Neutral Consequences: `NSD001`／`NSD003` は差し引き対象にならず、exemption と baseline の正本 file は分離したままである。
- Alternatives Rejected: raw findings を baseline に渡すと valid exemption が機能しない。exemption identities を baseline に混ぜると別の承認・ratchet 意味が失われる。
- Reversibility: 容易。C5 の typed handoff 内の決定であり、policy file の分離を維持したまま評価順を変えられる。

## ADR-011 CI base revision を台帳 ratchet の trust anchor にする

- Context: current finding set と current baseline／exemption だけを比較すると、同じ PR で source finding と ledger identity を同時追加して gate を回避できる。self-contained な current ledger digest だけでは、その変更前集合を信頼できない。
- Decision: CI は PR の base SHA または push event の before SHA を full object ID として `check --base-revision` に渡す。C1 は shell を介さない `git show <base>:<literal-ledger-path>` で previous baseline／exemption bytes を読み、current ledger の `previousDigest` と照合する。C5 は source scan 前に previous/current identity set の追加・同数置換を拒否する。初回 baseline が base に存在しない場合だけ、承認済み pre／post evidence から生成された `bootstrap-provenance.json` の B_pre／B0 と初期 exemption set／digest を previous-set として検証する。
- Positive Consequences: current tree 内の同時変更では trust anchor を動かせず、baseline／exemption 自体の増加を CI が検出できる。
- Negative Consequences: CI workflow は event ごとの base object を checkout し、full SHA を明示する必要がある。shallow clone で base object がない場合は fail-closed になる。
- Neutral Consequences: local `check` は base revision を明示した場合だけ CI-equivalent ratchet を実行する。承認済み ledger 増加は scope change で pre-authorized delta を base に先行配置する別 workflow であり、本 intent の通常 check は許可しない。
- Alternatives Rejected: current ledger の自己申告 previous digest は同じ PR で書き換えられる。件数比較は同数置換を許す。GitHub API／remote service は credential と network dependency を追加する。
- Reversibility: 中。将来署名済み ledger chain に交換できるが、current tree 外の trust anchor と exact-set comparison は維持する。

## Cross-cutting consequences

- Security: repository-local exact binary と argv 配列だけを使い、network、credential、shell interpolation を追加しない。
- Reliability: scan completeness と runtime persistence failure をどちらも fail-closed にし、警告のみの成功経路を作らない。
- Maintainability: gate と runtime fixes は import 依存を持たず、CI の同一 lint job でのみ合流する。
- Testability: 最初の Walking Skeleton は pinned ast-grep から JSON／exit 1 までの `NSD002` slice と、`applyTransition failed` から `stateFailure` までの #1878 slice を通す。
- Distribution: canonical source を変更し、生成物は package／promotion command で再生成する。生成 tree は手編集しない。
