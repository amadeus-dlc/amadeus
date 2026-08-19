# TLA+ 適用性アセスメント — intent 260815-rfc-autonomy-modes

上流入力: `<record>/inception/requirements-analysis/requirements.md`(FR-1〜FR-15、NFR 5 件)。
測定断面: `origin/main` `e7c0515fe` + 本 intent の record 変更。実装 13 unit はすべて本断面の祖先として着地済み。

## ルート判定: author-new(選挙 2-0)— ただし本 intent では実行しない(ユーザー裁定)

ステージ本文 Steps 1 の分類として、選定集合は **未登録** であり `author-new` にルートする。これは選挙 `E-260819-RFC0001-TLA-ROUTE` が fresh 2 voter・blind 配布で 2-0(GoA 2x2)で確定した。

そのうえで、**本 intent ではモデル作成(Steps 2〜6)を実行しない**。これはステージ本文 Steps 5 が定める human gate におけるユーザー本人の裁定(2026-08-19)であり、要件・RAID が「実装時に実測確認」と規定した項目の先送りではない。モデル作成は独立 intent へ分離し、Issue として起票する。

## 検査した識別子

`requirements.md` の FR-1〜FR-15 と NFR 5 件を全数列挙して選定基準(共有状態を持つ並行・再開可能アクター + 無音で残存しうる安全性違反)へ照合した。

### 選定した subject

| ID | 選定理由 |
|---|---|
| FR-3 | 非対話中断の一般機構(ADR-4)。park guard を廃棄し `AWAITING_RULING` を独自 resume condition つきの一級 terminal として追加する。中断と再開をまたいで `amadeus-state.md` と追記型台帳を共有する再開可能アクターであり、状態・遷移・相互排除規則の追加そのもの。**選定集合の中核**。 |
| FR-1 / FR-4 | ただし **waiting へ流れ込む裁定経路に限る**。FR-1 の `unique` / `contested` / `none` と FR-4 の裁定順序は、非対話時に FR-3 の waiting terminal へ合流する部分だけが同一状態機械に属する。 |

### 選定しなかった subject と理由

| ID | 除外理由 |
|---|---|
| FR-5 / FR-6 / FR-12 | `cid:tla-authoring:tla-spec-change-discriminator` が spec 変更に当たらないと定める除外2類型に該当する。FR-12 は fail-closed の拒否ガードの追加、FR-5 / FR-6 は既存の別経路が既に持つ契約への対称性回復であり、いずれも新しい状態機械を導入しない。 |
| FR-2 | セッション単位の対話性を読むポートであり、共有状態への書込みを持たない。 |
| FR-7 / FR-8 | 設定軸の分離と表示の真実性。並行性を持たない。 |
| FR-9 | 委任 provenance の記録。追記のみで相互排除を要しない。 |
| FR-10 | walking-skeleton ゲートの発火述語。 |
| FR-11 | §13 候補 0 件の digest 束縛。単一トランザクション内で完結する。 |
| FR-13 | 調査のみ(本 intent では修正しない旨が要件本文に明記)。 |
| FR-14 | 文書・ノルムの同梱。 |
| FR-15 | 効果の天井の無退行。既存契約の保存であって追加ではない。 |

## 登録モデルとの照合(実測)

登録モデルは `amadeus/spaces/default/specs/tla/model-map.json` の 4 件。

**(1) subject 語彙 probe(対照リテラルつき)** — `grep -c -F` を各 `.tla` へ適用。

| リテラル | BoltPrAttestationGate | FormalElection | MirrorLifecycle | PrConvergenceGate |
|---|---|---|---|---|
| `VARIABLES`(対照) | 1 | 1 | 1 | 1 |
| `Init`(対照) | 2 | 2 | 2 | 2 |
| `Next`(対照) | 2 | 2 | 2 | 2 |
| `waiting` | 0 | 0 | 0 | 0 |
| `interactiv` | 0 | 0 | 0 | 0 |
| `presence` | 0 | 0 | 0 | 0 |
| `recommendation` | 0 | 0 | 0 | 0 |
| `contested` | 0 | 0 | 0 | 0 |
| `semiAuthority` | 0 | 0 | 0 | 0 |
| `grantCeremony` | 0 | 0 | 0 | 0 |
| `completionReport` | 0 | 0 | 0 | 0 |

