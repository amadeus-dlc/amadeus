# Requirements — 260803-election-state-guard(Issue #2125)

上流入力(consumes 全数): `business-overview.md`、`architecture.md`、`code-structure.md`

測定 ref: observed = `498c3034a`(RE 断面)。rebase 後の作業 base = `763ebf676`。file:line は observed 断面で実読確認済み(`re-scans/260803-election-state-guard.md` が一次記録)。

## Intent analysis

**達成したいこと**: 選挙 CLI の監査面(timeline)と集計(ledger)が、state 機械の許した遷移列とつねに整合する状態にする。

`architecture.md` 現在節が構造化したとおり、本欠陥は4つの症状に見えて**単一の設計上の欠落**に還元される — 状態遷移のコミット点(`handleReport` → `Store.setState`)と監査面への append 点(各 verb)が分離されており、verb 側に state ガードを置く設計になっていない。`code-structure.md` 現在節の配置表が示すとおり、無ガードなのは `handleNotify`(`amadeus-election.ts:406`)と `Store.materialize`(`amadeus-election-store.ts:710`)の2箇所。

`business-overview.md` 現在節が述べるとおり、利用者向けの業務機能は変わらないが、**意思決定の信頼性**という非機能面に直結する。選挙は org/team ノルムが定める合意形成の正本機構(P1)であり、その監査面が state 機械と矛盾したまま verify を通過する状態は裁定の事後検証可能性を損なう。とくに late 票レーンの迂回は集計結果そのものを変えうる。

**ゴールは「3面セットで欠陥クラスを閉じること」**であり、個々の症状の対症ではない。

## Functional requirements

### FR-1: verb 側の fail-closed な state ガード(裁定 Q1=A / Q3=A / Q9=A)

**FR-1a**: `handleTally`(`amadeus-election.ts:457-467`)は実行前に state を検査し、`collecting` 以外では `invalid-transition` 系のエラーを stderr へ出して **exit 1** を返す。tally.json の書込も timeline への append も行わない。

**FR-1b**: `handleNotify`(`amadeus-election.ts:389-422`)は実行前に state を検査し、`open` と `collecting` を受理、それ以外(`draft` / `tallied` / `rendered` / `recorded` / `hold`)では `invalid-transition` 系のエラーで **exit 1** を返す。`collecting` を受理するのは team.md `cid:requirements-analysis:dispatch-ack-required` が定める再送(3分・最大2回)を壊さないため。

**FR-1c**: ガードは **CLI 層に置く**。`Store.materialize` / `Store.appendTimeline` は永続化に徹し、state 検査を持たない。層の責務境界を維持する(`architecture.md` 現在節「修正の3面とモジュール境界」が (b) の対象モジュールを CLI 層と層別している)。

**受け入れ基準**:
- `collecting` 以外の全 state(`draft` / `open` / `tallied` / `rendered` / `recorded` / `hold` の6値)で `tally` が exit 1 を返し、tally.json と timeline.json がバイト不変であること
- `open` / `collecting` で `notify` が exit 0、それ以外の5 state で exit 1 を返し、拒否時は timeline.json がバイト不変であること
- `hold` から `collecting` へ戻る解決(`block:reopen` / `quorum-short:resume-collecting` / `discussion-needed:discussed`)の後は `tally` が再び受理されること

### FR-2: `tallied` の append 点を report 側へ移す(裁定 Q1=A)

**FR-2a**: `Store.materialize` は tally.json の書込までを担い、`kind: "tallied"` の timeline append を行わない(`amadeus-election-store.ts:710-714` の削除)。

**FR-2b**: `handleReport` が `result === "tallied"` の遷移をコミットした後に `kind: "tallied"` を append する。`at` は **tally.json の `talliedAt` を読んで使う**(report 時刻ではない) — late 分類の基準時刻と timeline の tallied 時刻を乖離させないため。

