# Driver Contract & Selection Policy ビジネスロジックモデル

## 目的と境界

U-01は、Construction の multi-Unit `invoke-swarm`に対して、環境変数、検出 harness、task topology、能力検査結果という値だけから決定的な selection outcome を返す純粋 policy である。時刻、乱数、process、filesystem、network、audit、checkpointへアクセスしない。同じ正規化入力には、同じ outcome、reason、diagnostic code、JSON表現を返す。

上流トレーサビリティは次のとおりである。

| 上流成果物 | U-01で使用する契約 |
|---|---|
| `unit-of-work.md` | U-01の責務、非責務、FR/NFR、完了条件 |
| `unit-of-work-story-map.md` | USR-01〜USR-09のselection sliceと順序 |
| `requirements.md` | 公開5値、`auto`表、legacy表、fallback reason、受入条件 |
| `components.md` | C-02 `DriverContract`、C-03 `DriverSelector`、C-04 `DriverAdapterRegistry` |
| `component-methods.md` | closed union、selector/error contract、registration seam |
| `services.md` | driver coordinationへの入力・出力、process前境界、CLI feedback contract |

## 処理パイプライン

```mermaid
flowchart TD
  A["SwarmEnvironment"] --> B["parseRequest"]
  B -->|"invalid / conflict"| X["SelectorError"]
  B -->|"legacy"| L["resolveLegacy"]
  B -->|"default / new env"| C["classifyTopology"]
  C --> D["buildCandidateChain"]
  D --> E["selectFromCapabilities"]
  E -->|"explicit unavailable"| X
  E -->|"native / floor"| F["buildSelectionOutcome"]
  L --> G["buildLegacyOutcome"]
  F --> H["validateSchemaAndRedaction"]
  G --> H
  H --> I["schema v1 JSON-ready value"]
```

テキスト代替: 最初に新旧環境変数の存在と値をparseする。不正・競合なら副作用前にerrorを返す。legacyなら0.1.x表で独立planを返す。新契約ならtopologyを分類し、harness別の候補列を作り、既に取得された能力結果だけでnativeまたはfloorを選ぶ。最後にversioned schemaとredaction allowlistを検証して返す。

### Step 1: 環境変数を存在ベースでparseする

1. `Object.hasOwn(env, "AMADEUS_SWARM_DRIVER")` と `Object.hasOwn(env, "AMADEUS_USE_SWARM")` に相当する存在情報を受け取る。truthy判定は使わない。
2. 両方が存在すれば、値を読んで優先順位を決めず `CONFLICTING_ENV` を返す。
3. 新変数だけが存在すれば、case-sensitiveな5値へ完全一致でparseする。空文字、floor ID、大小文字違い、未知値は `INVALID_DRIVER` とする。
4. 旧変数だけが存在すれば、値が厳密に`"1"`なら`enabled`、それ以外は空文字を含めて`other`へ分類する。生値は outcome へ保持しない。
5. どちらも存在しなければ`{ source: "default", requested: "auto" }`とする。

### Step 2: topologyを正規化・分類する

selectionへ渡す前に、各信号を`unit`と固定kind順で安定sortし、完全重複だけを除く。未知kind、空Unit、manifest外Unitは入力contract違反としてplanを作らない。分類は存在判定だけで行う。

wire/schema上のdriver IDはclosed literal unionのまま維持し、domain内部ではそのIDを包むfrozen `NativeDriverValue`だけが`supports(harness)`などのinstance methodを持つ。parse/build/全値collectionはcompanion namespace、harness対応判定は値自身へ作用するinstance methodへ分離する。

| coordination信号 | independent信号 | topology | reason |
|---|---|---|---|
| あり | なし | `coordinated` | `coordination-signal` |
| なし | あり | `independent` | `independent-signal` |
| あり | あり | `coordinated` | `coordination-precedence` |
| なし | なし | `unknown` | `no-signal` |

coordination信号は`shared-task`、`direct-message`、`mutual-coordination`、independent信号は`independent-fanout`、`iterative-convergence`である。分類結果に自然言語推測を混ぜない。

### Step 3: harnessとtopologyから候補列を作る

