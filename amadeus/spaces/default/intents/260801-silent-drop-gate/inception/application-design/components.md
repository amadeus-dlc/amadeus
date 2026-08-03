# Components — no-silent-drop

## 設計入力と境界

本設計は `requirements.md` の FR-01〜FR-15／NFR-01〜NFR-09、Brownfield の `architecture.md` と `component-inventory.md`、`team-practices.md` の self-feature Walking Skeleton を入力とする。新規境界は contributor-side の短命 Bun CLI だけとし、既存 Amadeus runtime、AWS、UI、HTTP、DB、常駐 service へ広げない。

Q1 の裁定により、no-silent-drop は単一 deploy 単位の CLI とする。内部 component は public TypeScript interface で分離するが、別 package、別 process、汎用 framework にはしない。外部 process は exact pin した ast-grep binary だけである。

## 新規 CLI の component

| ID | Component | 目的 | 所有する責務 | 所有しない責務 |
|---|---|---|---|---|
| C1 | Gate Contract | 実行契約を閉じる | roots、拡張子、除外、`check | census-evidence | approve-evidence | baseline-candidate` mode、CI base revision の trusted previous ledger、`NSD001`〜`NSD003` の型／経路 catalog、診断 code、schema version | filesystem 走査、process 起動、結果表示 |
| C2 | Source Manifest Scanner | 完全走査の母集団と解析 bytes を保証する | regular file 列挙、symlink 拒否、path 正規化、走査前後 SHA-256、source snapshot、read-only mirror、expected／receipt 集合照合 | AST rule 判定、baseline 判定 |
| C3 | Ast-grep Rule Adapter | 固定 binary を型付き port にする | binary 絶対解決、argv 起動、coverage sentinel を含む rule bundle、stdout JSON decode、path＋digest receipt、exit／stderr 分類 | catalog の意味、policy verdict |
| C4 | Census & Semantic Classifier | raw match を型・経路情報で一意な finding にする | repository-local TypeScript Program、symbol／union 解決、catalog 制約下の保守的 path evaluator、AST fingerprint、identity、安定 sort、candidate catalog census | baseline／exemption の許否 |
| C5 | Baseline & Exemption Policy | 既存債務と意図的 drop を統治する | raw／exempted／effective finding 集合、`B_pre`／`B0`、subset ratchet、同数置換拒否、marker grammar、TP／FP evidence、policy findings | source discovery、process 起動、CLI I/O |
| C6 | Gate Command & Result Renderer | 検査と bootstrap evidence を構成する | C1〜C5 の順序制御、classification／approval の再取込み、read-only evidence output、`Pass | Violations | Error`、stdout 単一 JSON、stderr 要約、exit 0／1／2 | rule 詳細の再実装、runtime state mutation、正本台帳の暗黙更新 |

C1〜C6 の source、rule、fixture、台帳は `tests/no-silent-drop/` に置く。entrypoint は `tests/no-silent-drop-gate.ts`、root package script は `bun run no-silent-drop` とする。baseline と exemption はそれぞれ `tests/no-silent-drop/baseline.json`、`tests/no-silent-drop/exemptions.json` とし、意味の異なる台帳を統合しない。`check` だけが CI の public gate であり、baseline と CI event から明示された base revision を必須とする。C1 は `git show <trusted-base>:<ledger>` を literal argv で読み、base baseline／exemption の identity set と digest を current ledger に対する ratchet 入力にする。同一 PR で source finding と current ledger identity を同時追加しても、trusted previous set との差分で拒否する。初回 baseline が base に存在しない場合だけ、承認済み `bootstrap-provenance.json` の `B_pre`／candidate `B0` digestと初期exemption set／digestをprevious-setとする。

初回 bootstrap は baseline 非依存の `census-evidence` で未分類 `C_pre`／`C_post` を明示 output path に書く。人間が別 `classification-ledger.json` を作成し、FPが1件でもあればclassifier／catalog／fixtureを修正してraw censusから再実行する。FP=0のclassificationだけをquality review／human gate の `approval-receipt.json` とともに `approve-evidence` へ再入力する。command は census／classification の identity 全単射、manifest／rule／semantic digest、reviewer、approval timestamp／audit event ID、FP=0を照合して approved evidence を新規 path に出す。承認済み pre／post evidence だけを `baseline-candidate` へ渡して candidate `B0` を生成する。正本への昇格は人間レビューを伴う通常の repository change だけが行い、CLI は正本を上書きしない。

## 静的解析と scan receipt の成立条件

