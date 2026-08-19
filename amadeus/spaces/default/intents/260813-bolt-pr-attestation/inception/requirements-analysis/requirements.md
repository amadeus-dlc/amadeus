# Requirements — Issue #2985 multi-Unit Bolt の PR 証跡合成

**Intent**: `260813-bolt-pr-attestation`（scope `self-fix`、depth Minimal）  
**対象 Issue**: [#2985](https://github.com/amadeus-dlc/amadeus/issues/2985)  
**上流入力**: `amadeus/spaces/default/codekb/amadeus/business-overview.md`、`architecture.md`、`code-structure.md`、`re-scans/260813-bolt-pr-attestation.md`。前3面の #2985 現在節と再スキャンの observed `0fbbec42bb33d625bdb9d034789c0ff391df1287` を根拠とする。  
**検証根拠**: Issue 本文の完了条件1〜7、[独立レビューA](https://github.com/amadeus-dlc/amadeus/issues/2985#issuecomment-5284349564)、[独立レビューB](https://github.com/amadeus-dlc/amadeus/issues/2985#issuecomment-5284349894)、Reverse Engineering の focused tests（187 pass / 0 fail）。

## Intent 分析

Delivery Planning は1 Boltへ複数 Unitを割り当てられるが、現行の Construction runtime、PR convergence CLI、provenance、attestation は単数 `unit` を所有する。1件の Bolt PRを Unit Aへ束縛すると Unit Bが provenance mismatchとなり、Unit B用に同一 headの別PRを作る経路は GitHub 制約と one-Bolt-one-PR契約に反する。このため、fail-closed検査を維持したまま `report --stage code-generation --result completed` へ到達できない。

本修正では候補Aを採用する。Delivery Boltを証跡の集約単位とし、その正規 Unit集合、1件のPR identity、head tuple、attestation、audit receiptを結び、各 member Unitの完了証跡へ投影する。これは Issue #2985 の明示要件による限定例外であり、無関係な Unit、別 Bolt、別 Intentの変更を1 PRへ束ねる一般許可にはしない。

## 機能要件

### FR-BPA-1: Delivery Bolt の正規 Unit 集合

PR convergence の正規入力・永続証跡は、Bolt identityと、その Boltに属する空でない一意な Unit集合を保持する。信頼するmembership sourceは、engineが承認済みDelivery Planningから解決しConstruction workへ渡す Intent / Bolt / member Units の組であり、multi-Unit実行時にそれが欠ける場合は拒否する。単一 Unit Boltは要素数1の同じモデルとして扱い、既存の単一 Unit識別を失わない。集合の正規化はUnit slugの昇順で行い、順序や再開回数に依存せず同じ identityを得る。

受け入れ: 2 Unit / 1 Boltで両 Unitが同一 Bolt identityと同一 Unit集合を観測し、入力順を逆転したresumeでも同じidentityを得る。集合の欠落・重複・異なる Bolt所属、承認済みmembershipを持たないmulti-Unit入力を拒否する。

### FR-BPA-2: one-Bolt-one-PR と同一 head の維持

1つの Delivery Boltに属する全 Unitは、1件の Bolt PR、同じ repository/head branch、同じ local/remote/PR head tupleへ束縛される。既存PRの再利用は Bolt identity、Unit集合、head tupleが完全一致する場合だけ許可し、同一headへ2件目のopen PRを要求しない。

受け入れ: 2 Unit / 1 BoltでPR番号が全 member Unit間で同一となり、別PR、foreign head、stale head、異なる Unit集合での再利用は fail-closedとなる。

### FR-BPA-3: 複数 Unit provenance の正規表現

CLIが作成・検査するPR title/bodyの `Amadeus Work` provenanceは、Intent identity、Bolt identity、そのBoltの全member Unitを機械可読かつ一意に表現し、FR-BPA-1のengine-resolved membershipと照合する。単一 Unit形式の現行正常経路は維持し、multi-Unit形式への手書き置換、別PRからのコピー、member Unitの部分集合による偽装を受理しない。

受け入れ: create/status/reportが同じ正規 provenanceを往復でき、順序差を含む意味的同一入力は一意に扱う。追加・欠落・改変した Unit identityに加え、同じUnit集合を別Boltまたは別Intentへ再帰属したprovenanceを拒否する。

### FR-BPA-4: 共有 attestation の per-unit evidence 投影

1件のBolt PRから得た共有convergence tuple（Intent、Bolt、正規member Unit集合、PR番号、local/remote/PR head）を、member Unitごとにowner-bound reportへ投影する。各投影は完全な共有tupleに加えて `ownerUnit` と所定pathを持つ。digest preimageはattestation envelopeとaudit receiptを除くreport bodyをwriterの固定field順でrenderしたUTF-8（BOMなし、改行LF、末尾改行1つ）のbytesとし、先にbody digestを計算する。そのdigest・owner Unit・共有tupleをattestationと固有audit receipt identityへ束縛してからenvelopeを付加するため、自己参照を生じない。共有tuple以外のowner-bound body、digest、audit receiptをUnit間で共用しない。

受け入れ: sensorはstrict schema parse→canonical body再render→body digest照合→attestationのowner/shared tuple照合→audit receipt照合→owner path照合の順で検証してPASSする。Unit Aの投影をUnit B pathへ差し替える、ownerUnitだけを書き換える、改行・field順を非正規化する、1 Unit分だけ生成する、digestまたはaudit identityを共用する場合はstage completionが成立しない。

### FR-BPA-5: Construction runtime と完了境界の合成

Delivery Planning由来の Bolt membershipを Constructionの実行、CLI引数、sensor、state completionまで失わずに伝搬する。Unit dependency DAGのtopological batchをDelivery Bolt identityの代用にせず、resume後も同じ Bolt / Unit / PR対応を再構成する。

受け入れ: 2 Unit / 1 Boltの全成果物とreview verdictが揃った後、`report --stage code-generation --result completed` が成功し、partial evidenceでは遷移を拒否する。

### FR-BPA-6: 単一 Unit と carry-forward の回帰維持

1 Unit / 1 Boltでは、Unit worktree上の正規 `create/status/report` lifecycle、reportとaudit receiptの統合側へのcarry-forward、completion guardの現行契約を維持する。複数 Unit対応のために単一 Unitを特別な弱い検査へ落とさない。

受け入れ: (a) 1 Unit / 1 Boltでcreate→status→report→sensor PASS→統合側carry-forward→code-generation completionを直接完走し、PR/3 heads/owner Unit/report digest/audit receiptの全境界が一致する。(b) 2 Unit / 2 Boltの対照統合テストで、各 Boltが別PRと別head-bound evidenceを持ち、両 Unitの最終 stage completionが成功する。

### FR-BPA-7: fail-closed 攻撃・劣化経路

tampered、copied、replayed、stale、partial、foreign-Bolt、foreign-Unit、PR/head mismatchのreport・provenance・attestation・audit receiptを拒否する。sensor無効化、手書きreport、identity偽装を正規回避策として導入しない。

受け入れ: 既存否定テストを維持し、multi-Unit evidenceの部分コピー、別Unit集合へのreplay、古いhead、1 member欠落、同じUnit集合の別Bolt・別Intentへの再帰属を新規否定テストで固定する。

### FR-BPA-8: full autonomy の無人継続

正規 Bolt / Unit membershipから実行可能なPR経路を一意に導出できる場合、`full` autonomyは「同一headに別Unit用PRを作る」など実現不能な選択を人間へ質問しない。真正性の欠落や衝突で一意に導出できない場合は、推測せず型付きエラーとしてfail-closedに停止する。

受け入れ: full autonomyの2 Unit / 1 Bolt統合テストが人間向けPR選択directiveを返さず完了し、意図的な membership矛盾では自動選択せずエラーになる。

### FR-BPA-9: 契約文書と配布面の同期

`pr-convergence` の one-Bolt-one-PR契約を「Delivery Boltの全 member Unitを1 PRへ束縛できるが、別 Bolt・別 Intent・無関係変更はfoldしない」と明確化する。CLI・型・stage文書・harness配布面で単数と複数の契約を一致させる。

受け入れ: 正本を `bun run build` で全配送先へ投影し、source-only境界と隔離2回ビルドのbyte-identical検査を通す。

## 非機能要件

### NFR-BPA-1: 証跡完全性

Unit集合、PR identity、head tuple、report digest、audit event identityのいずれかを検証できない場合は受理しない。GitHub/API障害、read失敗、schema不明、旧証跡の曖昧な解釈を成功へフォールバックしない。

### NFR-BPA-2: 決定性と冪等性

同一 Bolt / Unit集合 / PR / headでのstatus、report、resume、再検証は同じ正規 identityを導出し、重複receiptや順序依存を生まない。再試行は既存証跡を別 Boltや別 Unitへ再帰属させない。

### NFR-BPA-3: 回帰検証可能性

挙動修正はTDDで、修正前に2 Unit / 1 Boltが失敗する falling proofを確保する。対象単体・統合テストに加え、typecheck、lint、隔離2回build、source-only、graph invariants、full suite、plugin-conformance-e2eを通す。Project Coverage Gateはwhole-suite normalized LCOV line populationについて、`tests/.coverage-project-policy.json` の固定絶対下限90.00%以上、かつmerge-base比の低下0.02 percentage points以内をANDで満たす。Patch Coverage GateはPR差分のLCOV測定可能な追加行について、理由付き正規allowlistを除くzero-hit行0件を満たす。

### NFR-BPA-4: 局所性と互換境界

変更は Delivery Bolt membership、PR provenance、attestation、sensor、completionの合成境界に限定し、一般 runtime/state/orchestratorを不要に再設計しない。単一 Unitの公開CLI契約は維持するが、真正性を証明できない旧・曖昧schemaを推測変換する互換shimは導入しない。

## 制約

- Bun-only TypeScript monorepoであり、正本は `packages/framework/core/` と plugin/harness sourceである。生成 `dist/` と自己インストール面はコミットしない。
- GitHubは同じhead branch/refに複数のopen PRを作成できない。正規経路はこの制約を前提にする。
- `amadeus/spaces/default/memory/project.md` のPR粒度規則は既定であり、本 Intentは Issue #2985に必要な「同一 Delivery Boltのmember Units」に限る狭い例外とする。
- 新しいblocking検査またはgateを追加する場合、修正前に落ち、修正後に通る実証を伴う。

## 前提

- Delivery Planningが宣言する Bolt identityとmember Unit集合を正準入力として利用できる。
- 2 Unit / 1 Boltを正規に完了させることは Issue #2985の確定済み要求であり、1 Unit = 1 Boltへ強制分解してケース自体を消すことは本修正の完了とみなさない。
- 既存の単一 Unit attestation、strict head検査、audit receiptは再利用対象であり、無効化対象ではない。

## Out of scope

- #2813 の選挙機能そのもの、#2976 のUnit failure election、#2967 のadvisory handoffを再設計すること。
- Unit dependency DAGやConstruction runtime全体の一般リファクタ、Delivery Planningの全面再設計。
- 別 Bolt、別 Intent、工程記録、無関係リファクタを同一PRへ束ねる一般的なmulti-Unit fold。
- PRのmerge/close、リポジトリ管理者による最終リリース操作。

## Open questions

なし。PR表現・内部型の最小実装詳細はcode-generationで選べるが、上記identity不変条件と受け入れ条件を変更してはならない。

## Issue 完了条件トレース

| Issue #2985 完了条件 | 対応要件 |
| --- | --- |
| 1. identity modelの一意な整合 | FR-BPA-1、FR-BPA-4、FR-BPA-5 |
| 2. 1 Unit経路の維持 | FR-BPA-3、FR-BPA-6 |
| 3. multi-Unit evidence / 同等実行モデル | FR-BPA-1〜FR-BPA-5、FR-BPA-9 |
| 4. GitHub同一head制約とstrictness | FR-BPA-2、FR-BPA-7 |
| 5. 2 Unit / 1 Boltと2 Unit / 2 Bolt | FR-BPA-5、FR-BPA-6、NFR-BPA-3 |
| 6. fail-closed回帰 | FR-BPA-7、NFR-BPA-1 |
| 7. full autonomy無人継続 | FR-BPA-8 |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-13T23:23:04Z
- **Iteration:** 1
- **Scope decision:** none

狭い例外の基本方針とIssue完了条件1〜7へのトレースは明確ですが、共有証跡のUnit束縛、単一Unit回帰、Bolt境界の真正性に実装・試験を一意化できない欠落があります。現状では、既存sensor契約を維持しながらfail-closedを保証できません。

### Findings

- BLOCKER | FR-BPA-4は「共有attestation/audit receiptを各Unitへ投影する」と定める一方、上流sensorはowner pathのUnitとattestationのUnitを照合します。全Unitで同一の共有証跡を使うのか、共有PR証跡からowner Unitに束縛された投影を生成するのかが未定義です。投影ごとのowner Unit、完全なmember集合、report path、audit identity、digest対象と正規化範囲を明記し、別Unitへの投影差し替えが失敗する受け入れ条件が必要です。
- BLOCKER | FR-BPA-6の明示要件は1 Unit/1 Boltのcreate/status/report、carry-forward、completion guardの維持ですが、受け入れ条件は2 Unit/2 Bolt対照試験だけです。単一Unitの正常系と既存carry-forwardを直接実行し、各境界が成功することを示す合否条件がないため、QAは回帰なしを判定できません。
- BLOCKER | FR-BPA-2とFR-BPA-7はforeign-Boltを拒否するとしていますが、FR-BPA-3の機械可読PR provenanceに必須なのはmember Unit集合だけで、Bolt identityおよびIntent境界の証明方法が契約化されていません。同じUnit集合を別Boltとして再帰属・replayした場合にもBolt一致を独立検証できるよう、信頼するmembership sourceとPR provenance/attestation間のBolt・Intent束縛を定義し、別Bolt・別Intentの否定試験を追加する必要があります。
- BLOCKER | NFR-BPA-3の「coverage両条件」とpatch coverageには、対象となる2条件、測定対象、合格閾値が記載されていません。明示された品質要件である以上、requirements.md単独でQAが合否判定できる具体的な検証契約が必要です。
- FOLLOW-UP | FR-BPA-1の「順序・再開非依存」はFR-BPA-5およびNFR-BPA-2から推測できますが、Unit順序を入れ替えたresumeで同一identityになる直接の受け入れ例を追加すると、決定性の解釈差を防げます。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-13T23:25:58Z
- **Iteration:** 2
- **Scope decision:** none

FR-BPA-4はdigest preimage、正規化規則、生成順序、検証順序、否定受け入れ条件まで明確化され、自己参照と実装解釈差が解消しました。未解決BLOCKERはありません。

### Findings

- None
