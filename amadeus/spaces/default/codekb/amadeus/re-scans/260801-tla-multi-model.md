# RE 差分リフレッシュ記録: 260801-tla-multi-model

上流入力(consumes 全数): なし(RE は起点ステージ。入力は intent-statement と Issue #1920 / #1921)

- Date: `2026-08-01T15:42:54Z`
- Base commit: `c49e385ac7b787ce151ab0f077943620bd8bf7e2`(observed の祖先、`git merge-base --is-ancestor c49e385ac HEAD` exit 0)
- Observed commit: `33e196b80b2254eee733fcaec4359dfbdd29c24b`(作業 HEAD `7e63522f5` は observed + 本 intent の record コミット 2 本 `88aa02d1f` / `7e63522f5` のみでコード同一 — `git diff --name-only 33e196b8..HEAD` の非 `amadeus/spaces` ヒット 0 件)
- Distance: `40 commits`(`git rev-list --count c49e385ac..33e196b8`)
- 区間規模: `1396 files changed, 135185 insertions(+), 15633 deletions(-)` — 最大の構造変化は `54bf1f805`(#1925、intent 260731-formal-verif-value-chain)の `scripts/formal-verif/` 30 ファイル削除 → `plugins/formal-model-check/tools/` 25 本移設 + canonical コピー `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` 新設。残りは otel 基盤拡張(resource-core / span-context / exception イベント / metrics 語彙配線)、mirror 系整備、#1922 修正(`33e196b8` 自身)、metrics スナップショット群
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth: Standard、Test Strategy: Comprehensive
- Scan mode: **differential refresh**。base 候補検証は re-scans/ の observed を新しい順に確認し 260801-open-bug-batch-5 の `c49e385ac` を採用(260801-kimi-bootstrap-deadlock の observed `861688c31` も祖先だが同区間内の中間点のため最古ではなく、直近 base としては open-bug-batch-5 と同じ `c49e385ac` が基点)。Developer scan の結果を conductor が observed HEAD で全 file:line 再実測して二重化(下記「引用再確認」)

## 対象 Issue(#1920 + #1921)の患部確定(全引用 = observed `33e196b8` で検証済み)

### model-map v2 の単一モジュール世界観

model-map v2 は `models[]` 配列で複数モデルを**登録**できるが、実行・照合・CI が FormalElection 固定のため、(a) MirrorLifecycle を恒常 CI ジョブにできず(#1920)、(b) MirrorLifecycleCore.tla 等の補助モジュールを identity pin に載せられない(#1921)。一般化が触れる面は 6 系統。

1. **schema** — `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts`(canonical コピー `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` と byte-identical、`diff -q` 実測)。`parseModel` の `exactObject(value, ["cfg", "entries", "model", "name"])`(`:204`)が未知キーを拒否 → aux 配列追加はこの許可リストの改訂点。実行モデル固定定数 `TLA_EXECUTION_MODEL_NAME = "FormalElection"` / `TLA_MODEL_PATH` / `TLA_CFG_PATH`(`:52-54`)、`TLA_MODEL_MAP_SCHEMA_VERSION = 2`(`:56`)。identity 計算: model/cfg は domain-tagged canonical(`canonicalIdentity :33-46`、`:40` で `sha256(domain ‖ "\0" ‖ bytes)`、domain = `amadeus.formal-verif.tla.module.v1` / `.cfg.v1`)、entries(implPath, sha256)は生 sha256(completeness sensor `amadeus-sensor-model-completeness.ts:194-195` / `:468`)。aux を optional キーで追加する設計なら既存 identity 値・entries は不変
2. **loader** — `verifyRegisteredAssets`(`tla-model-loader-internal.ts:252-275`)は非実行モデルの model/cfg identity のみ照合し、`:258` `if (model.name === TLA_EXECUTION_MODEL_NAME) continue;` で実行モデルを skip。aux モジュール(MirrorLifecycleCore.tla 等)は照合対象に載らない = #1921 の hollow
3. **arm** — `TLA_NAMED_INVARIANTS`(`tla-arm.ts:322-330`)は FormalElection 固有の不変条件名 7 件(ChoiceWinner / UnknownChoiceRejected / ReceivedAtAxis / InvalidTimestampRejected / AmendSubmission / UnknownRefRejected / PerVoterResolution)。#1920 見落とし指摘どおり unpin 必須
4. **toolchain** — `tlc-toolchain.ts`: `:418` TRACE_STATE_VARIABLES(FormalElection の状態変数 7 つ)、`:434-436` ラベル正規表現 `of module FormalElection>`、`:439-440` / `:515-516` 変数数・順序チェック、`:493-494` `hasFrozenModelOutputBinding` が `FormalElection` / `FormalElection.tla` に pin
5. **CI** — `.github/workflows/ci.yml:508-564`: `# U4 formal-model-check begin` `:508`、job `formal-model-check` `:509`、`workflow_dispatch` 限定・`timeout-minutes: 30`、`run-model-check-ci.ts run` / `verify` の 2 段。直書き 3 ファイル: `node-ci-model-check-port.ts:200-202`(`--model specs/tla/FormalElection.tla --cfg specs/tla/FormalElection.cfg`)、`run-model-check-diagnostic.ts:208-209`、`run-skeleton-ci.ts:82-83`
6. **byte-pin 契約(決定的証拠)** — `run-model-check-source.ts:118-123` が model/cfg バイトを canonical U1 ソースと `sameBytes` 照合。**CLI 引数(`--model`/`--cfg`)を変えるだけでは複数モデル実行は成立しない**(別モデルを渡すと SOURCE_DRIFT)

### MirrorLifecycle の構造

- `specs/tla/MirrorLifecycle.tla`(43 行)は薄い wrapper: `:31-32` `Core == INSTANCE MirrorLifecycleCore WITH CaptureBoundaryAlwaysCreates <- FALSE`。検証本体は `MirrorLifecycleCore.tla`(648 行)
- `specs/tla/model-map.json`(schemaVersion 2)は 2 モデル登録済み: FormalElection(entries=5)、 MirrorLifecycle(entries=4、TS 実装 4 ファイル = coordinator / project-reconciliation-reducer / state-reducer / types)
- **テスト空白(決定的)**: MirrorLifecycleCore.tla を編集しても赤になるテストは存在しない。identity 照合は wrapper の MirrorLifecycle.tla + .cfg のみ、entries は TS 実装のみを指すため、Core モジュールの変更は drift 検出にも loader 照合にも届かない
- doc 非対称: `plugins/formal-model-check/stages/formal-model-check.md:35-36` は「caller は model-map.json 登録済みの別 `.tla`/`.cfg` ペアを指せる」と約束するが未実装(上記 byte-pin が根)。`:12` / `:33-36` / `:42-44` が FormalElection 記述

### 区間 touch 判定(患部 × `c49e385ac..33e196b8`)

- `scripts/formal-verif/` — 30 ファイル削除(`git diff --name-only ... | grep -c '^scripts/formal-verif/'` = 30)
- `plugins/formal-model-check/` — `54bf1f805` で tools 25 本が `A` として現配置に着地。以降 observed まで無変更(`git log --oneline 54bf1f805..33e196b8 -- plugins/formal-model-check specs/tla` 空)
- `specs/tla/` — 区間内で model-map.json / MirrorLifecycle 系が現形に(同じく `54bf1f805` 着地後無変更)
- テスト: 患部直下に `tests/formal-verif/support/`(ci-workflow-contract / run-model-check-cli-fixture / tla-mutation-probe / tla-real-toolchain-probe / tla-toolchain-harness)が現配置

## 近傍テスト(修正の足場)

- `tests/unit/t-formal-verif-tla-model-loader.test.ts:10-13` — loader の no-arg 1 エクスポート pin(`Object.keys(productionLoader)` = `["loadVerifiedTlaSource"]`、`length === 0`)。複数モデル化で loader シグネチャを変える場合の pin 改訂点(`cid:reverse-engineering:c1-pinned-behavior-ruling` に従い要件段で宣言)
- `tests/unit/t-formal-verif-model-map-v2.test.ts` — plugin/canonical 両コピー対象の table test(`:6` コメント "whole table runs against both so neither copy can drift"、`:44` schema describe、`:277` `describe.each(modules)`)
- `tests/integration/t-formal-verif-mirror-model-registration.integration.test.ts` — 実 `model-map.json` 読込み + MIRROR_IMPLEMENTATION 4 ファイルの registration 検証
- FormalElection 参照は tests 27 ファイル(`grep -rln 'FormalElection' tests/ | wc -l` = 27)— 一般化時の機械的洗い出し対象

## 引用再確認の結果(conductor が observed `33e196b8` で再実測)

| 対象 | Developer 報告 | 再実測 | 判定 |
| --- | --- | --- | --- |
| observed / base 祖先性 | `33e196b8` / `c49e385ac` 祖先 | `git rev-parse HEAD` = `7e63522f5`(record 2 コミット、コード同一)、`--is-ancestor c49e385ac HEAD` exit 0 | 一致 |
| Distance / 区間規模 | 40 | `git rev-list --count c49e385ac..33e196b8` = **40**、`git diff --shortstat` = `1396 files / +135,185 / −15,633` | **完全一致** |
| model-map 所在 / byte-identical | plugin tools + core canonical | `diff -q plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts packages/framework/core/tools/amadeus-formal-verif-model-map.ts` 差分なし | **完全一致** |
| exactObject | `:204` | `:204` `if (!exactObject(value, ["cfg", "entries", "model", "name"]))` | **完全一致** |
| 実行モデル定数 | 固定定数 | `:52` `TLA_EXECUTION_MODEL_NAME = "FormalElection"` / `:53` TLA_MODEL_PATH / `:54` TLA_CFG_PATH、`:56` SCHEMA_VERSION = 2 | **完全一致** |
| identity 計算 | model/cfg domain-tagged、entries 生 sha256 | `canonicalIdentity :33-46`(`:40` domain ‖ "\0" ‖ bytes)、entries は sensor `:194-195` / `:468` の生 sha256 | **完全一致** |
| loader verifyRegisteredAssets | `:252-275`、aux 非照合 | `tla-model-loader-internal.ts:252` 定義、`:258` で実行モデル skip、照合は model/cfg の 2 資産のみ | **完全一致** |
| TLA_NAMED_INVARIANTS | `:322-332` | `tla-arm.ts:322-330` が配列本体(`:332` は type 行) | 一致(精密化: 配列は `:322-330`) |
| toolchain pin | `:418` / `:436` / `:439-440` / `:493-494` / `:515-516` | `:418` TRACE_STATE_VARIABLES、`:434-436` ラベル正規表現(報告 `:436` は正規表現行そのもの)、`:439-440` / `:493-494` / `:515-516` | 一致(精密化) |
| CI 直書き | port `:200-202` / diagnostic `:208-209` / skeleton `:82-83` | 各行で `specs/tla/FormalElection.tla` / `.cfg` 直書きを確認 | **完全一致** |
| byte-pin | `run-model-check-source.ts:118-123` | `:118-123` `sameBytes(modelBytes, …)` / `sameBytes(cfgBytes, …)` の SOURCE_DRIFT 照合 | **完全一致** |
| stage doc | `:12` / `:34` / `:42-43` | `:12` inputs 行、約束は `:35-36`("A caller may point at another … registered in model-map.json")、`:42-44` が `--model/--cfg` 例 | 一致(精密化: 約束文は `:35-36`) |
| ci.yml | `:508-564` | `:508` U4 マーカー、`:509` job 開始、workflow_dispatch / timeout 30 / run・verify 2 段を確認 | **完全一致** |
| MirrorLifecycle wrapper | 43 行、INSTANCE `:31-32` | `wc -l` = 43、`:31` `Core == INSTANCE MirrorLifecycleCore` / `:32` `WITH CaptureBoundaryAlwaysCreates <- FALSE`。Core は 648 行 | **完全一致** |
| model-map.json | 2 モデル(entries 5 / 4) | FormalElection entries=5、MirrorLifecycle entries=4、schemaVersion 2(JSON parse で実測) | **完全一致** |
| テスト景観 | loader pin `:10-13` / v2 table / mirror integration / 27 ファイル / support probes | `t-formal-verif-tla-model-loader.test.ts:10-13`、v2 test `:6` / `:277`、integration test の MIRROR_IMPLEMENTATION、`grep -rln FormalElection tests/` = 27、`tests/formal-verif/support/` 5 本 | **完全一致** |
| scripts/formal-verif 削除 | `54bf1f805` で plugin 移設 | `scripts/formal-verif` 不在(実測)、`git show --stat 54bf1f805` で移設確認、削除 30 ファイル | **完全一致** |

**総括**: Developer 報告の所在・機序・結論は全件一致。相違は行番号の精密化 3 点(TLA_NAMED_INVARIANTS 配列本体 `:322-330` / toolchain ラベル正規表現 `:434-436` / doc 約束文 `:35-36`)のみで、修正方針に影響しない。

## 要件段へ送る裁定事項

1. **loader no-arg pin 改訂の宣言**: 複数モデル化で `loadVerifiedTlaSource` のシグネチャ(no-arg)を変える場合、`t-formal-verif-tla-model-loader.test.ts:10-13` の pin 改訂を要件で固定する
2. **aux の identity 方式**: model/cfg と同じ domain-tagged canonical にするか entries と同じ生 sha256 にするか(optional 追加なら既存値は不変 — 方式選定は要件段)
3. **byte-pin のモデル別一般化**: `run-model-check-source.ts:118-123` の canonical U1 ソース照合をモデル毎に解決する設計(単一 canonical を複数モデルへ写すか、モデル別 canonical を持つか)は要件段の判断
4. **doc 約束との整合**: stage doc `:35-36` の約束を実装に合わせて実現するか(#1920 側)、doc を現実に合わせるかの宣言

## 更新した成果物

実質更新 3 件 = `architecture.md`(単一モジュール世界観 → 複数モデル一般化の 6 露出面 + identity 設計 + wrapper/Core 構造)、`code-structure.md`(plugin 移設後配置と患部 × 区間 touch 判定)、`code-quality-assessment.md`(テスト空白 — MirrorLifecycleCore.tla 編集で赤になるテスト不在、doc `:35-36` の未実装能力約束、足場 4 点)。判断 1 行のみ 5 件 = `business-overview.md` / `api-documentation.md` / `component-inventory.md` / `technology-stack.md` / `dependencies.md`。加えて `reverse-engineering-timestamp.md` と本ファイル。

直前の現在断面 `260801-kimi-bootstrap-deadlock`(observed `861688c31`)は全成果物で履歴へ全文保存のまま降格した(`cid:reverse-engineering:c3-relabel`)。履歴節の file:line は当時の observed 時点を指すため一切変更していない(`cid:requirements-analysis:historical-section-cite-check-at-observed`)。

**(c) 旧「現在」マーカーの降格確認** — `grep -rn '、現在、' amadeus/spaces/default/codekb/amadeus/*.md` を実行し、H2 見出しに現れる残存ヒットが本 intent `260801-tla-multi-model` の **8 節のみ**(8 成果物各 `:3`)であることを機械確認した。実出力:

```
api-documentation.md:3:## formal-model-check 複数モデル化が触れる内部契約（260801-tla-multi-model、現在、observed `33e196b8`）
architecture.md:3:## formal-model-check 複数モデル化の対象機構（260801-tla-multi-model、現在、observed `33e196b8`）
business-overview.md:3:## formal-model-check 複数モデル化の業務境界（260801-tla-multi-model、現在、observed `33e196b8`）
code-quality-assessment.md:3:## formal-model-check 複数モデル化の品質所見（260801-tla-multi-model、現在、observed `33e196b8`）
code-structure.md:3:## formal-model-check 複数モデル化の患部配置（260801-tla-multi-model、現在、observed `33e196b8`）
component-inventory.md:3:## formal-model-check 複数モデル化の対象コンポーネント（260801-tla-multi-model、現在、observed `33e196b8`）
dependencies.md:3:## formal-model-check 複数モデル化の依存関係（260801-tla-multi-model、現在、observed `33e196b8`）
technology-stack.md:3:## formal-model-check 複数モデル化の技術断面（260801-tla-multi-model、現在、observed `33e196b8`）
```

(残りのヒット `reverse-engineering-timestamp.md:326` / `:361` / `:393` はいずれもこの grep パターン自体を引用する履歴節の散文であり降格対象ではない — 先例: `re-scans/260801-kimi-bootstrap-deadlock.md` の同旨注記。)`reverse-engineering-timestamp.md` は `:3` が `（現在: 260801-tla-multi-model）`、旧 `:16` が `（履歴: 260801-kimi-bootstrap-deadlock）` へ降格済み。前 intent `260801-kimi-bootstrap-deadlock` の H2 は 8 成果物すべて「、履歴、」へ降格済み(`cid:reverse-engineering:c3-relabel`)。
