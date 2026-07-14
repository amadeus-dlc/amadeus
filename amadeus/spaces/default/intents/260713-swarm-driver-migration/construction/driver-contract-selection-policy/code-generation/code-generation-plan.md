# Driver Contract & Selection Policy コード生成計画

## 対象と成功条件

本計画は U-01 `driver-contract-selection-policy` だけを実装する。対象は C-02 `DriverContract`、C-03 `DriverSelector`、C-04 の versioned registration contract、および 0.1.x legacy selection policy である。外部 CLI、filesystem、process、audit、checkpoint、production registry assembly、provider adapter、Kiro の balanced wave は U-02〜U-05 の所有物なので実装しない。

成功条件は次のとおりである。

- `AMADEUS_SWARM_DRIVER` の公開5値、内部floor 3値、4 harness、topology 3出力、probe/fallback、legacy全表を閉じたTypeScript型とschema v1で表現する。
- 同じ正規化入力から同じselection、reason、redacted canonical JSONを返す純粋policyにする。
- 明示driverの不一致・能力不足はhard errorとし、`auto`だけがdispatch前に固定候補列を進める。
- 要求済みの`AMADEUS_USE_SWARM` 0.1.x互換は独立したlegacy outcomeとして維持し、新driverのaliasにはしない。
- Comprehensive testとしてexample、property、schema、compile-time invalid-state、architecture boundaryを検証し、既存のtypecheck・lint・coverage・配布drift guardを通す。

## 予定する変更面

| 種別 | 予定ファイル | 目的 |
|---|---|---|
| 正本 | `packages/framework/core/tools/amadeus-swarm-driver-contract.ts` | closed vocabulary、immutable value、Result/error、schema v1、redacted projection、registration contract |
| 正本 | `packages/framework/core/tools/amadeus-swarm-driver-selector.ts` | env parse、topology canonicalization、candidate policy、capability selection、legacy resolution |
| Unit test | `tests/unit/t223-swarm-driver-contract.test.ts` | contract/schema/registration/redaction/invalid-state compile fixture |
| Unit test | `tests/unit/t224-swarm-driver-selector.test.ts` | 5値、明示driver、topology、`auto`、fallback、legacy全表のtable test |
| Property test | `tests/unit/t225-swarm-driver-selector.pbt.test.ts` | 順序・重複・反復決定性、canonical JSON、secret canary |
| Architecture test | `tests/unit/t226-swarm-driver-policy-boundary.test.ts` | I/O/process/filesystem/clock/random/dynamic import依存0、公開面と所有境界の固定 |
| Coverage台帳 | `tests/unit/gen-coverage-registry.test.ts`、`tests/.coverage-registry.json`、`tests/.coverage-ratchet.json` | 新規testの分類とcoverage universeを同期 |
| 生成物 | `dist/{claude,codex,kiro,kiro-ide}/` とClaude/Codex self-install対象 | 正本から機械生成し、直接編集しない |

`tsconfig.tests.json` は `tests/**/*.ts` を既にincludeし、`tests/run-tests.ts` はunit testを動的発見するため、新しいtest frameworkやconfig fileは追加しない。新規testが既存設定で型検査・検出されること自体を検証する。

## 実装手順

- [x] **Step 1: 変更前baselineと実装時インベントリを確定する。** `git diff`、既存test番号、`AMADEUS_USE_SWARM`の全参照、`invoke-swarm`のcaller、core toolsのimport規約、package manifestの投影経路を再実測する。U-01外の書き手・呼び出し元は一覧化だけ行い、変更しない。Trace: U-01 Slice 1、FR-01〜FR-04、NFR-06。

- [x] **Step 2: closed vocabularyと共通`Result`/error contractを実装する。** `Harness`、`RequestedDriver`、`NativeDriver`、`FloorDriver`、`SelectedDriver`、`ExecutionMode`、`Topology`、`TopologyReason`、`FallbackReason`、`ProbeStatus`、diagnostic codeをliteral unionで閉じる。invalid value、env競合、harness mismatch、explicit unavailable、topology/capability/registration/schema errorを生値なしの判別unionにする。Trace: USR-06、USR-09、FR-01〜FR-04、FR-19、NFR-02、NFR-04。