| Harness | topology | 候補列 |
|---|---|---|
| Claude | `coordinated` | `claude-agent-teams` → `claude-ultracode` → `claude-task-floor` |
| Claude | `independent` | `claude-ultracode` → `claude-task-floor` |
| Claude | `unknown` | `claude-ultracode` → `claude-task-floor` |
| Codex | 任意 | `codex-ultra` → `codex-exec-floor` |
| Kiro / Kiro IDE | 任意 | `kiro-subagent` → `kiro-subagent-floor` |

明示値では候補列を作らず、harness対応を検証した単一native driverだけを評価する。Claudeは2つのClaude driver、Codexは`codex-ultra`、Kiro/Kiro IDEは`kiro-subagent`だけを受理する。

### Step 4: 能力結果からselectionを解決する

- `ProbeResult.status=available`の最初のnative候補を`mode=native`として選ぶ。
- `auto`で先行候補が利用不能なら次候補へ進める。native候補が尽きたときだけ対応floorを`mode=floor`として選ぶ。
- 明示driverが`unavailable`または`error`なら`EXPLICIT_DRIVER_UNAVAILABLE`を返し、floorや別native driverを返さない。
- 評価に必要なdriverの`ProbeResult`が欠落している、`status=available`なのに`reason!=none`、または非availableなのに列挙済みreasonがない入力はcontract不成立であり、planを作らない。
- `fallbackReason`は、先行して利用不能だった候補がなければ`none`。1件以上あれば、全原因を既定優先順で安定sortし、最上位を主理由、残りの`diagnosticCode`を`capabilityDetails`へ安定順で保持する。

優先順は`cli-unavailable`、`authentication-unavailable`、`native-surface-unavailable`、`native-evidence-unavailable`、`trust-unavailable`、`capability-probe-failed`である。入力mapの反復順には依存しない。

### Step 5: legacyを独立planとして解決する

旧変数は新driverのaliasにしない。`LegacySelectionInput`は`harness`、`rawValueClass`、Claudeの既存Dynamic Workflow surface結果だけを受け取る。

| Harness | `enabled` | `other` |
|---|---|---|
| Claude | surface availableなら`claude-dynamic-workflow`。dispatch前にsurface unavailableなら`claude-task-floor`かつ`degradedFrom=claude-dynamic-workflow` | `claude-task-floor` |
| Codex | `codex-exec-floor`かつ`degradedFrom=ultracode` | `codex-exec-floor` |
| Kiro / Kiro IDE | `kiro-subagent-floor`かつ`degradedFrom=ultracode` | `kiro-subagent-floor` |

全legacy outcomeはharness別の判別unionで表現し、`mode=legacy`、`source=legacy-env`、`legacyEnabled`、`warningCode=AMADEUS_USE_SWARM_DEPRECATED`を持つ。floorを使うvariantは対応する`selectedFloor`を必須とし、degradeするvariantだけが`degradedFrom`を持つ。これによりlegacy表にないharness/execution/floor/degrade理由の組合せを型で排除する。warning表示とaudit発行はU-02の副作用であり、U-01は必要なmetadataだけを返す。Claude Dynamic Workflow開始後のfailureはfloorへ再選択しない。

## Registration contract 検証

`DriverRegistrationSet`はschema version 1のfirst-class collectionとし、生成時に次を一括検証する。

1. `claude` providerは`claude-agent-teams`と`claude-ultracode`を各1回、`codex`は`codex-ultra`を1回、`kiro`は`kiro-subagent`を1回だけ宣言する。
2. 4つの`NativeDriver`は全体でちょうど1つのregistrationに属し、余分・重複・欠落を認めない。
3. harness集合はClaude=`claude`、Codex=`codex`、Kiro=`kiro|kiro-ide`に固定する。
4. slotは`available`または`unavailable`の判別unionとし、`unavailable`はprovider IDと列挙済み診断codeだけを持つ。未知moduleの動的loadは行わない。
5. `DriverAdapter`は`probe`、`buildLaunch`、`normalize`の型境界を宣言するだけで、U-01から呼び出さない。

Kiroのbalanced wave式はU-05が所有する。U-01はregistrationとUnit順序を保持する入力contractだけを定め、provider固有のwave構築を先取りしない。

## 出力のversioningとredaction

