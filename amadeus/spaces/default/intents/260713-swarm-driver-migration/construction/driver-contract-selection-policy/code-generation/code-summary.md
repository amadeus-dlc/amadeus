# Code Generation Summary: driver-contract-selection-policy

## 実装結果

U-01 の純粋な driver contract と selection policy を正本へ追加した。`AMADEUS_SWARM_DRIVER` の公開5値、`AMADEUS_USE_SWARM` の0.1.x互換分類、4 harnessのnative/floor対応、topology分類、capability probe、固定優先順fallback、closed schema v1、static registration contractを実装した。Iteration 1 reviewを受け、全selection variantのcanonical projection、selection相関を閉じるsmart constructor/runtime/schema、driver-keyed `DriverAdapterSet`と`LaunchSpec`/closed `NormalizedDriverEvent` portを追加した。Iteration 2 reviewを受け、unordered topology signalの診断を順序非依存にし、空Unit slugをfactory/runtime/schemaで拒否し、adapter setの期待driver集合をproviderから内部導出する2引数APIへ変更した。閉語彙、Result/error、provider ownership/support、registration tupleは副作用のないfoundation leafへ集約し、adapterからselection contractへのruntime依存をなくした。provider adapter実装、audit、checkpoint、worktree、wave実行は後続Unitへ残し、本UnitからはI/Oを行わない。

## 作成・変更したファイル

- 正本
  - `packages/framework/core/tools/amadeus-swarm-driver-foundation.ts`
  - `packages/framework/core/tools/amadeus-swarm-driver-contract.ts`
  - `packages/framework/core/tools/amadeus-swarm-driver-adapter-contract.ts`
  - `packages/framework/core/tools/amadeus-swarm-driver-selector.ts`
- unit / property / architecture tests
  - `tests/unit/t223-swarm-driver-contract.test.ts`
  - `tests/unit/t224-swarm-driver-selector.test.ts`
  - `tests/unit/t225-swarm-driver-selector.pbt.test.ts`
  - `tests/unit/t226-swarm-driver-policy-boundary.test.ts`
- 正本から生成した配布物
  - `dist/claude/.claude/tools/`、`dist/codex/.codex/tools/`、`dist/kiro/.kiro/tools/`、`dist/kiro-ide/.kiro/tools/`の同名4ファイル
  - `.claude/tools/`、`.codex/tools/`の同名4ファイル
- Code Generation記録
  - `code-generation-plan.md`
  - `code-summary.md`

## 主な設計判断

- `NativeDriver`、`FloorDriver`、`Harness`、topology signal、fallback reason、diagnostic codeをclosed literal vocabularyとして定義した。
- selectorは環境変数のraw bytesを保持せず、legacy値は`enabled|other`へ即時分類する。新旧環境変数が同時に存在する場合は値に関係なくhard errorとする。
- topology signalはmanifest内の複数Unitだけを受理し、順序正規化と完全重複排除を行う。signalの有無から導出される4分類（no-signal、coordination、independent、両方時のcoordination precedence）を共有policyで表現し、factory、runtime projection validator、JSON schema v1の相関を同じ表から生成する。
- 明示driverはharness mismatchまたはunavailable時にfallbackせずhard errorとする。`auto`だけが固定candidate chainを進み、native候補枯渇時だけloud floorを選ぶ。
- 0.1.x legacy resolverは新policyから独立させ、Claude Dynamic Workflowと各harnessの既存degrade表を保持する。warning出力や実行は行わずmetadataだけを返す。
- canonical JSON projectionはvariant manifestに従ってtop-level/nested objectを固定key順へ再構築する。順序を持たないtopology signal、probe check、capability diagnosticは固定rankでsort・完全重複排除し、`fromOutcome`と`parse`を同じcanonicalizerへ通す。caller所有入力は変更せずcopyしてfreezeし、SHA-256 digestを生成する。unknown fieldとsecret-like fieldはkey挿入順に依存しないfield pathで拒否する。
- unordered topology signal内のunknown/secret-like fieldは、callerの配列順や値を使わずwildcard pathをcanonical scanして最小field pathを返す。空Unit slugは公開factoryとraw projectionの双方で拒否し、schema v1も`minLength: 1`を宣言する。
- native/floor selectionは判別unionと`Result` smart constructorで、defaultは`auto`のみ、新環境の明示driverはrequested=selected、selectedはharness対応、native probeはavailable/reason=none、floorはharness対応かつ非none fallbackという相関を閉じる。同じnative/floor variant表をruntime projection validatorとJSON schema v1のcorrelation rowへ利用する。auto-nativeの非none fallbackは、Claude coordinated topologyで先行するAgent Teamsが失敗してUltra Codeへ成功した場合だけ許容する。Agent Teams、Codex Ultra、Kiro Subagent、およびClaude independent/unknownのUltra Codeは先頭候補なのでfallbackを`none`へ固定する。
- adapter portはselection contractから独立したpure moduleへ分け、`probe`、`buildLaunch`、`normalize`だけを宣言する。`RegistrationSlot.available`はdriver-keyed `DriverAdapterSet`を持ち、Claude 2 adapter、Codex 1 adapter、Kiro 1 adapterのexact coverage、所有provider、全harnessに対する`supports`一致を検証する。`DriverRegistrationSet`は受領した構造値の`owns`/`supports`を信用せずregistrationを再構築し、available slotは`adapterSet.adapters()`の実体からexact coverageを再検証する。process起動やprovider moduleは実装しない。
- `DriverAdapterSet.build(provider, adapters)`はproviderごとのclosed driver集合をfoundationのregistration tupleから導出し、callerが期待集合を空・部分・異providerへ差し替えられない。`DriverRegistration.build`はavailable/unavailable以外のslot kindをruntimeで拒否する。
- architecture testはBun text loaderで4つの正本を文字列として読み、foundation leafへの一方向依存、duplicated vocabulary/support/registrationの不在、filesystem/process/network/clock/random/dynamic import、provider adapter実装、runtime dependency追加がないことを検査する。test-size purity allowlistは増やしていない。