- C2 は元 source を一度だけ bytes として取得して `SourceSnapshot(path, digest, bytes, language)` を作り、同じ bytes から isolated read-only mirror を生成する。C3 と C4 は元 filesystem を再読しない。
- C3 の単一 ast-grep invocation は検出 rule と、各 parse 対象の root `program` を1件だけ返す内部 coverage sentinel を同じ bundle で実行する。sentinel は policy finding には含めない。
- C2 は mirror 作成時と ast-grep 終了後に mirror digest を snapshot digest と照合する。C3 は sentinel の path を snapshot digest と結合した `ScanReceipt` を返す。expected path と receipt path の欠落・余剰・重複を `SCAN_PARTIAL` にする。
- C4 は同じ snapshot bytes から repository-local TypeScript の in-memory `Program`／`TypeChecker` を構築する。ast-grep は candidate 抽出を担当し、C4 が C1 の明示 catalog に従って戻り値 union、symbol identity、Result 検査、必須 write と success outcome の全 path を判定する。symbol／type／path を一意に解決できない candidate は見逃しにせず `RULE_INVALID` へ fail-closed する。
- C1 の catalog は `NSD001` の許可 terminal union、`NSD002` の `applyTransition(...): StateResult`、`NSD003` の3経路と write／postcondition／success outcome を閉集合で所有する。命名ヒューリスティック単独では確定しない。

## 既存 runtime component の変更

| ID | Existing Component | 変更後の責務 | Public boundary | 主な要件 |
|---|---|---|---|---|
| R1 | Text Mutation Boundary (`amadeus-lib.ts`) | 検証済み state document 上で checkbox／suffix target の一意存在と postcondition 成立を型で返す | `ValidatedStageState`、`TextMutationResult = changed | not-found` | FR-04、FR-11、NFR-09 |
| R2 | State Mutation Callers (`amadeus-jump.ts`、`amadeus-utility.ts`、`amadeus-state.ts`) | R1 の全結果を検査し、not-found を write 前に既存 error boundary へ昇格する | 各 CLI の既存 exit／JSON contract | FR-11 |
| R3 | Mirror Executor (`amadeus-mirror-executor.ts`) | `persistBlocked` が `applyTransition` の結果を検査する | 既存 `MirrorOperationOutcome` | FR-03、FR-04、FR-10 |
| R4 | Mirror State Store (`amadeus-mirror-state-store.ts`) | transactional outbox と commit 前後の既存意味を維持する | 既存 `WriteOutcome`／`StateResult` | FR-10、NFR-03、NFR-09 |
| I1 | CI Lint Integration (`.github/workflows/ci.yml`) | `bun run no-silent-drop` を独立 blocking step として1回実行する | process exit 0／1／2 | FR-13、NFR-01 |

R1〜R4 は新規 component へ移さない。静的 gate が runtime を import せず、runtime も gate を import しないことで、検出 policy と業務 state transaction の blast radius を分離する。

## Public interface と ownership

- C1〜C5 は値を返す interface だけを公開し、`process.exit`、stdout、stderr を呼ばない。
- C2 と C3 の I/O は注入可能 port に閉じ、pure policy test が filesystem／subprocess を要求しないようにする。C4 の TypeScript compiler host も snapshot-backed port とする。
- C6 だけが process adapter を所有し、最終 exit code を一度だけ決定する。
- R1 の `TextMutationResult` は `amadeus-lib.ts` が所有し、R2 は別の類似 union を作らない。重複／malformed stage line は `ValidatedStageState` の生成時に既存 validation failure とし、対象0件だけを `not-found` にする。対象が既に期待値なら idempotent postcondition success として `changed` を返し、bytes 同一を許す。
- R3 は `applyTransition` の内部 `StateResult` に `pre-commit | durability-unknown` failure phase と `clean | outbox-pending` commit marker を保持する。`stateFailure` は既存 `warning.effect` を pre-commit=`not-started`、durability-unknown=`outcome-unknown` に設定するため caller は文字列解析なしで区別できる。commit 済みは既存 `safety-blocked` へ写像し、R4 の outbox contract を複製しない。
- I1 は JSON の中身を再解釈せず exit code だけを blocking 判定に使う。

## 非適用 component

- AWS Platform: 新規 resource、IAM、network、storage、cost 面はない。CI runner 上の短命 process だけである。
- UX/UI: 画面、対話 component、accessibility surface はない。利用者体験は stdout の機械可読 JSON と stderr の修復可能な要約で担保する。
- Deployable service: 0件。独立 scaling、service discovery、remote API、queue は導入しない。

## 要件追跡

| Component | Requirements |
|---|---|
| C1 | FR-01〜FR-04、FR-09、NFR-04、NFR-08 |
| C2 | FR-05、FR-06、FR-09、NFR-01、NFR-04 |
| C3 | FR-01〜FR-04、FR-09、NFR-08 |
| C4 | FR-03、FR-04、FR-06、FR-15、NFR-02、NFR-04 |
| C5 | FR-07、FR-08、FR-15、NFR-02、NFR-05 |
| C6／I1 | FR-09、FR-13、FR-15、NFR-01、NFR-09 |
| R1／R2 | FR-04、FR-11、NFR-09 |
| R3／R4 | FR-03、FR-04、FR-10、NFR-03、NFR-09 |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T03:19:28Z
- **Iteration:** 1
- **Scope decision:** none

baseline bootstrap、静的解析能力、走査完全性、runtime failure 型に実装を阻む未閉鎖の契約がある。

### Findings