selection outcomeは`schemaVersion: 1`と判別可能な`kind`を必須とし、JSON schemaは`additionalProperties: false`で閉じる。許可fieldはdriver/harness/topology/probeの列挙値、diagnostic code、CLI version、mode identifier、Unit slugなど非機密値だけである。

`token`、`secret`、`password`、`credential`、`authorization`、`cookie`、`prompt`、`message`、`raw`、`response`を意味するfieldはcontractに存在させない。schema検証時に未知fieldを見つけた場合は値を表示せずfield pathだけを診断し、outcomeを返さない。redaction後に消す方式ではなく、allowlist外を構築不能にする。

## エラーと副作用境界

| 条件 | 結果 | 副作用 |
|---|---|---|
| 新旧env併存 | `CONFLICTING_ENV` | 0 |
| 新env不正・空文字 | `INVALID_DRIVER` | 0 |
| 明示driverとharness不一致 | `HARNESS_DRIVER_MISMATCH` | 0 |
| 明示driver能力不足 | `EXPLICIT_DRIVER_UNAVAILABLE` | 0 |
| topology/capability/registration contract不成立 | typed contract error | 0 |
| `auto`候補利用不能 | 次候補またはfloorのloud outcome | U-01では0 |
| dispatch後failure | U-01の再選択対象外 | U-02以降でfail-closed |

## 検証への引き渡し

- table test: 未設定、5値、空文字、不正値、大小文字違い、floor ID、新旧全競合、harness不一致。
- topology fixture: coordinated、independent、both、unknown。入力順と重複を変えても同じ分類・reasonになることを確認する。
- candidate fixture: 全`auto`分岐、Claude第二候補、全floor、reason優先順、明示hard error。
- legacy fixture: 4 harness × unset/enabled/other/競合の全行とClaude surface unavailable。
- property test: `selected=auto`、未知selected、silent floor、未列挙reason、registrationの重複・欠落、secret-like fieldを生成不能またはparse errorにする。
- 決定性test: 同一正規化入力を複数回評価し、deep equalityとcanonical JSON digestが一致することを確認する。

## Review

**Iteration:** 1  
**Verdict:** NOT-READY

### Findings

1. **`NativeDriver`のinstance methodとcompanion operationの分担がTypeScript表現として成立していない。** `domain-entities.md`は`NativeDriver`を`"claude-agent-teams" | "claude-ultracode" | "codex-ultra" | "kiro-subagent"`のliteral unionとして定義する一方、`NativeDriver.supports(harness)`をinstance methodと説明している。literal stringは独自methodを持てず、`NativeDriver.supports(...)`という呼出形もreceiverを取らないcompanion/static operationである。上流`component-methods.md`のclosed literal unionを維持するなら、companion側の`NativeDriver.supports(driver, harness)`へ明確に寄せる必要がある。instance methodを採用するなら、literal値とは別のimmutable value objectを定義し、`nativeDriver.supports(harness)`として実装可能な型・factory・serialization境界を示す必要がある。現状はfunctional-domain-modeling-tsの実装指針が二通りに読める。
2. **closed contractが無効状態を型で表現できてしまう。** `DriverRequest`は`source`とoptionalな`requested` / `rawValueClass`の相関を型に持たないため、`source="default"`かつ`rawValueClass="enabled"`、`source="legacy-env"`かつ`requested="auto"`などを構築でき、上流`ParsedRequest`のdiscriminated unionを弱めている。`LegacySelection`も`harness`、`execution`、optionalな`selectedFloor` / `degradedFrom`を独立に組み合わせられるため、Kiroと`claude-dynamic-workflow`の組合せなどlegacy全表に存在しない状態が型上有効になる。default / new-env / legacy-env、およびlegacy harness別結果を判別unionで閉じるか、外部構築不能なopaque型とcompanion smart constructorの全invariantを明示し、instance methodは構築済み値への振る舞いだけに限定する必要がある。

### Validation evidence