## テストと検証

| 検証 | 結果 |
|---|---|
| 関連4 test (`t223`〜`t226`) | 89 tests、0 fail、1,566 expects |
| 固定seed PBT | 通常100 run、`AMADEUS_PBT_DEEP=1`時10,000 runの設定を確認 |
| `bun run typecheck` | PASS |
| 対象Biome lint | PASS、診断0 |
| `bun tests/complexity-gate.ts --check` | PASS、new violation 0、regression 0 |
| test-size drift / purity gate | PASS、allowlist追加0 |
| coverage registry再生成と`--check` | PASS、ratchet維持 |
| `bun run dist:check` | 4 harnessすべてPASS |
| `bun run promote:self:check` | Claude/CodexともPASS |
| `bun run test:ci` | 341 files、4,692 assertions、0 fail、wall-clock drift 0 |
| `git diff --check` | PASS |
| 関連coverage | 関連4 testの直接計測でfoundation / contract / adapter / selectorすべてfunction・line 100% |
| project coverage gate | 62.3331%、baseline 40.9395%、+21.3937ppでPASS |

全体lintは終了コード0で、対象ファイルにblocking診断はなかった。`DriverAdapterSet.build`のCCNは13で、complexity gateはnew violation 0、regression 0だった。既存ファイルにはbaseline済みのcomplexity warningが残る。AWS credentialが無効な環境のためlive SDK/substrate testsはrunner仕様どおりskipされた。

## 計画との差分

- 実装範囲、公開語彙、test配置、生成先に差分はない。
- Iteration 1 reviewで不足が判明したadapter portをU-01の責務どおり補完し、`amadeus-swarm-driver-adapter-contract.ts`へ分割した。互換shim、plugin seam、dynamic discoveryは追加していない。
- Iteration 2 reviewで判明した正本の二重化を解消するため、計画時の3 moduleへ副作用のないfoundation leafを1つ追加した。公開selection contractはfoundationとadapter contractを再exportするが、adapterはfoundationだけへruntime依存する。
- review反例を先にtestへ追加し、canonical key/collection/path、factory/runtime/schema相関、Claude 2 adapter exact coverageがREDになることを確認してから実装した。追加の境界反例として、auto-native fallbackとtopology分類の不整合、偽registration/adapter setもREDからGREENへ進めた。
- `EXPECTED_NONE_TO_CLI`は新規testがsubprocessを起動しないため、実測上の変更がなく更新不要だった。
- coverage台帳は再生成・検証したが、enumeration対象の変更がないため生成ファイルのbyte差分は発生しなかった。

## 後続Unitへの引き継ぎ

- U-02以降は本Unitのclosed contractとselector outcomeを利用し、provider capability probe、4 driverのstatic adapter assembly、warning/audit、checkpoint、実行surfaceを実装する。Claudeは1つのmodule/class familyから`claude-agent-teams`と`claude-ultracode`の2つのimmutable adapter viewを登録する。
- explicit requestのhard error、`auto`だけのfallback、legacy resolverの独立性、projectionのredaction境界を崩さない。