- [x] **Step 3: immutable domain valueとsmart constructorを実装する。** `NativeDriverValue`、`DriverRequest`、`TopologySignalCollection`、`TopologyDecision`、`ProbeResult`、`CapabilitySet`、`FallbackCauseCollection`、`DriverRegistrationSet`をfrozen valueとして実装する。instance methodは値自身の振る舞い、companion namespaceはparse/build/collection演算に限定し、無効なsource/legacy/provider組合せを構築不能にする。Trace: U-01 Slice 1〜3、BR-18〜BR-23、BR-30〜BR-38、NFR-01、NFR-06。

- [x] **Step 4: versioned selection outcomeとredacted schemaを実装する。** native/floor/Claude legacy/Codex legacy/Kiro legacyを有効な組合せだけのdiscriminated unionで表し、`schemaVersion: 1`、`additionalProperties: false`相当のclosed projector、固定key順のcanonical JSONを提供する。secret-like fieldはredaction後に消すのではなく構築・schema parse時にfield pathだけを返して拒否する。Trace: USR-01〜USR-09、FR-10、FR-16〜FR-19、NFR-01、NFR-04〜NFR-07。

- [x] **Step 5: environment projectionとrequest parseを実装する。** 既知2 keyのpresenceだけを読み、新旧併存を値に関係なく`CONFLICTING_ENV`へする。新変数はcase-sensitiveな5値だけを受理し、空文字・大小文字違い・floor ID・未知値を拒否する。旧変数は厳密な`"1"`と`other`へ即時分類し、生値を保持しない。Trace: U-01 Slice 1・5、USR-08、USR-09、FR-01〜FR-04、FR-16〜FR-17、U01-SEC-01〜06。

- [x] **Step 6: topology canonicalizationを実装する。** manifest外Unit、空slug、未知kindを拒否し、`unit + fixed kind rank`でstable sort、完全重複だけdedupe、single passで分類する。出力は`coordinated`/`independent`/`unknown`の3値、fixtureはcoordination/independent信号の有無4行とし、両方では`coordination-precedence`を返す。Trace: U-01 Slice 2〜3、USR-01〜USR-05、FR-07〜FR-09、U01-PERF-04、U01-SCALE-01〜03。

- [x] **Step 7: harness別candidate policyと明示driver選択を実装する。** Claude coordinatedはAgent Teams→Ultra Code→floor、Claude independent/unknownはUltra Code→floor、CodexはUltra→floor、Kiro/Kiro IDEはsubagent→floorの固定列を返す。明示driverはharness mismatchまたはnon-availableでhard errorとし、別native/floorへ進めない。Trace: U-01 Slice 2、USR-01〜USR-06、FR-06〜FR-10、BR-10〜BR-16。

- [x] **Step 8: capability selectionとloud fallback reasonを実装する。** candidateごとのprobeは最大1回だけ評価し、`available ↔ reason=none`とnon-available ↔ non-none reasonの相関、欠落・重複・余分なrowを検証する。`auto`だけが次候補へ進み、native候補枯渇時だけ対応floorを選ぶ。複数原因は固定優先順でprimary/detailsへ正規化し、silent floorを構築不能にする。Trace: U-01 Slice 4、USR-07、FR-05〜FR-07、FR-10、NFR-01〜NFR-02。

- [x] **Step 9: 0.1.x legacy resolverを独立実装する。** Claude enabled時のDynamic Workflow、dispatch前surface unavailable時だけのClaude floor degrade、Codex/Kiro enabled時の対応floor + `degradedFrom=ultracode`、各harnessのother時の非degrade floorを全表どおり返す。全outcomeへ`AMADEUS_USE_SWARM_DEPRECATED` metadataを持たせるが、warning出力・audit発行・実行はU-02以降へ残す。Trace: U-01 Slice 5、USR-08、FR-16〜FR-17、NFR-07、BR-24〜BR-29。

