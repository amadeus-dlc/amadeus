# Driver Contract & Selection Policy ビジネスルール

## 上流トレーサビリティ

本ルールは`unit-of-work.md`のU-01境界、`unit-of-work-story-map.md`のUSR-01〜USR-09、`requirements.md`のFR-01〜FR-04・FR-07〜FR-10・FR-16〜FR-17・FR-22、`components.md`のC-02〜C-04、`component-methods.md`のclosed unionとerror contract、`services.md`のprocess前selection境界を具体化する。

## 入力と適用境界

| ID | ルール | 違反時 |
|---|---|---|
| BR-01 | U-01 policyはConstructionのmulti-Unit `invoke-swarm`から構築された入力だけを扱う。通常stage subagent、single-Unit、対話conductorへ適用しない | caller contract error。planを作らない |
| BR-02 | `AMADEUS_SWARM_DRIVER`と`AMADEUS_USE_SWARM`は値でなく存在を判定し、両方が存在すれば必ず競合とする | `CONFLICTING_ENV` |
| BR-03 | 新変数は`auto`、`claude-agent-teams`、`claude-ultracode`、`codex-ultra`、`kiro-subagent`の完全一致だけを受理する | `INVALID_DRIVER` |
| BR-04 | 新変数の空文字、大小文字違い、floor ID、未知値は暗黙補正しない | `INVALID_DRIVER` |
| BR-05 | 旧変数は厳密に`"1"`だけをenabledとし、それ以外の設定値は0.1.x互換のotherとする | legacy planへ分類 |
| BR-06 | 生の環境変数値はerror、selection outcome、schema、audit引き渡し値へ保持しない | contract構築失敗 |

## Topologyとdriver選択

| ID | ルール | 要求 |
|---|---|---|
| BR-07 | coordination信号だけなら`coordinated`、independent信号だけなら`independent`、両方なら`coordinated`、信号なしなら`unknown`とする | FR-07、FR-08 |
| BR-08 | 両信号時のreasonは`coordination-precedence`、信号なしは`no-signal`とし、自然言語推測を加えない | FR-08、NFR-01 |
| BR-09 | topology診断用の信号は固定kind順とUnit順でcanonical化し、入力collectionの反復順へ依存しない | FR-07、NFR-01 |
| BR-10 | Claude coordinatedの候補順はAgent Teams、Ultra Code、Claude floorとする | FR-07〜FR-10 |
| BR-11 | Claude independent/unknownの候補順はUltra Code、Claude floorとし、unknownをAgent Teamsへ推測しない | FR-09 |
| BR-12 | Codexの候補順はCodex Ultra、Codex floor、Kiro/Kiro IDEはKiro subagent、Kiro floorとする | FR-07、FR-10 |
| BR-13 | 明示driverは検出harnessと一致し、能力結果がavailableの場合だけnative selectionを返す | FR-02、FR-06 |
| BR-14 | 明示driverの不一致または能力不足から、別native driver、floor、通常subagentへfallbackしない | FR-06、NFR-02 |
| BR-15 | `auto`だけがdispatch前の能力不足から固定候補列の次要素へ進める | FR-10 |
| BR-16 | provider process開始後のfailure、native evidence欠落、Unit failureはselection policyへ戻さない | FR-06、FR-10 |
| BR-17 | `selected`は4 native driverまたは3 floor IDのいずれかであり、`auto`を結果へ格納しない | FR-10 |

## Capabilityとfallback

| ID | ルール | 違反時 |
|---|---|---|
| BR-18 | `status=available`は`reason=none`を必須とする | capability contract error |
| BR-19 | `status=unavailable|error`は列挙済みの非`none` reasonを必須とする | capability contract error |
| BR-20 | 評価対象candidateの能力結果が欠落している場合、利用可能・利用不能を推測しない | capability contract error |
| BR-21 | 複数原因の主`fallbackReason`は`cli`、`authentication`、`native-surface`、`native-evidence`、`trust`、`capability-probe-failed`の順で選ぶ | planを返さず是正 |
| BR-22 | 主理由以外の診断は列挙済みcodeだけをcanonical順で保持し、生stderrやcommandを含めない | schema validation error |
| BR-23 | floor selectionは`executionMode=floor`、native selectionは`executionMode=native`とし、silent fallbackを禁止する | contract validation error |

## Legacy互換