## Review

**Iteration:** 1
**Verdict:** NOT-READY

### Blocking findings

1. **canonical projectionが入力objectのkey挿入順へ依存し、同一意味の値から異なるdigestを生成する。** `SelectionOutcomeProjection.parse`は検証済み入力を`copyJson`で元のkey順のまま複製し、`JSON.stringify`した結果をcanonical JSONとしている。実測では、同一のnative selectionについて全objectのkeyを逆順にした入力もparse成功する一方、digestが`fdc8d50d05e6fc70349b50c1687b08c718903988de54d2f270eb47dc87e27672`から`c9b39097fb5a3a0860e2ccc65e17d298e1a25b6edc34db1c829857429a9aa724`へ変化した。これは`RedactedSelection.canonicalJSON()`の固定key順、`OutcomeProjector`のcanonical projection/sort、同一domain valueから同一bytes/digestという設計契約に違反し、U-02の監査相関を不安定にする。variant別field manifestでtop-levelとnested objectを既定順へ再構築し、順序を持たない診断collectionも設計上のcanonical順へ正規化してから、`fromOutcome`と`parse`を同じcanonicalizerへ通す必要がある。少なくとも全variantでkey順を入れ替えた同値入力、signal/check/detail順の同値変換、複数unknown/secret-like fieldの診断決定性をtestすること。
2. **U-01が所有するadapter portが未完成で、closed registrationがClaudeの2 driverを誤ったadapterへ解決できる。** 上流`unit-of-work.md`はU-01がversioned `DriverAdapter`と`LaunchSpec`を所有し、functional designのRegistration contract 5は`probe`、`buildLaunch`、`normalize`の型境界を宣言すると定める。実装の`DriverAdapter`は`driver`、`supports`、`probe`だけで、`LaunchSpec`、`buildLaunch`、normalized evidence/eventの型と`normalize`が存在しない。さらに`RegistrationSlot.available`がadapterを1つだけ持ち、validatorはadapter.driverがproviderのdriver配列に含まれることしか確認しないため、`claude-agent-teams` adapterだけを持つregistrationを有効として構築でき、`forDriver("claude-ultracode")`もそのadapterを返す。このままではU-02がversioned seamを消費できず、U-03の1 Claude adapter / 2 modeを型安全に実装できない。provider adapterがdriverを引数として両modeを網羅するか、driver-keyed adapter集合にするかを一意に定め、4 native driverのexact coverageと3 method contractをvalidator・compile fixtureで閉じること。process起動やprovider実装をU-01へ先取りしてはならない。
3. **selection factory、runtime validator、JSON schemaがfield単体のclosed vocabularyしか検証せず、相関する無効状態を成功化する。** `NativeSelectionInput`は`source`、`requested`、`selected`、`harness`、`fallbackReason`、`probe`を独立unionとして受け、`SelectionOutcome.native`はsmart constructor検証を行わない。実測では`source=default`、`requested=codex-ultra`、`selected=kiro-subagent`、`harness=codex`という無効値をfactoryが生成し、`SelectionOutcomeProjection.parse`も成功した。同様にselectedとharnessの不一致、明示requestedとselectedの不一致、native selectionへのunavailable probe、floorとharnessの不一致を型・validator・schemaが閉じていない。これはBR-17、BR-23、BR-37、smart constructor invariant、harness/driver spoof containmentに違反する。default/new-env/auto/explicitとharness別selectedを判別unionまたはopaque factoryへ閉じ、probe status/reason、fallback、execution modeとの相関をruntime validatorとschema v1の同じvariant表から導出すること。compile-time fixtureだけでなく、raw projectionと公開factoryを通すnegative testを追加する必要がある。

### Architecture assessment

- 明示driverのharness mismatch / unavailable hard error、`auto`だけの固定候補fallback、legacy planの独立性、I/O・時刻・乱数・dynamic import・plugin discovery・provider実装の不在は設計どおりである。U-02以降のprocess、audit、checkpoint、worktree、wave処理のscope creepもない。
- `amadeus-swarm-driver-contract.ts`の1,476行という行数自体はblocking根拠ではない。深さは行数比ではなくcaller leverageで評価する。ただし81件のexport宣言がvocabulary、domain factory、projection/schema、registration portを同じ外部seamへ露出し、testも内部collection factoryを直接利用しているため、現状のinterfaceは広くlocalityが弱い。上記修正時は、公開selector / projection / adapter contractを安定させたままprojection/schemaとregistration validationを内部moduleへ分ける余地がある。新しいcompat shim、plugin seam、dynamic discoveryは追加しない。

