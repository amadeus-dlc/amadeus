# Business Logic Model — boundary-three-face(U2 / #2929)

上流入力: `inception/units-generation/unit-of-work.md`(U2 節)/ `unit-of-work-story-map.md`(#2929 クローズ条件)/ `inception/requirements-analysis/requirements.md`(FR-BND-1〜6、OQ-2/OQ-3)/ `inception/application-design/components.md`(C3)/ `component-methods.md`(C3 変更面)/ `services.md`(model-map 消費群の契約)。file:line は現行 observed 断面(2026-08-20 本ステージ実読)。

## 3面同時是正の決定的手順(順序が意味を持つ)

1. **境界一般化(validator 面、FR-BND-1 + OQ-3 確定)**: `amadeus-formal-verif-model-map.ts:248-251` の `IMPLEMENTATION_PATHS` を `readonly [string, RegExp][]`(prefix startsWith + basename 照合)から**フルパス RegExp のリスト** `readonly RegExp[]` へ形状変更する:
   - `/^packages\/framework\/core\/tools\/amadeus-[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/`(既存 core タプルの等価変換)
   - `/^plugins\/[a-z0-9]+(?:-[a-z0-9]+)*\/tools\/[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/`(FR-BND-1 の一般形 `plugins/<kebab>/tools/<kebab>.ts`)
   `isCanonicalImplementationPath`(`:330-336`)の前段検査(非文字列・`\\`・絶対パス・非正規形・`..` の拒否)は不変のまま、照合部だけを `IMPLEMENTATION_PATHS.some((re) => re.test(value))` へ置換。**両者を export する**(AD Q2=A、export 名は既存名を維持: `IMPLEMENTATION_PATHS` / `isCanonicalImplementationPath` — component-methods.md の「export 名は FD で確定」への回答)。
2. **loader 1定義化(FR-BND-2/6)**: `tla-model-loader-internal.ts:291` の `implementationRoot`(`packages/framework/core/tools` ハードコード)を撤去し、`verifyImplementationEntries` の containment 判定を「`rel = relative(<containment 基点>, realPath)` を POSIX 区切りへ正規化 → 共有 `isCanonicalImplementationPath(rel)` を適用」へ置換する。**containment 基点は repo ルートの実パス**であり(旧 `implementationRoot` のサブディレクトリ起点ではない — サブディレクトリ起点のままだと plugin パスの rel が `../` 化して共有述語が拒否し FR-BND-2 が無音で無効化される)、既に引数で受けている `repositoryRoot` を spec-dir 検査(`:242` の `realpathIfExists`)と同じ形で実パス化して用いる: `rel = relative(realpathIfExists(repositoryRoot, fs), realPath)`(symlink checkout でも realPath との突合が成立する)。symlink 拒否・regular file 検査・sha256 照合(`:299-315`)は不変(これらは境界述語ではなく完全性検査)。rel が `..` を含む/絶対になる escape は共有述語が構造的に false を返すため fail-closed が保存される。汎用パス比較の `isContained`(`:141`)は spec-dir 検査(`:202`)で引き続き使用し削除しない。`run-model-check-artifacts.ts:129` の同名 `isContained` は用途が異なるため非接触(FR-BND-6)。
3. **glob drift テスト新設(FR-BND-3 — glob 更新より先に書く)**: model-map.json の全 entries `implPath` について、manifest frontmatter から parse した `matches` 値に対し**本番 matcher `matchesGlob` を import して**照合し、非被覆 entry があれば赤にする。spec-dir 分岐(`amadeus/spaces/*/specs/tla/**`)の存在も1本 assert。オラクルに glob 意味論を再実装しない(PBT オラクル相殺の回避 — matcher 自体の欠陥は本テストの検出対象外であり、被覆の drift だけを検出する)。**このテストを手順4の glob 更新より先に作成・実行し、現行 glob に対する赤(自然な赤 — 「落ちる実証」節)を実測してから手順4へ進む**(TDD の Red 先行)。
4. **sensor glob 更新(FR-BND-3)**: `sensors/amadeus-model-completeness.md:8` の `matches` を entries 全被覆形へ更新:
   `**/{amadeus/spaces/*/specs/tla/**,packages/framework/core/tools/amadeus-election*.ts,packages/framework/core/tools/amadeus-mirror-*.ts,packages/framework/core/tools/amadeus-orchestrate.ts,packages/framework/core/tools/amadeus-state.ts,plugins/github-pr-convergence/tools/*.ts}`
   制約: `matchesGlob`(`packages/framework/core/tools/amadeus-sensor.ts:1121`)は **brace 展開を1グループのみ**サポートする自製 matcher — glob は単一 `{...}` 形を維持する(ネスト・複数グループ禁止)。`plugins/github-pr-convergence/tools/*.ts` は governed 4 ファイルの上位集合だが、over-coverage は advisory sensor の余剰発火(cheap・pass)にしかならず安全側。under-coverage のみが欠陥クラス。この更新で手順3のテストが緑になる(Red → Green)。
5. **entries 追加登録(FR-BND-4 + OQ-2 確定)**: `amadeus/spaces/default/specs/tla/model-map.json` の PrConvergenceGate / BoltPrAttestationGate 両 entries へ次の4ファイルを追加する(計8 entry、根拠は次節):
   - `plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts`
   - `plugins/github-pr-convergence/tools/pr-convergence-attestation.ts`
   - `plugins/github-pr-convergence/tools/pr-convergence-cli.ts`
   - `plugins/github-pr-convergence/tools/pr-convergence-predicate.ts`
   追加は **implPath 昇順 sort・unique の validator 不変条件**(`parseEntries` `:348-360`)を満たす位置へ挿入し(`packages/...` < `plugins/...` の辞書順で既存の後ろ)、sha256 は実ファイルから計算して記入する。`updateModelMap --impl-only` は**既存 entries の hash 更新専用**(`amadeus-sensor-model-completeness.ts:882-901` — `previous` を走査するのみで新 entry を追加しない)ため、新規追加は model-map.json の直接編集で行い、追加後に completeness check(sensor 実行 exit 0)で検証する。
6. **検証順序**: 1→2 が着地するまで validator/loader は plugin entry を拒否するため、5 の entries 追加は同一 PR 内で 1・2 の後に置く(1コミットの原子的変更でよい — 中間状態を main に置かない)。着地後、SOURCE_DRIFT 検知の実測: 追加 entry の sha256 を 1 byte 変えた map で loader が `implementation entry hash differs` を返すことをテストで確認(FR-BND-4 の「SOURCE_DRIFT 検知が機能することを実測」)。

## OQ-2 の確定 — governed entry 対象ファイル(trace 根拠)

260811-pr-convergence-gate / 260813-bolt-pr-attestation の両 `construction/tla-authoring/trace-rows.json` を実読した。両モデルの trace subjects は FR-2(report lifecycle)/ FR-3(CLI attestation)/ FR-4(sensor blocking gate)を共有する(260811: FR-2〜5、260813: FR-2/3/4/5 + FR-BPA/NFR-BPA 群)。subject → plugin 実装の写像:

| trace subject | 不変量(例) | plugin 実装ファイル | 実測根拠 |
|---|---|---|---|
| FR-2 lifecycle | TypeOK / EvidenceCurrentHead | `pr-convergence-cli.ts`(`transitionAllowed` `:735-744`、landed epoch `:1127`)+ `pr-convergence-predicate.ts`(verdict 型 `:262`、landed `:284`) | 遷移表・verdict 語彙の実装点 |
| FR-3 attestation | EvidenceCurrentHead / ReceiptBoundCurrentReport / ReceiptIdempotent | `pr-convergence-attestation.ts`(`attestationId` `:70`、content digest `:93`) | 束縛・digest の実装点 |
| FR-4 sensor gate | SensorRequiresAttestation / SensorRequiresCompleteBolt | `amadeus-sensor-pr-convergence-report-format.ts`(冒頭コメント逐語 `blocking evidence check for the convergence report (FR-4)`) | blocking 検査の実装点 |
| FR-5 completion | WorkflowGuarded / CodeGenerationGuarded | engine(`amadeus-orchestrate.ts` / `amadeus-state.ts`)— **既登録** | 既存 entries で被覆済み |

両モデルとも FR-2/3/4 の全面を trace するため、**4ファイルを両モデルへ登録する**(片側のみの登録は、他方のモデルが写像する面の drift を無音にする)。エンジン2ファイルの既存 entries は不変。

## OQ-3 の確定 — 旧 formal-model-check タプルは統合(削除)

一般形 `/^plugins\/[a-z0-9-]+\/tools\/[a-z0-9-]+\.ts$/`(正確な形は手順1)は既存タプル `["plugins/formal-model-check/tools/", /^[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/]` の受理集合を包含する(prefix `formal-model-check` は kebab セグメントの一実例、basename 規則は同一)。包含が成立する以上、旧タプルの併存は二重定義(P5 違反・cg2-agreeing-predicate-drift の同族)にしかならないため**削除して置き換える**。受理集合の変化は「拡大のみ」(縮小ゼロ)で、既存 model-map(13 entries、全て `packages/framework/core/tools/`)の受理に影響しない。

## 落ちる実証(FR-BND-5 — 両境界 + glob)

- **validator 境界**: `tests/unit/t-formal-verif-canonical-core.test.ts:96` の境界拒否テスト(`scripts/amadeus-election.ts` 拒否)は不変のまま維持し、**受理側**を追加 — `plugins/github-pr-convergence/tools/pr-convergence-cli.ts` の受理、`plugins/<kebab>/lib/<name>.ts`・非 kebab セグメントの拒否。TDD: 受理テストは形状変更前に赤(現行境界は formal-model-check のみ受理)。
- **loader 境界**: 既存の loader テスト群(t403 / t-formal-verif-tla-model-loader)は auxiliary drift 面のみで **implementation-entry 境界のテストは 0 件**(RE census どおり — t403 実読で SOURCE_DRIFT テストは全て aux/cfg 面と確認)。新設: plugin entry を持つ map + fake fs で (a) 修正前挙動 = `implementation entry is not a regular in-boundary file` の赤を baseline 採取(自然な赤 — 注入不要)、(b) 修正後 = 正 sha256 で受理、(c) 境界外 realPath は引き続き drift 拒否(fail-closed 保存)、(d) sha256 不一致は `hash differs` 拒否(SOURCE_DRIFT 実測)。配置は `tests/integration/t-formal-verif-tla-model-loader.integration.test.ts` へ名指しで追加する(`loadVerifiedTlaSourcesInternal` と `TlaFileSystem` seam を既に import 済みの loader テスト正本 — 同族候補からの選択理由: fake fs seam・identity fixture が既在で coverage 母集団の新規膨張なし)。
- **glob drift テスト**: 現行 glob は `amadeus-orchestrate.ts` / `amadeus-state.ts`(PR系2モデルの既存4 entries)を被覆しない — 手順3でテストを先に書き、**現行断面でそのまま赤**(自然な赤)を実測。手順4の glob 更新で緑。これが FR-BND-3 の「非整合時に赤」の実証を兼ねる。

## 生成台帳・CI 整合(FR-X-1)

新規テストを含むため `bun tests/gen-coverage-registry.ts` regen を同一変更に同梱。model-map.json の変更は entries 追加のみ(model/cfg identity 不変)で、既存13 entries の hash pin は本 unit の write scope が engine ファイルに触れないため resync 不要。`tests/formal-verif/support/tla-toolchain-harness.ts:54` 等の実 map 消費テストは、境界一般化と entries 追加が同一 PR で原子的に着地するため parse 互換が保たれる。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-20T13:35:47Z
- **Iteration:** 1
- **Scope decision:** none

FD は上流 FR-BND-1..6/OQ-2/OQ-3 を正確な引用で被覆し互換シム混入なしだが、glob drift テストの落ちる実証が手順番号(glob 更新が先)と自己矛盾しており TDD/falling-proof 規律違反。loader 修正の rootReal 導出とテスト着地ファイルの名指しも要明確化。

### Findings

- BLOCKER | business-logic-model.md の手順3(glob 更新)と手順4(drift テスト新設)の順序が落ちる実証の要求(現行断面で赤 → 更新で緑)と自己矛盾 — テスト先行へ再番号するか、手順4のテスト作成+赤実測が手順3より先に行われる旨を明記する
- FOLLOW-UP | loader 1定義化の rel 導出で rootReal が未定義 — 旧 implementationRoot 起点のままだと plugin パスが ../ 化して共有述語が拒否し FR-BND-2 を無音で無効化する。repo ルート実パス起点であることを FD に明記する
- FOLLOW-UP | loader 境界テストの着地ファイルが同族候補の中で未確定(既存 loader テストファイルへの追加とだけ記載)— 具体パスを1つ名指しする
- NIT | entries の昇順・unique 不変条件が per-model か global か不明記 — per-model である旨を1行明確化

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-20T13:39:36Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の全4指摘の解消を検証: BLOCKER(手順順序の自己矛盾)は drift テスト先行の再番号+相互参照の整合で解消、rootReal は repo ルート実パス基点の明示、loader テスト着地は t-formal-verif-tla-model-loader.integration.test.ts に名指し、BR-4 は per-model 明記。3成果物間および上流(FR-BND-1..6/OQ-2/OQ-3/C3/U2)との新規不整合なし — 追加の設計質問なしで実装可能。

### Findings

- None
