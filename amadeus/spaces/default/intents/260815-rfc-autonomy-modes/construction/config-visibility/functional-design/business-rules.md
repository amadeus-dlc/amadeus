# Business Rules — unit config-visibility(U7 / C7 + C8 / FR-7 + FR-8)

## R-1: `solo-election.trigger.mode` は config leaf として存在しない

`AMADEUS_CONFIG_REGISTRY` に `solo-election.trigger.mode` のエントリは存在せず、`AmadeusConfigKey` union にも含まれない。この文字列を(新旧いずれの形でも)含む config は解決不能な設定として扱われる。
- **トレース**: FR-7、ADR-8(Q17=A + Q18=A)。
- **落ちる実証**: 現行 `amadeus-config.ts:602-613` にこのエントリが実在し正当に解決されることを Green(before)として実測し、削除後は同じ config が `{ kind: "invalid" }` を返すことを pin。

## R-2: 旧キー(3系統・計6文字列)はすべて loud fail する

次の6文字列のいずれかが config のいずれかの層(project/space/intent)に出現した場合、`resolveAmadeusConfig` は必ず `{ kind: "invalid", issues }` を返す(exit 非0の呼出し元契約は既存のまま): `solo-election.trigger.mode`、`auto-solo-election`、`intent-mirror.github.issue.mode`(改名後の旧名)、`auto-mirror`、`finding.github.issue.creation.mode`(改名後の旧名)、`auto-file-findings`。
- **トレース**: FR-7 AC「落ちる実証 — 旧キーを含む config で loud fail(exit 非0+理由)を pin」、ADR-8「同一 PR で全面同期」。
- **落ちる実証**: 6文字列それぞれを単独で含む config fixture(project 層)を用意し、各々が `invalid` を返すことを1件ずつ pin(6ケース)。

## R-3: 廃止と改名で issue の `expected` メッセージを書き分ける

`solo-election.trigger.mode`/`auto-solo-election` の issue は「mode から自動導出されるため設定不要」の文言を持ち、新しい config パスを案内しない。mirror/finding の2キー(新旧名・legacy alias 含む)の issue は改名後の新パス名(`intent-mirror.github.issue.consent` / `finding.github.issue.creation.consent`)を明示する。
- **トレース**: ADR-8「新キー名をエラーへ明示」(consent 軸)と「キー自体を廃止」(solo-election)の非対称、functional-design-questions.md Q1。
- **落ちる実証**: R-2 の6ケースについて issue の `expected` 文字列を検査し、廃止系(2件)は新パスを含まず、改名系(4件)は新パスを含むことを pin。

## R-4: consent 軸2キーの値語彙は不変

`intent-mirror.github.issue.consent`/`finding.github.issue.creation.consent` は既存の `MirrorMode`(`off`/`prompt`/`auto`)をそのまま受け付ける。値の妥当性判定(`parseMode`)は変更しない。
- **トレース**: ADR-8「語彙 manual/auto 不変」、functional-design-questions.md Q2。
- **落ちる実証**: 改名後の新キーに `off`/`prompt`/`auto` それぞれを設定した config が既存同様に解決されることを無退行 pin として置く(値検証ロジックの無改変確認)。

## R-5: `deriveSoloElectionTrigger` は config を読まない純関数

`deriveSoloElectionTrigger(mode)` は `AutonomyMode`(`"none" | "semi" | "full"`)のみを入力に取り、`none → "manual"`、`semi | "full" → "auto"` を返す。ファイル I/O・config 解決を内部で行わない。
- **トレース**: ADR-8「mode から自動導出」、C7 のシグネチャ(component-methods.md「`deriveSoloElectionTrigger(mode): "manual" | "auto"`」)。
- **落ちる実証**: 3入力(none/semi/full)に対する出力を pin する純粋なテーブルテスト(I/O モックが不要であること自体が「純関数である」ことの構造的証明)。

## R-6: `statusAutonomyFacet` は既存の実効判定関数の合成のみを行う

`statusAutonomyFacet(projectDir)` は独自の対話性判定・投影判定ロジックを持たず、U2 の `resolveSessionInteractivity`、U5/U6 の投影関数、本 unit の `resolveAmadeusConfig` の結果を素通しで合成する。
- **トレース**: FR-8 UI 真実性、component-methods.md C8、functional-design-questions.md Q3。
- **落ちる実証**: `statusAutonomyFacet` が `resolveSessionInteractivity` と同じ入力に対して常に同じ `interactive` 値を返すこと(独自判定を持たないことの間接証明 — 両者を同一 fixture で呼び分岐が一致することを pin)。

## R-7: `--status`/statusline は乖離を表示しない(不明は不明と表示する)

`statusAutonomyFacet` の呼出しが失敗・不定になった場合、`--status`/statusline は既定値や推測値で埋めず、既存の `autonomy === null` → `"unavailable"` 相当のフォールバック表示を用いる。偽の(実効値と異なる)値を表示してはならない。
- **トレース**: FR-8「宣言と実効の乖離は loud fail する」「廃止した設定キーは無視せず loud fail する」という UI 真実性契約の可視化面への適用、`amadeus-utility.ts:355` の既存 `null` 分岐踏襲。
- **落ちる実証**: `resolveSessionInteractivity`/投影関数の読取が失敗する fixture で `--status` 出力に固定のダミー値(例えば `"none"` や `"unknown"` ではなく明示的な `unavailable` 系文言)が出ることを pin(推測値の混入がないことの反証)。

## R-8: 消費者未確定の廃止キー参照は本 unit が改修しない(境界の明示)

`amadeus-election.ts:274` と `amadeus-orchestrate.ts:4139` は `solo-election.trigger.mode` の実消費者だが、owned files 外につき本 unit では改修しない。R-1〜R-2 の実装後、これら2ファイルは(改修されるまで)必ず `resolved.config.soloElection.trigger.mode` への参照でコンパイルエラーまたは常時 `undefined` 参照になる — この事実は「フィードバックが早期に表面化する」意図された設計(サイレントな握りつぶしを避ける)であり、本 unit の欠陥ではない。
- **トレース**: unit-of-work.md owned files、functional-design-questions.md Q4、brief「Do NOT touch any path outside your assigned unit dirs」。
- **落ちる実証**: 該当なし(本 unit は実装しない)。最終報告で契約矛盾として明示する。