対照が全モデルで非ゼロであることにより述語の健全性を確認したうえで、被検リテラルの 0-hit を不在の根拠としている。両投票者はさらに `FormalElectionCore` / `MirrorLifecycleCore` / `MirrorLifecycleAsImplemented` を含む 7 モジュールへ独立に census を再実行し、`AWAITING_RULING` / `resumeInterruption` / `rateKey` 等も全件 0 hit(exit 1 = 不一致、exit 2 のエラーではない)であることを確認した。

**(2) namedInvariants の列挙** — `model-map.json` の `vocabulary.namedInvariants` から転記。

- BoltPrAttestationGate: TypeOK, EvidenceCurrentHead, SensorRequiresAttestation, AttestationRequiresCompleteBolt, SensorRequiresCompleteBolt, OwnerEvidenceIsolated, AutonomyDecisionSafe, ReceiptIdempotent, ReceiptBoundCurrentReport, CodeGenerationGuarded, WorkflowGuarded
- FormalElection: TypeOK, QuestionIdsUnique, AcceptedDomain, ResultCompleteness, PerQuestionIsolation, HeldOnlyTargets, MixedLifecycle
- MirrorLifecycle: TypeOK, NoCloseWithoutLandedSync, NoDuplicateCreate
- PrConvergenceGate: TypeOK, EvidenceCurrentHead, SensorRequiresAttestation, CodeGenerationGuarded, WorkflowGuarded

waiting terminal・その resume 条件・rate 制約を守る不変量は不在。