### Validation evidence

- `bun test tests/unit/t223-swarm-driver-contract.test.ts tests/unit/t224-swarm-driver-selector.test.ts tests/unit/t225-swarm-driver-selector.pbt.test.ts tests/unit/t226-swarm-driver-policy-boundary.test.ts`: 72 pass、0 fail、1,401 expects。
- `bun run typecheck`: PASS。
- 対象6ファイルのBiome check: PASS、診断0。全体lintは終了コード0で、既存baseline warningのみ。
- `bun run dist:check`: Claude / Codex / Kiro / Kiro IDEの4 harnessすべてPASS。
- `bun run promote:self:check`: Claude / CodexともPASS。
- 正本、`.claude`、`.codex`、4つの`dist`生成先はcontract / selectorそれぞれSHA-256が一致した。
- 既存testのgreenは上記3 findingを否定しない。canonical testは生成済みcanonical JSONの同順round-tripだけ、registration testは全slot unavailableだけ、compile fixtureはfield単体のliteral違反だけを扱い、反例3系統を未検証である。

## Review

**Iteration:** 2
**Verdict:** NOT-READY

### Blocking findings

1. **untrusted topology projectionが、unordered signalの診断決定性と空slug invariantをまだ閉じていない。** 全11 selection variantの固定key順、成功値のsignal/check/detail sort・dedupe、top-level objectのunknown/secret field pathは修正された。しかしvalidatorはcanonical sort前のcaller配列をindex順に走査する。意味上同じ2 signalを逆順にした入力で、片方は`$.topology.signals[0].zExtension`、もう片方は`$.topology.signals[0].aExtension`となり、同じunordered collectionから異なる診断を返した。また`unit=""`、`kind="shared-task"`、`topology="coordinated"`、`reason="coordination-signal"`のprojectionは`SelectionOutcomeProjection.parse`に成功し、同じ構造topologyを公開factoryへ渡しても成功した。これは固定順の成功値だけでなくerrorも決定的に返す契約、`TopologySignalCollection.build`の空slug拒否、untrusted topologyをclosed domainへ入れるsecurity seamに違反する。signalを安全なcanonical identityで並べてから全validation errorを決定順で選び、unitをnon-emptyにするruntime/schema invariantを共有し、signal順を入れ替えたunknown/secret/invalid値と空slugをfactory・parse・schema testへ追加する必要がある。
2. **driver-keyed registrationの公開builderがproviderのclosed集合を導出せず、slotの判別unionも直接構築時に迂回できる。** `DriverAdapter`の`probe` / `buildLaunch` / `normalize`、`LaunchSpec`、closed `NormalizedDriverEvent`、`DriverRegistrationSet`によるstructural fake再構築は追加された。一方、`DriverAdapterSet.build(provider, expectedDrivers, adapters)`はcaller指定の`expectedDrivers`を正本として扱うため、`build("claude", [], [])`も、Claude providerへ`["codex-ultra"]`とCodex adapterを渡す場合も成功した。さらに`DriverRegistration.build`はavailable以外のbranchで`kind === "unavailable"`を確認せず、`{ kind: "bogus", diagnosticCode: "REGISTRATION_SLOT_UNIMPLEMENTED" }`を成功値として保持した。後段の`DriverRegistrationSet`が一部を再拒否しても、公開companionがclosed valueを返すというinterface自体が破られている。adapter setはproviderだけから期待driver集合を導出し、4 driverのexact coverageをcaller設定不能にすること。registrationは両slot kindを完全一致で検証し、公開builder単体と集合builderの両seamにstructural negative fixtureを置くこと。
3. **module分割がclosed vocabularyとerror constructionの正本を二重化している。** selection contractは末尾でadapter contractをruntime re-exportし、adapter contractはselection contractをtype importする。この依存形を成立させるため、adapter側に`HARNESS_VALUES`、`NATIVE_DRIVER_VALUES`、driver/harness対応、provider registration表、`Result.ok`相当、`INVALID_REGISTRATION`構築を再定義している。実行時の循環importは生じていないが、driver値とregistration mappingを共通の正本から参照するNFR-06に反し、一方だけの追加・並べ替えでselector/schemaとregistry validatorがdriftする。語彙・provider mapping・共通error factoryを依存のないleaf moduleへ置いて両moduleからimportするか、adapterを一方向にselection contractへruntime依存させて逆向きre-exportを除く必要がある。compat barrel、plugin seam、dynamic discoveryで隠さず、duplicate literal 0件をarchitecture testで固定すること。

