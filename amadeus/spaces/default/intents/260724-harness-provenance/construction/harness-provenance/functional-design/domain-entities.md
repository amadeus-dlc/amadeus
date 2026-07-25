# Domain Entities — harness-provenance

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

## モデル方針

unit-of-work.mdとunit-of-work-story-map.mdが定める`harness-provenance`は、永続的な業務entityやaggregateを新設しないlibrary型Unitである。requirements.mdの記録値をvalue object相当の判別unionとして表現し、components.mdのDetectorとRecorder間で渡す。component-methods.mdの公開型以外は`amadeus-lib.ts`内部へ閉じ、services.mdどおり同一process内で同期的に扱う。

## HarnessType

### 種別

公開されたimmutable value set。値は次の7つだけである。

| 値 | 意味 | 生成経路 |
|---|---|---|
| `claude-code` | Claude Code | type override、`CLAUDECODE=1`、実検出`.claude` |
| `codex` | Codex | type override、実検出`.codex` |
| `cursor` | Cursor | type override、実検出`.cursor` |
| `opencode` | OpenCode | type override、実検出`.opencode` |
| `kiro` | Kiro CLIまたはKiro IDE | type override、実検出`.kiro` |
| `unknown` | 検出不能・未知値・fallback | type override、invalid override、未知dir、fallback |
| `manual` | ユーザーが手動指定したことを示す | type overrideのみ |

### 不変条件

- union外の文字列をstateへ渡さない
- 自動検出だけでは`manual`を生成しない
- `unknown`は失敗ではなく、誤った断定を避ける正規の結果である
- parse後の値は変換せず、そのままRecorderへ渡す

## HarnessDirSource

モジュールprivateな4値union。

| 値 | 意味 | `dir`の由来 |
|---|---|---|
| `env` | 明示的なharness-dir override | truthyな`AMADEUS_HARNESS_DIR` |
| `script-path` | 配布ツリーの実行位置 | `<dot-dir>/tools/amadeus-lib.ts`のgrandparent |
| `cwd-probe` | 配布外の開発時補助検出 | CWDに実在する既知候補 |
| `fallback` | いずれも成立しない | 互換文字列`.claude` |

`HarnessDirSource`は外部へexportせず、Detector内部の判定材料としてのみ使う。

## HarnessDirResolution

モジュールprivateなimmutable value object。

| 属性 | 型 | 制約 |
|---|---|---|
| `dir` | `string` | resolverが解決した1 path segment。script-pathではdot-dir形式 |
| `source` | `HarnessDirSource` | `dir`を得たrungと一致 |

### 不変条件

- `dir`と`source`は常に同時に生成・cacheする
- `source=fallback`なら`dir=.claude`
- `source=script-path`なら`dir`は`isHarnessDirName()`を満たす
- envとscript-pathはopen-set文字列を受けうる。cwd-probeは既存`KNOWN_HARNESS_DIRS`の候補だけを返し、いずれもtype mappingはown keyだけを受理する
- 公開`harnessDir()`へは`dir`だけを射影し、Detectorへはresolution全体を渡す

## HarnessDirToType

Issue #1452の記録対象を表すcanonicalなimmutable mapping。

| key | value |
|---|---|
| `.claude` | `claude-code` |
| `.codex` | `codex` |
| `.cursor` | `cursor` |
| `.opencode` | `opencode` |
| `.kiro` | `kiro` |

`SupportedHarnessDir`はこのmappingのkeyから導出する。既存`KNOWN_HARNESS_DIRS`との自動同期や相互導出は行わない。前者は記録語彙、後者はCWD probe順序という別の責務を持つ。

## HarnessStateField

新規クラスや独立entityは作らず、既存state Markdown内のscalar fieldとして表現する。

| 属性 | 値 |
|---|---|
| section | `Project Information` |
| field name | `Harness` |
| serialized form | `- **Harness**: <HarnessType>` |
| cardinality | 新規stateで1、既存stateでは0も許容 |
| lifecycle | intent birthで生成後、そのintentでは不変 |

HarnessStateFieldはstate Version 7のoptional拡張である。新規schema version、migration、独自parserを持たない。

## 関係と所有権

```
handleIntentBirthStateBuild
  -> detectHarnessType
       -> HarnessTypeOverride parser
       -> ClaudeCode signal
       -> HarnessDirResolution
            -> HarnessDirToType
  -> HarnessStateField serialization
```

- Harness Detectorが`HarnessType`、`HarnessDirResolution`、mappingを所有する
- Harness Recorderは`HarnessType`を消費し、state fieldの配置だけを所有する
- RecorderからDetectorへの一方向依存であり、`amadeus-lib.ts`から`amadeus-utility.ts`への逆参照を作らない
- 外部Unit、database、event、repositoryは存在しない

## ライフサイクル

1. process起動時、non-env resolution cacheは空
2. intent birthがDetectorを呼ぶ
3. type overrideまたはClaude signalが成立すれば、resolutionを生成せず`HarnessType`を確定
4. 必要な場合だけresolutionを解決し、非env結果をprocess内cache
5. mappingまたはfallback規則で`HarnessType`を確定
6. Recorderが新規stateへHarness fieldを1回serialize
7. 後続stageのconductorがstateを読み、人間可読なdiary本文へ値を併記

既存stateを後から更新するライフサイクル、履歴復元、監査イベント付記は本Unitに含めない。

## AC-3dテストfixtureのライフサイクル

各配布形態のfixtureは独立したfresh subprocessとして生成・破棄し、process間でresolution cacheを共有しない。subprocess環境から`AMADEUS_HARNESS_TYPE`、`CLAUDECODE`、`AMADEUS_HARNESS_DIR`を除去したことを実行前提とする。

fixtureのCWDには配布元と異なる`HarnessType`へ写像される既知dot-dirを1つだけ作る。`.claude`配布には`.codex`、`.codex`/`.cursor`/`.opencode`/`.kiro`配布(Kiro CLIとKiro IDE)には`.claude`を置く。結果が配布元typeならscript-path、競合候補typeならCWD probeを通ったと判別できるため、`HarnessDirSource`を公開せずにresolution rungを観測できる。

## エラー表現

ドメイン上の失敗型や例外は追加しない。

- 未知type override → `HarnessType.unknown`
- 空type override → `HarnessType.unknown`
- 未知dot-dir → `HarnessType.unknown`
- fallback → `HarnessType.unknown`
- Harness fieldなし既存state → `null`を返す既存`getField`契約

ファイル書込失敗など既存intent birthのI/Oエラーは従来経路へ委ね、Harness検出だけで新しい例外面を作らない。

## Frontend/UI

本UnitはCLI内部library機能であり、frontend component、props/state、form validation、API integrationは存在しない。したがってoptionalな`frontend-components.md`は生成しない。mockups相当のユーザー可視面はstate Markdownと既存CLIフローであり、独立UI entityを導入しない。