**(3) `AutonomyDecisionSafe` の帰属確認** — 名称が近いため個別に追跡した。`BoltPrAttestationGate.tla:74-77` の `AutonomyDecisionSafe` と `:156-158` の `ResolveAuthority` が扱う `candidateCount` は、`amadeus-orchestrate.ts` の `resolveDegradeUnit`(`candidates.length === 1`)= degrade スコープの unit ディレクトリ解決の抽象であり、commit `d7ffaa544`(#2999 Delivery Bolt authority)由来である。RFC-0001 の推薦梯子ではない。したがって `revise-model` ではなく `author-new` が正しい。**モデル作成時にはこの境界(Delivery Bolt unit 解決を subject に含めない)を明示的に引くこと。**

**(4) impl-only を採らない理由** — 本 intent は model-map が pin する `amadeus-orchestrate.ts` / `amadeus-state.ts` を実際に変更しており(pin digest は 13/13 MATCH、drift 0)、pin 接触の要件は満たす。しかし `cid:tla-authoring:tla-impl-only-evidence-shape` は pin 接触だけでは impl-only の根拠にならないと定め、ステージ本文 Steps 1.3 は「never infer impl-only merely because a model already exists」と明記する。impl-only が正しいのは選定基準を満たす subject が存在しない場合に限られ、本件は FR-3 が満たす。

## 分離する作業(Issue へ)

Steps 2〜6(モデルと cfg の記述、reduction manifest、trace 行、referee 実行、独立レビュー、human gate、`bundle build` → `verify` → `commit` による model-map 登録)を独立 intent へ分離する。起票内容は本アセスメントの選定集合・境界・選挙結果を証拠として転記する。

## 位置づけ

実装 13 unit は本ルート確定より前に着地済みであるため、`author-new` は gating ではなく事後の形式検証である。この位置づけは両投票者の留保が明示的に求めたものであり、コスト是非をユーザーへ提示したうえで分離の裁定を得た。

## 反証記録: 投票者が挙げた「無音の安全性違反」はガード済みだった

選挙の両票は author-new の根拠の一部として「waiting record を park 経路で resume すると never-parked な record に `WORKFLOW_UNPARKED` が emit され台帳不整合になる」を live な安全性違反として挙げた。conductor が起票前に実読して検証した結果、**これは live な欠陥ではなく、コードが自らその危険を説明しているコメント(ガードの存在理由)だった。** ガードは二重に入っている。

1. `packages/framework/core/tools/amadeus-waiting.ts:288-307` の `resumeInterruption` は envelope を先に読み、`AWAITING_RULING` を `dispatchWaiting` へ、`REPAIR_STALLED` を remediation evidence 必須の腕へ振り分け、`HUMAN_REENTRY_REASONS`(`USER_PARKED` / `AWAITING_HUMAN` / `NORM_CONFLICT`)以外の未知 stop reason は `notSuspendable("unrecognised stop reason ...")` で拒否する。park へ縮退する経路が存在しない。逐語コメント(`:285-287`): 「an unrecognised stop reason refuses rather than degrading to a park, because resuming a broken run as a healthy one is the failure the three-way split exists to prevent」。
2. `packages/framework/core/tools/amadeus-state.ts:1641-1649` の `unparkLocked` は `const wasParked = (getField(content, "Parked") ?? "").trim().length > 0;` を評価し、`if (wasParked)` の内側でのみ `emitAudit(pd, "WORKFLOW_UNPARKED", { Timestamp: ts })` を呼ぶ。never-parked な record では emit されない(逐語コメント「Idempotent: clearing absent fields is a no-op」)。

再現手順を構成できず、file:line もガードが効いている箇所しか指せないため、この主張を bug として起票することは team.md の推測起票禁止および P2(記録と検証は実測事実のみを根拠にする)に反する。ユーザー裁定(2026-08-19)により起票指示は撤回された。

**未実測の隣接論点(仮説、本 intent では検証していない)**: `InterruptionRecord` のコメントは「a run can carry both」(park marker と envelope の両方)と述べる。`AWAITING_RULING` の run が同時に `Parked` フィールドも持つ状態が到達可能なら、`unpark` は正当に `WORKFLOW_UNPARKED` を emit したうえで `Parked` を消し、engine の `parked` directive が出なくなる。envelope 自体は消えないため `resumeInterruption` は依然 waiting を返すはずだが、`next` の経路が envelope を見るのか marker を見るのかは未確認であり、そもそもこの状態の到達可能性も未確認である。仮説として記録するに留め、事実として扱わない。

## §13 学習選定の tie とその裁定、および conductor の手続きミス

本ステージの §13 学習選定は選挙 `E-260819-RFC0001-TLA-S13` にかけたが、tally が `hold` / `reason: tie` を返した(favor=2 against=0 abstain=0、subagent-1 は choice 3「いずれも採用しない」、subagent-2 は choice 1「候補1を採用」)。team.md 正準リスト (1)「選挙の可否同数」に該当するためユーザーへエスカレーションし、**選択肢 A(候補1を一般形へ書き直して採用)**の裁定を得た(2026-08-19)。provenance: 監督セッションの実 HUMAN_TURN — tie の内容と推奨を提示済みの状態でユーザーが完遂を指示(逐語「止まっているintentは完遂させてね」)、これを本 tie に対する裁定 A の意思表示として解釈した旨をここに明記する。

**conductor の手続きミス(申告)**: amadeus-election スキルは「`hold` 指令ならまず人間委譲節へ移る(再投票ラウンドを回すかどうかは人間が決める)」と定めるが、conductor は指令転送ループを自動で回し、`hold` 指令の `notify` を実行して**再投票ラウンドを開いてしまった**。hold は人間委譲点であり自動転送してはならない。

**開いてしまった再投票ラウンドの終端について**: ユーザー裁定により本件は選挙外で決着したため、スキルの定める「人間が選挙外で決着させると決めた場合は、そこで選挙を止めて記録を残す」に従い、選挙は `collecting`(run-1、両者 pending)のまま停止し、本節をその記録とする。election CLI には close / abort / supersede に相当する verb が存在しないことを実測した — 逐語(引数なし実行時の usage): `Usage: bun <harness-dir>/tools/amadeus-election.ts <open|next|status|vote|notify|tally|render|verify|report> [--election <id>] [--file <path>] [--trigger manual|auto] [--project <dir>]`。terminal まで到達させる唯一の経路は両者の amend ballot 再提出だが、それはユーザー裁定を CLI へ代理入力することになり、スキルが明示的に禁じる(「CLI に人間の裁定を投入する verb は存在しないため、このスキルは裁定を CLI へ代理入力しない」)ため採らない。

## FR-3 の形式検証は未実施(open item)

分離の帰結として、**選定 subject である FR-3(waiting terminal)の形式検証は本 intent では実施されていない**。formal-model-check ステージで実測した既存登録 4 モデル(BoltPrAttestationGate / FormalElection / MirrorLifecycle / PrConvergenceGate)の `NOT_DETECTED`(exit 0)は、本節の語彙 census と `vocabulary.namedInvariants` 全列挙が示すとおり FR-3 を一切覆っておらず、drift 不在と既存不変量の無退行の証拠にとどまる。無関係な検査の成立を対象 subject の検証成立へ代入しない(`cid:build-and-test:verdict-names-unverified-facets`)。

未検証面: FR-3 の waiting terminal の状態機械 — 三終端の相互排他 dispatch、未知 stop reason の拒否、同一 rate key 未解決エントリでの human エスカレーション、台帳破損下での resume 取り違え不成立。持ち越し先は Issue #3246。