### Resolved findings and architecture assessment

- Iteration 1 finding 1の成功projection部分はRESOLVED。全11 variantのtop-level / nested fixed-key再構築と、topology signal、probe check、capability detailのsort・dedupeは同値canonical JSON / digestを返す。
- Iteration 1 finding 2のport欠落はRESOLVED。adapterは3 method、`LaunchSpec`、closed normalized event unionを宣言し、Claudeの2 driverを別adapter viewとして登録できる。上記finding 2はその公開builderのclosed性に残る問題である。
- Iteration 1 finding 3はRESOLVED。factory/runtime/schemaは同じ17-row auto/native policyと4-row floor targetを使い、source、requested、selected、harness、topology、probe、execution、fallbackを相関させる。実測で`Codex auto native + cli-unavailable fallback`、`unknown topology + coordination-signal + signals=[]`、`Claude registrationのharnessをcodexへ偽装`はすべてerrorとなった。
- explicit hard error、`auto`だけのloud fallback、legacy独立planは維持されている。U-02以降のprocess、audit、checkpoint、worktree、provider実装、wave policyのscope creep、およびI/O、時刻、乱数、dynamic import、plugin/shimはない。
- adapter contract分離はprojection/schemaとregistrationのlocalityを改善したが、3正本合計105 export宣言のinterfaceは依然広い。行数やexport数だけはblocking根拠にしないものの、上記finding 3の正本統合時にcallerが必要とするselection / projection / adapter seamだけを明示exportし、内部validatorを外部interfaceへ増やさないこと。

### Validation evidence

- `bun test tests/unit/t223-swarm-driver-contract.test.ts tests/unit/t224-swarm-driver-selector.test.ts tests/unit/t225-swarm-driver-selector.pbt.test.ts tests/unit/t226-swarm-driver-policy-boundary.test.ts`: 85 pass、0 fail、1,544 expects。
- `bun run typecheck`: PASS。
- 対象7ファイルのBiome check: PASS、診断0。
- `bun run dist:check`: Claude / Codex / Kiro / Kiro IDEの4 harnessすべてPASS。
- `bun run promote:self:check`: Claude / CodexともPASS。
- contract / adapter-contract / selectorは、正本、`.claude`、`.codex`、4つの`dist`生成先でファイルごとのSHA-256が一致した。
- `git diff --check`: PASS。
- 既存85 testはtop-levelの診断key順、validated registrationを集合へ渡す経路、caller指定の期待driver集合を検証するが、unordered nested diagnosticの順序、空Unit slug、公開adapter setへの空・異provider期待集合、公開registrationへの未知slot kind、duplicated vocabularyを検証していない。このためgreen suiteは上記3 findingを否定しない。

## Post-gate Resolution

- Iteration 2 finding 1: RESOLVED。unordered topology signalのunknown/secret-like fieldは、配列indexではなく`$.topology.signals[*].<field>`をcanonical scanして返す。signal逆順の同値入力で同一errorとなり、secret値をechoしない。空Unit slugは公開factoryとraw projectionでerrorとなり、schema v1は`minLength: 1`を持つ。4分類と成功projectionのcanonicalizationは維持した。
- Iteration 2 finding 2: RESOLVED。`DriverAdapterSet.build`からcaller指定の`expectedDrivers`を削除し、providerのclosed exact setをfoundationから導出する。空・部分・cross-provider adapter setと、正しいdiagnosticを持つbogus slot kindを公開builder単体で拒否する。structural fakeの再構築検証は維持した。
- Iteration 2 finding 3: RESOLVED。`amadeus-swarm-driver-foundation.ts`へ閉語彙、Result/SelectorError、Probe型、provider ownership/support、registration tupleを集約した。selection contractとadapter contractは同じleafを参照し、adapterからselection contractへのruntime importはない。compat shim、plugin seam、dynamic discoveryは追加していない。
- 検証: 関連4 testは89 pass / 0 fail / 1,566 expects、typecheck、Biome、complexity、test-size drift、coverage registry、dist/promote drift、全CI 341 files / 4,692 assertions / 0 failが通過した。
