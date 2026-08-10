# Requirements — per-unit directive 完全性と失敗裁定遷移

本書は、[`intent-statement.md`](../../ideation/intent-capture/intent-statement.md)、[`scope-document.md`](../../ideation/scope-definition/scope-document.md)、CodeKB の [`business-overview.md`](../../../../codekb/amadeus/business-overview.md)、[`architecture.md`](../../../../codekb/amadeus/architecture.md)、[`code-structure.md`](../../../../codekb/amadeus/code-structure.md)、[Issue #2833](https://github.com/amadeus-dlc/amadeus/issues/2833)、[Issue #2834](https://github.com/amadeus-dlc/amadeus/issues/2834)、および両 Issue の全クロスレビューコメントを入力とする。

## Intent 分析

利用者が必要としているのは、per-unit Construction の一次事実を後続の engine 判断へ欠落なく投影することである。成功側では、非 per-unit consumer と reviewer が全 Unit の実在成果物を読めなければならない。失敗側では、Retry / Skip / Abort の裁定が swarm / non-swarm の selector と cursor に反映され、裁定済み Unit を無断で再 dispatch してはならない。

両 Issue は `amadeus-orchestrate.ts` の per-unit directive 発行経路を共有するため、`cid:intent-capture:c4-2` に従い1 intentで追跡する。実装上の独立性は units-generation の Unit と Construction Bolt で表現する。

### 確定済み仕様裁定

2026-08-10 のユーザー裁定により、#2834 は**限定改訂**とする。

- 非 per-unit consumer が per-unit producer の成果物を読む場合、定義済み Unit 集合のうち当該 producer stage を `succeeded` で終えた Unit（以下「effective producer population」）へ `N Unit × M artifact` で fan-out する。Skip により `cancelled` となった Unit は母集団から除外する。
- この経路では unresolved `{unit-name}` を emit しない。Unit 集合を決定できない場合は error directive で fail-closed とする。
- skeleton / `--single` の produces など、placeholder が意味を持つ既存面では placeholder exemption と round-trip を維持する。
- unresolved placeholder 全般を `consumes_absent` へ移す全面改訂、および新しい構造化 directive field の追加は行わない。

## Functional Requirements — per-unit input fan-out

### FR-DIR-1: 確定 Unit 集合への fan-out

engine は、非 per-unit consumer が per-unit producer の required artifact を consume するとき、current intent の effective producer population を用いて artifact path を Unit ごとに展開しなければならない。定義済み Unit 全体と effective producer population は別の集合として扱い、前者から無音で Unit を消してはならない。

- Given 2 Unit と1 required artifact が確定している、When consumer directive を発行する、Then `consumes` と `consumes_absent` の合計には2本の concrete Unit path が現れる。
- 展開結果のどの path にも `{unit-name}` が残ってはならない。
- Given Unit A が `succeeded`、Unit B が Skip により `cancelled`、When stage gate 通過後に consumer directive を発行する、Then Unit A の concrete path だけを列挙し、Unit B の path は `consumes` と `consumes_absent` のどちらにも載せない。Unit B の cancelled outcome は監査投影に保持する。

### FR-DIR-2: 同根7 consumer / 19 edge の全数閉包

fan-out 契約は build-and-test / ci-pipeline / performance-validation / observability-setup / incident-response / deployment-pipeline / environment-provisioning の7 stageすべてへ同一に適用しなければならない。

- Given stage graph の現行宣言、When per-unit producer から非 per-unit consumer への required edge を機械抽出する、Then 7 consumer / 19 edge が検査対象になる。
- 1 stage または一部 edge だけを修正して完了扱いにしてはならない。

### FR-DIR-3: producer 所有権と consumer Unit 解決の分離

artifact の producer stage は path template の所有者であり続ける一方、非 per-unit consumer の emit 時には確定 Unit identity を全件適用しなければならない。

- Given producer が `for_each: unit-of-work` で consumer が非 per-unit、When consume path を解決する、Then producer の配置規則を保った concrete path を得る。
- consumer 自身が per-unit でないことを理由に既定 placeholder へフォールバックしてはならない。

### FR-DIR-4: concrete path の存在分類

fan-out 後の各 concrete path は、既存の presence 契約に従って `consumes` または `consumes_absent` のどちらか一方へ分類しなければならない。

- Given concrete artifact が on-disk、When directive を組み立てる、Then path は `consumes` に1回だけ現れる。
- Given required concrete artifact が欠落、When directive を組み立てる、Then path は既存 schema の required-absent 表現で `consumes_absent` に現れ、present として扱われない。
- `succeeded` Unit の artifact 欠落は `consumes_absent.expected: false` の実 gap とし、`cancelled` Unit は required path の候補自体から除外する。

### FR-DIR-5: Unit 集合不確定時の fail-closed

fan-out が必要なのに対象 Unit 集合を一意に決定できない場合、engine は利用不能な placeholder directive や不完全な代表 Unit directiveを返してはならない。

- Given Unit 集合が未確定・不整合・曖昧、または `failed` / pending Unit が残る、When対象 consumer の `next` を評価する、Then `kind: "error"` の説明可能な directive を返し、stage cursor を成功方向へ進めない。
- 明示的に0 Unitが確定した場合も、required per-unit input を空集合で成功扱いせず fail-closed とする。

### FR-DIR-6: 正当な placeholder round-trip の保存

今回の限定改訂は、skeleton-unresolved と `--single` の produces など、実 Unit が未確定であること自体を表す既存 placeholder 契約を変更してはならない。

- Given 現行 `t116` test 16 と `t186` の skeleton round-trip、When fan-out 修正後の focused suite を実行する、Then既存期待が green のままになる。
- placeholder exemption を全 path へ一般化して `consumes_absent` に送る変更は行わない。

### FR-DIR-7: reviewer read scope の完全性

reviewer runtime は、fan-out 済み directive の on-disk per-unit inputs を read scope に全件保持しなければならない。

- Given N Unit の required artifacts がすべて on-disk、When reviewer scope を作る、Then directive が列挙した全 concrete path が read scope に含まれる。
- required artifact の欠落を単なる `filter(onDisk)` により無音で成功扱いしてはならず、directive の absent 情報から検証可能でなければならない。

### FR-DIR-8: artifact slug sensor の非退行

upstream-coverage sensor の artifact slug による判定契約は変更してはならない。

- Given fan-out 前後で同じ stage frontmatter、When upstream-coverage を実行する、Then path の本数ではなく既存 artifact slug 集合を同じように評価する。
- 本 Issue の修正根拠として「sensor が偽 green になる」という反証済み主張を用いてはならない。

## Functional Requirements — failure decision projection

### FR-OUT-1: engine-owned な Unit 裁定投影

engine は、halt-and-ask 後の Retry / Skip / Abort を、swarm と non-swarm の両 per-unit 経路で selector と cursor が読める durable な Unit outcome として投影しなければならない。

- 既存の `BOLT_FAILED`、`SWARM_BATON_RETURNED`、監査バックの Unit pool projection、終端 outcome `succeeded | failed | cancelled` を入力候補とし、新規 workflow state の追加を必須としない。
- 書かれるだけで読み手のない監査イベントを完了証拠としてはならない。

### FR-OUT-2: 裁定の相関と優先順位

engine は、裁定を intent、stage、Unit、attempt / batch に相関付け、同一対象の最新の有効裁定だけを次 directive に反映しなければならない。halt-and-ask の1 occurrence は失敗 Unit `Z` 1件を対象とし、Retry / Skip は `Z` のみに作用する。Abort だけが current Construction 全体へ作用する。

- Given 過去 attempt の Abort と新 attempt の Retry、When selector が次 batch を選ぶ、Then stale Abort が別 attempt を抑止しない。
- 別 intent、別 stage、別 Unit の failure evidence が current selector へ混入してはならない。
- Given 1 batch で複数 Unit が失敗、When全 parallel Task が帰還する、Then original batch の決定的順序で失敗 Unit ごとに1 occurrenceを解決し、1件の Retry / Skip を他の失敗 Unitへ暗黙適用しない。未解決の失敗 Unitがある間は新 batchへ進まない。
- successful sibling は `succeeded`、既に skipped の sibling は `cancelled`、未解決の failed sibling は `failed` の durable outcome を保ち、別 Unit の裁定で上書きしない。

### FR-OUT-3: Retry 遷移

Retry は対象 Unit を再実行可能にし、同じ Unit の次 attempt を再提示しなければならない。

- Given failure 後に Retry が確定、When `next` を実行する、Then swarm では対象 Unit を含む `invoke-swarm`、non-swarm では対象 Unit の `run-stage` を返せる。
- Retry は stage を成功・skip・abort として記録せず、前 attempt の worktree / failure evidence を消去しない。
- parallel batch では対象 Unit `Z` だけを既存 worktree で再実行し、succeeded / cancelled sibling を再 dispatch しない。他の failed sibling は個別裁定待ちのまま保持する。

### FR-OUT-4: Skip 遷移

Skip は対象 Unit を `cancelled` 相当の終端 outcome として selector の候補から除外し、他の eligible Unit を継続可能にしなければならない。

- Given Unit A を Skip、Unit B が未実行、When `next` を実行する、Then Unit A を再提示せず Unit B を選べる。
- 全 Unit が succeeded または skipped になった場合、engine は既存の stage gate へ進めるが、skipped Unit を succeeded と偽記録してはならない。
- stage-level `skip <stage>` を Unit Skip の代替として用いてはならない。
- Skip は失敗 Unit `Z` だけを `cancelled` にし、succeeded sibling と他の failed / pending sibling の outcome を変更しない。

### FR-OUT-5: Abort 遷移

Abort は対象 Unit と current Construction を安全停止し、同一 Unit / batch の再提示を抑止しなければならない。

- Given swarm または non-swarm failure 後に Abort が確定、When `next` を実行する、Then `invoke-swarm` / `run-stage` を再提示せず、既存 Stop hook が終端と認識できる `parked` directive を返す。
- current stage を approved / completed に変更してはならない。
- 後日の明示的な再開裁定は、新しい相関済み attempt として追記できなければならない。
- parallel batch の全 Task は Abort 質問より前に帰還済みとし、Abort は各 sibling の既存 durable outcome（`succeeded` / `failed` / `cancelled`）を保存したまま Construction 全体を止める。未実行 Unit を cancelled や succeeded と推定しない。
- 明示再開後の selector は `succeeded` / `cancelled` Unit を除外し、再開裁定で eligible になった `failed` / pending Unitだけから batch を再構成する。同一 batch 形状の機械的再生を要求しない。

### FR-OUT-6: autonomous Construction の安全停止

Intent autonomy `full` / Construction autonomy `autonomous` でも、Abort に由来する engine-owned 停止は generic user `park` の拒否規則に妨げられてはならない。

- Given autonomous Construction と Abort 裁定、When engine が次 directive を発行する、Then generic `handlePark` の人間不在 guard を迂回して既存 `parked` 終端契約へ到達する。
- autonomy grant 自体を降格・剥奪して停止を実現してはならない。

### FR-OUT-7: Stop hook の既存終端利用

Stop hook の判定ロジックを変更せず、engine の `parked` 発行によって最初の Stop hook 呼び出しで turn 終了を許可しなければならない。

- Given Abort 後の `next` が `parked`、When Stop hook を1回呼ぶ、Then block directive を返さない。
- continuation budget の消尽を停止手段として用いてはならない。

### FR-OUT-8: failure evidence と worktree の保持

Retry / Skip / Abort のいずれでも、既存の failure evidence、裁定監査、Unit worktree を明示的 discard 指示なしに削除してはならない。

- Given Abort、When停止遷移を commit する、Then failure class、reason、attempt / batch 相関、worktree reference を後続の人間が監査できる。
- cleanup や discard は本 intent の自動遷移に含めない。

### FR-OUT-9: fail-open な既存逃げ道の不採用

checkbox `[?]` と stage-level skip は、Unit 裁定を誤記録または未実装 Unit を残したまま前進させるため、正式な Retry / Skip / Abort 実装として扱ってはならない。

- Given Abort、When遷移を記録する、Then「承認待ち」を意味する `[?]` を代用しない。
- Given Unit Skip、When cursor を進める、Then stage 全体を skip して未実装 Unit を無視しない。

### FR-OUT-10: `report --result failed` の既存 CLI 境界

本 intent の停止遷移は `report --result failed` の新規受理を必須とせず、既存の拒否契約を正確に検証しなければならない。

- Given `report --stage <stage> --result failed`、When現行 CLI 境界を検査する、Then **exit 0 + `kind: "error"` directive** として観測する。
- 非ゼロ exit を期待するテストを書いてはならない。将来 `failed` を受理する仕様変更は別裁定とする。

## Non-Functional Requirements

### NFR-1: 決定性と冪等性

同一の state、audit、Unit 成果物集合に対する `next` は、path 順序、重複排除、outcome 判定を含め同一意味の directive を返す。fan-out 順序はテストで固定可能な決定的順序とし、同じ path を複数回列挙しない。

### NFR-2: テスト可能性と TDD

各挙動変更は、合意済み public seam に対する failing test を先に追加して Red を実測し、最小実装で Green にする。最低限、7 consumer / 19 edge、複数・0・一部欠落 Unit、reviewer scope、swarm / non-swarm の Retry / Skip / Abort、autonomous Abort 後の `parked`、Stop hook 1回許可を自動テストする。新設ゲート・検証には故障注入による落ちる実証も必要とする。

### NFR-3: 回帰と品質ゲート

focused test に加えて `bun run lint`、`bun run typecheck`、`bun run test:ci`、`bun run build`、coverage / complexity / source-only / distribution の適用ゲートを実行し、変更由来の failure を0件にする。存在しない test path の無音除外を防ぐため、宣言 path 数と runner の実行 file 数を照合する。

### NFR-4: 最小変更と source-only 境界

正本は `packages/framework/core/` と必要な test / stage contract に限定し、Stop hook、無関係な `amadeus-orchestrate.ts` リファクタ、互換 shim、新規外部依存を追加しない。`dist/` と generated self-install surface は build 検証にのみ使い、Git 境界へ含めない。

### NFR-5: 監査可能性

各 terminal outcome と selector 判断は、intent / stage / Unit / attempt または batch / reason を辿れる一次証拠を持つ。テストはイベントの「存在」だけでなく、その証拠が実際に次 directive の分岐へ使われることを検証する。

## Constraints

- scope はユーザー裁定済みの `self-feature`、depth は engine 決定の Standard、intent autonomy は `full` とする。
- 1 intentを維持し、units-generation で Unit を分離し、Construction Bolt の swarm で並行化する。
- Bolt ごとに PR を分け、複数 Unit・工程記録・無関係リファクタを1 PRへ束ねない。各 PR 作成後に convergence loop を行う。
- PR マージは no-AI-merge。leader セッションからユーザー承認を得るまで実行しない。
- 承認済み要件・設計からの逸脱が必要になった時点で実装を止め、先に裁定を得る。

## Assumptions

- `parked` は現行 Stop hook が全 autonomy mode で終端として許可するため、Stop hook 変更なしで FR-OUT-5〜7 を満たせる。
- current stage の Unit 集合を durable state / audit から一意に再構成できる。具体的な projection と競合解決規則は Application Design で確定する。
- 7 consumer / 19 edge は observed `e756b786d944d3259e68b354415b182545af4586` の stage graph から再抽出した集合であり、実装直前にも同じ述語で再確認する。

## Out of Scope

- Stop hook の変更、新規 workflow state、generic `park` guard の緩和。
- upstream-coverage sensor の変更。
- unresolved placeholder 全般を `consumes_absent` へ送る全面契約改訂。
- structured per-unit consumes field の新設。
- Operation phase の実行、リリース、PR の自動マージ。

## Traceability

| 要件群 | 上流根拠 | 主な検証 |
|---|---|---|
| FR-DIR-1〜8 | #2834 全コメント、intent S1〜S4、scope S1〜S4、CodeKB architecture / code-structure | 7 consumer / 19 edge directive、presence split、reviewer scope、既存 placeholder pin |
| FR-OUT-1〜10 | #2833 全コメント、intent S5〜S6、scope S5〜S6、CodeKB business-overview / architecture | swarm・non-swarm 3裁定、Abort→parked、Stop 1回、exit 0 error directive |
| NFR-1〜5 | scope S7、team/project memory、Inception guardrails | TDD Red→Green、focused/full gate、監査 consumer 検証、source-only check |

## Open Questions

要件確定を妨げる未解決事項はない。Unit outcome projection の具体的な読み取りモデル、相関 key、並行 batch の競合解決は Application Design で複数案を比較して決定する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-10T13:53:03Z
- **Iteration:** 1
- **Scope decision:** none

必須セクション、5件の authoritative consumes 参照、回答証跡、質問数、Standard の要件数（18 FR）および depth-budget は適合しています。各 FR に受け入れ条件があり、上流 S1〜S7 との大枠の追跡も成立しています。ただし、複数 Unit を含む swarm の裁定粒度と、Skip 後の fan-out 境界が未定義であり、実装者と QA が重要な状態遷移を一意に判断できません。

### Findings

- BLOCKER | FR-OUT-2〜5 — 複数 Unit を含む swarm batch で Retry / Skip / Abort が「1 Unit」「失敗 Unit 集合」「batch 全体」のどれへ適用されるか未定義です。特に FR-OUT-5 は「対象 Unit」と「current Construction を安全停止」を併記しており、Unit A 失敗、Unit B 成功、Unit C 実行中または未実行の時に Abort した場合、B/C の durable outcome、再開時の eligibility、同一 batch の扱いが決まりません。各裁定の対象粒度、兄弟 Unit ごとの outcome、次回 next と再開時の期待結果を明文化してください。
- BLOCKER | FR-DIR-1・4 と FR-OUT-4 — Skip された cancelled Unit が後続 consumer の「確定済み Unit 集合」に含まれるか未定義です。含める場合は必須成果物が consumes_absent になるため downstream が継続・停止のどちらになるか、除外する場合は「全 Unit への fan-out」とどう整合するかを QA が判定できません。成功 Unit と skipped Unit が混在した状態で stage gate 通過後に非 per-unit consumer を発行する受け入れ条件を追加してください。
- FOLLOW-UP | Traceability 表は FR-DIR／FR-OUT の範囲単位です。修正時に各 FR を S1〜S7 または個別成功基準へ対応付けると、要件追加・削除時の orphan 検出が容易になります。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-10T13:55:28Z
- **Iteration:** 2
- **Scope decision:** none

multi-Unit swarm の裁定粒度・兄弟 Unit の outcome・再開規則、および cancelled Unit を除外する effective producer population が明文化され、Iteration 1 の両 BLOCKER はテスト可能な形で閉包しました。

### Findings

- FOLLOW-UP | Traceability 表の FR 単位への細分化は未対応ですが、実装契約の理解や QA の合否判定を妨げません。