**受け入れ基準**:
- `tally` 単独実行では timeline に `tallied` が現れないこと
- `report --result tallied` の成功後にちょうど1件の `tallied` が現れ、その `at` が tally.json の `talliedAt` と一致すること
- 2回目の `report --result tallied` は既存の `from` 検査(`amadeus-election.ts:197-199`)により `invalid-transition` で弾かれ、`tallied` が重複しないこと

### FR-3: verify に kind 順序の検査クラスを追加(裁定 Q1=A / Q7=A / Q8=A)

**FR-3a**: `verifySelf`(`amadeus-election-record.ts:194-223`)に kind 順序(state 機械 legality)の検査クラスを追加する。`VerifyFinding` の `kind` に新しい値を1つ加える。

**FR-3b**: 判定には **tally.json の `resolutions`(`reason` / `resumedTo` / `at`)を引数として渡す**。`resumedTo === "collecting"` の解決が時刻 T に存在する場合、T 以降の2件目以降の `tallied` は正当と判定する。`verifySelf` は純関数のまま維持し、fs も clock も持ち込まない。

**FR-3c**: 検出すべき違反は次の3つ。`architecture.md` 現在節「派生する4つの破損経路」が名指す、時刻単調性では検出不能なパターンの全数に対応する:

- `tallied` の後に `distributed` が現れる(正当な reopen に裏付けられない場合)
- `tallied` が複数現れる(正当な reopen に裏付けられない場合)
- `tallied` の後に `ballot` が現れる(正当な reopen に裏付けられない場合)— これは経路3(late レーン迂回)が残す痕跡で、FR-1a が窓を塞いだ後も**既存記録には残る**ため検出対象に含める

### FR-3d: 既知の破損記録の台帳

verify は台帳の記録を finding から除く。台帳の初期値は **9選挙**(`elections/*/timeline.json` の機械走査出力からの転記、測定 ref = `763ebf676`):

| 選挙 | 重複 tallied | tallied→distributed | tallied→ballot |
|---|---|---|---|
| `260724-e-hpugs13` | ✓ | | ✓ |
| `260724-e-tlau2` | ✓ | | ✓ |
| `260730-e-obb2-cgs13` | ✓ | | |
| `260801-e-cpg-u2abs` | ✓ | ✓ | |
| `260801-e-omsb4-dev` | ✓ | | |
| `260803-e-esg-res13` | ✓ | | |
| `260803-e-rrp-fmcs13` | ✓ | ✓ | |
| `E-CCCRA` | ✓ | | |
| `E-TCRRA1` | | ✓ | |

症状別の内訳(同じ走査出力からの転記): 重複 tallied **8件** / `tallied→distributed` **3件** / `tallied→ballot` **2件** / 重複 tallied と `tallied→distributed` の併発 **2件**。和集合が台帳対象の **9選挙**。

`260803-e-esg-res13` は**本 intent 自身の §13 選挙**で、conductor が開票結果を表示するために指令ループ外で `tally` を単独実行して生じたもの(reverse-engineering の diary に Corrections として記録済み)。欠陥が現に再発することの実例であり、台帳から除外しない。

`architecture.md` / `reverse-engineering-timestamp.md` 現在節が「既存の破損記録7件」と書くのは observed `498c3034a`(2026-08-03T16:10:27+09:00)断面の値で、その時点では `260803-e-esg-res13`(作成 2026-08-03T20:11:06+09:00)がまだ存在しないため**当該断面では正しい**。本節の9選挙は測定 ref `763ebf676` での再走査値であり、両者は測定 ref の違いによるもので矛盾しない(`cid:reverse-engineering:measurement-ref-in-artifacts`)。

台帳の件数と内訳は実装時に同じ走査を再実行して確定する(`cid:requirements-analysis:ledger-count-mechanical-recalc`)。実装時点までに新たな破損が生じていれば台帳へ追加する。