| ID | ルール | 要求 |
|---|---|---|
| BR-24 | 旧変数だけが存在する場合は新driver selectionへ読み替えず、`executionMode=legacy`の独立planを返す | FR-16 |
| BR-25 | Claude enabledは既存Dynamic Workflowを維持し、surface unavailable時だけdispatch前にClaude floorへloud-degradeする | FR-16、NFR-07 |
| BR-26 | Codex enabledはCodex floor、Kiro/Kiro IDE enabledはKiro floorを使い、`degradedFrom=ultracode`を保持する | FR-16、FR-17 |
| BR-27 | 各harnessのotherは対応floorを使い、degrade扱いにしない | FR-16 |
| BR-28 | legacy planは解決試行ごとに`AMADEUS_USE_SWARM_DEPRECATED` metadataを持つ | FR-17 |
| BR-29 | legacy execution開始後のfailureを別legacy/native/floor方式で再試行しない | FR-16、NFR-02 |

## Registrationとschema invariant

| ID | ルール | 検証 |
|---|---|---|
| BR-30 | 4 native driverはclosed registration集合に各1回だけ現れる | exhaustive fixture |
| BR-31 | Claude registrationは2 driver、CodexとKiroは各1 driverを所有し、provider間の重複を禁止する | cardinality fixture |
| BR-32 | Kiro registrationだけが`kiro`と`kiro-ide`の2 harnessを受理する | harness fixture |
| BR-33 | registrationはstatic import用contractであり、未知driver、動的discovery、custom pluginを受理しない | unknown/extra fixture |
| BR-34a | 全adapterはpure `prepareResources`と、U-02の`MaterializedAuxiliaryResourceSet`を受けるpure `buildExecution`を実装し、`AdapterExecutionPlan(launch + capture + captureIdentity + resources)`のresource集合/digestをpreparationと一致させる | registration/dispatch拒否 |
| BR-34 | provider slotは`available|unavailable`のclosed unionとし、未実装slotをavailableへ偽装しない | fail-closed fixture |
| BR-35 | JSON schemaはversion 1、判別可能なkind、`additionalProperties=false`を必須にする | schema fixture |
| BR-36 | secret-like field、生provider payload、prompt、credentialを型とschemaのallowlist外に置く | planted secret fixture |
| BR-37 | `DriverRequest`はdefault/new-env/legacy-envの判別unionとし、sourceに存在しないfieldの組合せを許さない | invalid-state compile fixture |
| BR-38 | legacy outcomeはClaude/Codex/Kiroの有効なexecution・floor・degrade理由だけをharness別判別unionで列挙する | legacy全表 + invalid-state compile fixture |

## 決定性と不変条件

1. policy内でI/O、時刻、乱数、locale依存比較、process.env直接参照を行わない。
2. collectionは固定の列挙順または明示sort後に評価し、`Map`やobjectの偶然の反復順へ意味を持たせない。
3. errorも成功値もfrozen valueとして返し、呼出側のmutationでdigestや表示が変わらないようにする。
4. `requested=auto`かつ`selected`未定、`selected=auto`、`mode=floor`かつnative selected、`mode=native`かつfloor selectedを構築不能にする。
5. topology分類、selection、fallback reason、legacy plan、registration完全性を別々の純関数としてtestできるようにする。
6. 要求にない後方互換shim、旧名alias、未定義fallback、plugin seamを追加しない。

## Business scenario別の判定例

| Scenario | 入力要約 | outcome |
|---|---|---|
| USR-01 | Claude、coordinated、Agent Teams available | native `claude-agent-teams`、reason=`none` |
| USR-02 | Claude、independent、Ultra available | native `claude-ultracode`、reason=`none` |
| USR-03 | Claude、unknown、Ultra available | native `claude-ultracode`、topology reason=`no-signal` |
| USR-04 selection部 | Codex、明示`codex-ultra`、available | native `codex-ultra` |
| USR-05 selection部 | Kiro、auto、available | native `kiro-subagent`。wave分割はU-05 |
| USR-06 | CodexでClaude driver明示 | `HARNESS_DRIVER_MISMATCH`、side effect 0 |
| USR-07 | Codex、auto、Ultra unavailable | floor `codex-exec-floor`、loud reasonあり |
| USR-08 | 旧変数だけ設定 | harness別legacy planとwarning metadata |
| USR-09 | 新旧変数併存 | `CONFLICTING_ENV`、side effect 0 |