- [x] **Step 10: registration contractを実装する。** Claude 2 driver、Codex 1 driver、Kiro 1 driverをstatic closed setとして検証し、重複・欠落・余分なdescriptor・不正harness mappingを拒否する。slotは`available|unavailable`のclosed unionとし、未実装をavailableへ偽装しない。production static import assemblyやprovider moduleは作らない。Trace: BR-30〜BR-34、U-01完了条件、U-02へのcontract handoff。

- [x] **Step 11: contract/schema/compile fixtureを追加する。** `t223`で全literal parse、frozen behavior、invalid request/legacy/registration、schema roundtrip、unknown/secret-like field拒否を検証し、`@ts-expect-error`を用いて不正なsource-field・legacy harness/execution・mode/selected組合せがtypecheckで拒否されることを固定する。Trace: FR-01〜FR-04、FR-16〜FR-19、FR-22、NFR-01〜NFR-07、NFR-11。

- [x] **Step 12: selector table testを追加する。** `t224`で未設定と公開5値、不正/空/大小文字/floor ID、新旧全競合、harness mismatch、topology 4入力行、全`auto`分岐、明示hard error、fallback優先順、4 harnessのlegacy unset/enabled/other/conflictとClaude surface unavailableを網羅する。各componentでhappy pathと最低2つのerror/edge caseを持たせる。Trace: USR-01〜USR-09、FR-01〜FR-10、FR-16〜FR-17、FR-22。

- [x] **Step 13: property testとarchitecture testを追加する。** `t225`はfixed seedで入力順・重複変形、同一入力反復、canonical JSON digest、secret canary、並行pure-call independenceを検証し、通常100 run・opt-in深掘り10,000 runとする。`t226`はU-01正本がfilesystem/process/network/clock/random/dynamic importやprovider/adaptor実装を持たず、I/O 0・runtime dependency追加0であることをsource graphから検証する。Trace: U01-PERF-01〜07、U01-REL-01〜06、U01-SCALE-01〜06、U01-SEC-01〜09。

- [x] **Step 14: test設定とcoverage台帳を同期する。** 新規4 testが`tsconfig.tests.json`とunit tierに自動検出されることを確認し、必要な`covers:`/`size:` metadataを正しく付ける。`EXPECTED_NONE_TO_CLI`を実測に基づき更新し、`bun tests/gen-coverage-registry.ts`で`.coverage-registry.json`と`.coverage-ratchet.json`を再生成して`--check`を通す。新しいtest runner/configは追加しない。Trace: FR-22、NFR-11、project Testing Posture。

- [x] **Step 15: 正本から配布物を同期し、最終検証する。** `bun scripts/package.ts`と`bun run promote:self`で4 harnessの`dist`とClaude/Codex self-install対象を生成し、生成先を直接編集しない。最終変更後に関連unit tests、PBT、`bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同期実行し、`git diff --check`と追加行coverageを確認する。失敗時はbaselineと比較し、設計逸脱が必要なら実装前に停止して報告する。Trace: FR-22、FR-24、NFR-08、NFR-11〜NFR-12。

## 非実装範囲

- `amadeus-orchestrate.ts`のeligibility・directive schema変更。
- `amadeus-swarm.ts`のprepare/check/finalize、audit taxonomy、checkpoint、lease/fencing。
- `amadeus-swarm-driver.ts`公開CLI、runtime composition root、production registry assembly。
- Claude/Codex/Kiro adapter、native evidence parser/hook、CLI probe/launch。
- Kiro balanced wave分割、provider process、worktree作成、fallback実行。
- harness `SKILL.md`のconductor切替、共有docs、0.2.0削除Issue。

これらは U-02〜U-06で実装する。U-01で先取りしない。