- U-01境界: PASS。U-01はC-02/C-03/C-04のversioned contractと純粋selectionだけを所有し、U-02はproduction registry assembly・process・audit・checkpoint、U-03〜U-05は各provider slot、U-06はplaceholder 0件とmapping網羅性の検証を所有している。
- 選択表: PASS。未設定と公開5値、新旧envの存在競合、明示driverのharness不一致・能力不足hard error、Claude/Codex/Kiroの`auto`候補列、dispatch前だけのloud fallback、4 harness × unset/enabled/other/競合とClaude surface unavailableを含むlegacy全行が追跡されている。
- 決定性・schema・redaction: PASS。入力canonical化、固定reason優先順、I/O・時刻・乱数・locale依存の排除、schema v1、`additionalProperties: false`、secret-like fieldの構築前拒否、canonical JSON testが定義されている。
- 不要な互換層: PASS。要求済み0.1.x legacy以外のshim、旧名alias、custom plugin seam、明示driver fallback、dispatch後fallback、selector二重実装は追加されていない。
- Mermaid: PASS。`flowchart TD`と`classDiagram`の2図はfence、node/relationship、label構文が閉じ、いずれもテキスト代替を持つ。
- 全consumes参照: PASS。`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`を4成果物すべてが参照している。
- `amadeus-sensor-required-sections.ts`: 4成果物すべてPASS。
- `amadeus-sensor-upstream-coverage.ts --consumes unit-of-work,unit-of-work-story-map,requirements,components,component-methods,services`: 4成果物すべてPASS、未参照0件。
- `linter` / `type-check`: 4成果物はいずれもMarkdownであり、sensor manifestの`**/*.{ts,js}` / `**/*.{ts,tsx}`に一致しないため非適用。dispatcherのapplicability probeは期待どおりmatch rejectionとなり、未実行をPASSには読み替えていない。TypeScript snippetの意味レビューでは上記2件を検出した。

## Review

**Iteration:** 2  
**Verdict:** READY

### Findings

- Blocking findingなし。Iteration 1の2 findingは閉包された。wire/schemaの`NativeDriver` literal unionとdomain内部のfrozen `NativeDriverValue`は役割が分離され、`DriverRequest`と`LegacySelection`は上流契約の有効状態だけを表す判別unionになっている。

### Validation evidence

- Iteration 1 finding 1: RESOLVED。`NativeDriverValue`はcanonicalな`NativeDriver` IDを1つだけ包み、providerをIDから導出し、`toJSON()`で同じliteralへ戻す。新しいdriver ID、wire schema、selector表は追加しておらず、literal IDとvalue objectは二重の正本にならない。
- instance / companion分担: PASS。instance methodは`nativeDriverValue.supports(harness)`と`toJSON()`、companion namespaceは`parse(raw)`、`from(id)`、`values()`に限定され、factoryがclosure実装したfrozen objectを返すためTypeScriptで実装可能である。
- Iteration 1 finding 2: RESOLVED。`DriverRequest`はdefault=`requested: auto`、new-env=`requested: RequestedDriver`、legacy-env=`rawValueClass`の3 variantへ閉じ、sourceにないfieldを組み合わせない。legacyの生値も保持しない。
- Legacy全表: PASS。Claudeはenabled時のDynamic Workflow、dispatch前surface unavailable時のClaude floor degrade、other時の非degrade floorを別variantにする。CodexとKiro/Kiro IDEもenabled時だけ`degradedFrom=ultracode`を必須とし、other時はdegrade fieldを`never`にする。harness、execution、selected floor、degrade理由の不正な組合せは型で排除される。
- 単一selector・fallback境界: PASS。BR-37/BR-38は型invariantとcompile fixtureだけを追加し、要求済み0.1.x legacy以外のshim、alias、未定義fallback、明示driver fallback、dispatch後fallback、selector二重実装を導入していない。
- U-01境界、公開5値、env競合、明示hard error、`auto`候補列、決定性、schema v1、redaction、Mermaid、全consumes参照: Iteration 1のPASS状態を維持している。
- `amadeus-sensor-required-sections.ts`: 4成果物すべてPASS。
- `amadeus-sensor-upstream-coverage.ts --consumes unit-of-work,unit-of-work-story-map,requirements,components,component-methods,services`: 4成果物すべてPASS、未参照0件。
- `linter` / `type-check`: 4成果物はMarkdownでmanifestの`**/*.{ts,js}` / `**/*.{ts,tsx}`に一致しないため非適用。dispatcherのapplicability probeはmatch rejectionとなり、未実行をPASSには読み替えていない。