**受け入れ基準**:
- 上記9選挙が台帳により finding を返さないこと
- 台帳に無い同型の timeline を3パターンそれぞれについて与えると finding を返すこと(落ちる実証)
- `resumedTo === "collecting"` の resolution を伴う重複 `tallied` は finding を返さないこと
- 検査は timeline の `at` / `receivedAt` を判定に使わないこと(既存の `timeline-order` と直交する検査クラスであること)

### FR-4: 既存テスト契約の明示改訂(裁定 Q2=A)

`cid:reverse-engineering:c1-pinned-behavior-ruling` に従い、テストで固定された挙動の変更を要件段で明示改訂する。改訂対象と理由:

| テスト | 現行の assert | 改訂理由 |
|---|---|---|
| `t235-election-store.integration.test.ts:222,239-240` | `materialize` 後に `timeline.some(e => e.kind === "tallied")` | FR-2a により `materialize` は append しなくなる。テストは tally.json の書込を検証する形へ改める |
| `t236-election-loop.integration.test.ts:440` ほか | distributed の件数・detail | FR-1b が `open`/`collecting` を受理するため、既存の配信経路の件数は不変の見込み。実装時に実測し、変化した場合のみ改訂する |

**受け入れ基準**: 改訂したテストごとに、改訂前の assert・改訂後の assert・改訂理由を code-generation の成果物へ記載すること。

## Non-functional requirements

**NFR-1(fail-closed)**: state 検査に失敗した場合、副作用(tally.json / timeline.json / ledger.json の書込)を一切行わずに exit 1 を返す。部分的な書込を残さない。

**NFR-2(純粋性の維持)**: `amadeus-election-record.ts` は fs も clock も持たない純関数層であり続ける。FR-3 の検査クラス追加でこの性質を壊さない(`technology-stack.md` 現在節)。

**NFR-3(投影同期)**: 患部4ファイルは 1正本 + 12投影 = 13面。`bun scripts/package.ts` → `bun run promote:self` で同期し、`bun run dist:check` / `bun run promote:self:check` を検証に含める(`code-structure.md` 現在節)。

**NFR-4(テスト配置)**: 実 FS を触る検証は integration 層、純関数の検証は unit 層に置く(`cid:code-generation:fs-tests-integration-first`)。FR-3 の検査クラスは `t238-election-record.test.ts` が `verifySelf` を直接呼ぶ純関数テストのため unit 層、FR-1 / FR-2 の state ガードは integration 層。

**NFR-5(落ちる実証)**: 新設するガード・検査は、失敗ケースを注入して実際に赤くなることを実証してから完成扱いにする(org.md Mandated)。注入は実行時に消費される行へ行う(`cid:code-generation:inject-runtime-consumed-lines`)。

## Constraints

- **C-1(記録の不可侵)**: 既存の選挙記録(`amadeus/spaces/default/elections/`)を遡及改変しない。実操作列の忠実な記録であり、見た目の整合のための書換は org.md Forbidden の検証劇場に当たる。
- **C-2(スキーマ不変)**: `TimelineEvent` の `kind` を増やさない(裁定 Q7=A)。version-controlled な append-only 成果物のスキーマ変更は本 intent のスコープ外。
- **C-3(互換レイヤー禁止)**: exit code 契約の変更に移行期間(警告のみで exit 0 維持)を設けない(裁定 Q4)。org.md Forbidden の「要求されていない互換レイヤー」に当たる。
- **C-4(層の境界)**: `packages/framework/core/tools/` を正本として編集し、`dist/` と self-install ツリーは生成物として同期する。生成物を直接編集しない。
- **C-5(TDD)**: 実行可能な振る舞いの追加・変更は TDD を既定かつ必須とする(team.md `cid:code-generation:tdd-default-with-narrow-exceptions`)。合意済みの公開 seam へ失敗テストを1件追加して Red を実測し、通す最小実装で Green にする vertical slice を1件ずつ反復する。