- baseline の bootstrap が循環している。C1 は baseline 欠落を Error にする一方、初回 committed B0 は修正後の完全 census から生成する必要があり、C_pre／B_pre を生成する evidence mode の entrypoint、入力、出力、承認から B0 への昇格契約が公開 interface に存在しないため、最初の正常実行を開始できない。
- NSD001／NSD003 と全候補 census は、呼出元の宣言済み union、非-success variant、Result の検査、write と success outcome の経路順序という型・制御フロー情報を必要とするが、設計には構文検索の ast-grep adapter と raw match normalizer しかない。TypeScript semantic resolver、明示的な型／経路 catalog、または保守的に完全性を証明する別 component を定義しなければ、要求された一意分類と網羅性は実装不能である。
- scan receipt の生成元と証明力が未定義である。C3 は ast-grep の match JSON を返すだけで、各 expected path が実際に解析されたことを示す receipt 契約がなく、argv へ渡した事実を receipt にしても partial scan の oracle にならない。また C2 の snapshot bytes と ast-grep が別々に filesystem を読むため、一時変更や A→B→A の変更を前後 hash が見逃し、finding と snapshot が異なる内容に由来し得る。immutable snapshot を解析するか、解析済み bytes／digest に結び付いた receipt を定義する必要がある。
- Exemption → Baseline の集合意味が閉じていない。C6 は exemption 後に baseline を評価すると記すが、`evaluateExemptions` と `evaluateBaseline` の間に有効な免除を除いた effective finding set の型付き受け渡しがなく、baseline が raw finding、非免除 finding、または exemption ledger identity のどれを保持するか不明である。このままでは正当な exemption を baseline 新規違反として拒否するか、免除解除・陳腐化で新規債務を見逃す実装が成立する。
- R1 の `changed | not-found` は、対象不存在、対象は存在するが既に期待値、複数一致、malformed state を一意に表現できない。設計は複数一致と malformed を helper 外の既存 validation boundary に委ねるが、その検証結果を helper に渡す interface も全 caller 共通の事前条件も定義しておらず、既存の冪等呼出を failure に変える可能性と部分置換の余地が残る。
- R3／R4 はすべての `persisted.kind === "failed"` を同じ `stateFailure` に畳んでおり、FR-10 が区別する commit 前 byte-invariant failure、rename 後 `durability-unknown`、state commit 後 audit pending、audit 後 stale outbox を caller が判別できる型や commit marker がない。既存 public type を維持するなら、各 failure point がどの既存 variant／code／retry policyへ写像されるかを明記しなければ偽成功防止と冪等収束を実装できない。
- 公開結果型と error taxonomy が要求より弱い。`GateResult` の violations は `Finding[]` で空配列を許し、`decodeAstGrepJson` は同じ schema failure を `RULE_INVALID` または `INTERNAL_ERROR` のどちらにもでき、timeout・spawn failure・非0 exit の `InfraCode` 対応も未確定である。非空配列型と全 failure source から閉じた code／scan nullability／exit への exhaustive mapping が必要である。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T03:29:14Z
- **Iteration:** 2
- **Scope decision:** none

前回の主要境界は具体化されたが、台帳増加のCI検知、bootstrap分類入力、semantic census、durability outcomeに未閉鎖契約が残る。

### Findings

- 通常 `check` は `evaluateBaseline(effectiveFindings, currentBaseline)` しか行わず、`B_next` と信頼済み `B_current` の比較元を持たないため、同一PRで新規違反と baseline identity を同時追加すれば通過できる。exemption ledger も同様に、markerとledger identityの同時追加を検出できない。FR-07／FR-08／FR-13を満たすには、base revision、前台帳digestを連鎖したversioned ledger、または同等の信頼済みprevious-setをC1／C5／C6へ入力し、台帳自体の追加と同数置換をCIで比較する必要がある。
- bootstrap workflow は人間分類を機械入力へ戻す契約が閉じていない。`runCensusEvidence(deps, outputPath)` は分類入力を受けないのに、`buildCensusEvidence` は `ClassificationLedger` を要求し、手順ではC_pre生成後に人間がTP／FP分類する一方、`baseline-candidate` は承認済み分類を含むpre／post evidenceを要求する。分類ledgerの生成・署名または承認記録・再取込み・manifest一致検証を担う明示command／interfaceが必要である。
- 全候補censusの公開interfaceがsemantic設計と一致しない。`enumerateStatusCandidates(sources: SourceSnapshot)` は `SemanticProgram`、`TypeScriptCompilerPort`、catalogを受けないため、判別union、callee symbol、success／write対応候補を型情報で全件分類できず、C4のsnapshot-backed compiler portも迂回し得る。構造候補列挙とsemantic分類を分け、同一Program・catalog・dependency receiptを必須入力として閉じる必要がある。
- directory fsync失敗は内部 `StateResult.failed(durability-unknown)` まで型付けされたが、R3境界では汎用 `stateFailure` のsummary prefixへ畳まれ、FR-10が要求する呼出結果 `durability-unknown` をcallerが判別可能な型／codeとして保持しない。既存 `MirrorOperationOutcome` を変更しない方針なら、既存のどの判別field／exit codeへ写像するかを定義し、文字列解析に依存せずpre-commit failureと区別できる契約が必要である。