## Assumptions

- **A-1**: production で `Store.materialize` / `Store.appendTimeline` を直接呼ぶ経路は CLI ハンドラ以外に存在しない。よって CLI 層のガードで窓は塞がる(裁定 Q3=A / Q5=A の前提)。**実装時に呼出し元の再列挙で検証する**(`cid:requirements-analysis:enumeration-reverify-at-implementation`)。
- **A-2**: 全選挙記録を verify する CI は存在しない。反証確認済み — `tests/` の election 系はいずれも一時ディレクトリの fixture を使い、実 `amadeus/spaces/default/elections/` を走査するのは `elections.json` の実在確認のみ。よって FR-3 導入で既存の破損記録(FR-3d の台帳 9選挙)が即座に CI を赤くすることはない。
- **A-3**: `late` 票は集計に入らない。`Store.materialize` は `ballots: ledger.value.ballots` のみを固定し(`amadeus-election-store.ts:707`)、`ledger.late` は重複・amend 検査(`:584`)と再審査トレイルにのみ使われる。よって late レーン迂回の影響は「本来除外される票が算入され、集計結果が実際に変わる」ことである。
- **A-4**: `hold` からの復帰で `resumedTo === "tallied"` となる経路(`tie` / `split` の choice、`block:adopted/rejected`、`quorum-short:close-rejected`)では再 tally は起きない。よって正当な重複 `tallied` は `resumedTo === "collecting"` の3経路に限られる。

## Out of scope

- **OS-1**: `ElectionState` の二重定義(型 `amadeus-election-model.ts:39-46` と実行時 set `amadeus-election-store.ts:272-280` の `VALID_STATES`)の単一源化(裁定 Q6=A)。別 Issue として起票する。
- **OS-2**: `TimelineEvent` への遷移イベント kind の追加(裁定 Q7 で B を不採用)。
- **OS-3**: ballot の `submittedAt` が受理時刻と無関係に自己申告のまま無検証である件(#1946、反転52件)。別機序。
- **OS-4**: `coverage-patch-allowlist` の `amadeus-election.ts` エントリが reason(views mkdirSync catch = `:324`)と不一致で `:317` を指す無音転位(#1622 へ実測追記済み)。`handleOpen` を触らない限り本 intent の患部と交差しない。
- **OS-5**: 既存の破損記録(FR-3d の台帳 9選挙)の修復。C-1 により遡及改変しない。
- **OS-6**: late レーンの判定軸(`amadeus-election-store.ts:605`)への tally.json 存在の併用(裁定 Q5 で B を不採用)。**`:605` は本 intent で改修しない** — FR-1a が「tally.json は存在するが state は collecting」の窓自体を消すため、判定軸の二重化は不要かつ変更面を広げる。
- **OS-7**: `appendTimeline` 自体への「許可された state × kind」表の導入(裁定 Q3 で D を不採用)。

## Open questions

- **OQ-1**: FR-3d の台帳をどの形式・どこに置くか(JSON ファイル / コード内定数 / 既存の allowlist 機構への相乗り)。functional-design で決める。
- **OQ-2**: FR-1 のエラー文言の正確な形。既存の `invalid-transition: ${result} requires state ${transition.from}, got ${loaded.value.state}`(`amadeus-election.ts:198`)に倣うか、verb 用の別文言にするか。application-design で既習様式との整合を確認して決める(`cid:application-design:citation-semantics-check`)。
- **OQ-3**: FR-3c の違反種別を1つの finding kind にまとめるか、症状ごとに分けるか。functional-design で決める。
- **OQ-4**: `draft` state での `notify` 拒否が `handleOpen` の失敗経路と干渉しないか。`Store.create` 直後の state は `draft`(`amadeus-election-store.ts:512`)で、`open` verb はその後 views を書いてから state を進める。実装時に `handleOpen` の全経路を確認する。
