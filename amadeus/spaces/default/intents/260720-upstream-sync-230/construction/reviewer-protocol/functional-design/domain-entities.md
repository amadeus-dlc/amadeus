# Domain Entities — reviewer-protocol

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Entity relationships

```text
ReviewInvocation
  ├─ ReviewPassList
  │    ├─ CurrentUnitArtifact[]
  │    ├─ StageDefinition
  │    ├─ QuestionRecord
  │    └─ SharedContract[]
  ├─ ReviewReadScope
  │    └─ IntegrationSpotCheck?
  └─ RuntimeReviewIdentity
       └─ ReviewRecord
```

## Public operations

```ts
function reviewerReadScope(unit: UnitRef, consumes: readonly ArtifactRef[]): ReadScope;
function runtimeReviewIdentity(persona: ReviewerPersona, utcDate: string): ReviewHeader;
```

この2関数だけがpublic seamである。`reviewerReadScope`はorchestrator ownershipでbase pass-listと当該invocation限定spot-check pathを返す。`runtimeReviewIdentity`はreviewer境界でchecker personaと実測UTCを`ReviewHeader`へ閉じる。owner resolverやscope decision builderは内部operationである。

## ReviewInvocation

`ReviewInvocation`はengine directiveとstage成果物から作るreviewerへの一回の委譲である。

| 属性 | 意味 |
|---|---|
| `reviewerPersona` | engineが指定したchecker persona |
| `stageDefinition` | 期待成果とvalidation定義 |
| `questionRecord` | current Unitで確定した判断 |
| `artifacts` | current Unitのrequired + 実在optional |
| `contracts` | per-unit時の解決済み`directive.consumes` |
| `iteration` | 同一Unit reviewの1-based iteration |
| `scopeDecision` | request前に`check-read`が固定したspot-check承認/拒否と根拠。spot-checkなしならnone |
| `scopeTranscript` | prompt/result間を通る当該invocation限定のtransient declared decision列。永続storeではない |

missing optional、memory、plan、record rootはentityに含まれない。

## ReviewPassList and ReviewReadScope

`ReviewPassList`は§12aがreviewerへ宣言するauthoritative closed setである。`ReviewReadScope`はその集合とsibling prohibitionを組み合わせたpolicy value objectで、tool種別に依存しない。file openだけでなくgrep、glob、shell patternを求めるdeclared requestもpath集合を跨げば拒否する。

current Unitのidentityはdirective.unitとartifact pathから一致検証する。passed `SharedContract`はsystem全体を記述してよいが、他Unit entryが存在するだけでcurrent Unitの参照義務を生まない。

## IntegrationSpotCheck

`IntegrationSpotCheck`はread scopeの唯一のsibling carve-outである。

| 属性 | 制約 |
|---|---|
| `integrationId` | current Unit artifactが具体的に明示 |
| `ownerPath` | passed shared contractから一意解決 |
| `reason` | claimed shapeの実在確認に必要な非空理由 |
| `ownerEvidence` | ownerを一意に解決したpassed contract上の根拠 |
| `decision` | `approved | rejected`。request前に固定 |
| `filesAllowed` | owner file 1件だけ |

承認predicateはintegration ID、単一owner path、非空reason、非browse/search由来の単一file pathの4条件ANDである。owner解決はcurrent Unitとpassed contractだけを使い、sibling directoryをbrowse/searchしない。`check-read`だけがrequestを評価し、owner不明・複数、directory/glob/grep/shell wildcard、path不一致を`rejected`にする。approved pathは当該invocationだけの`ReviewPassList`へ入り、次iterationへ継承しない。

## RuntimeReviewIdentity

`RuntimeReviewIdentity`はchecker personaと実測UTC timestampのpairである。timestampはReview書込直前の`date -u +%Y-%m-%dT%H:%M:%SZ` stdoutから生成し、ISO 8601 Z形式の単一行だけを受理する。

personaはinvocationのreviewer roleに一致しなければならない。producer persona、モデルが推定した現在日、fixture固定値はvalid identityにならない。

## ReviewRecord

`ReviewRecord`はprimary artifactへappendされるmaker-checker証跡である。

| 属性 | 型 |
|---|---|
| `verdict` | `READY | NOT-READY` |
| `reviewer` | checker persona identifier |
| `date` | runtime UTC timestamp |
| `iteration` | positive integer |
| `findings` | severity付きfinding list |
| `summary` | 実装可能性の短い結論 |
| `scopeDecision` | `check-read`のdecision、path、reason、integration ID、owner evidence。spot-checkなしならnone |

recordのlifecycleは`invoked → scope-declared → request-validated → transcript-revalidated → reviewed → appended`。scope decision transcriptはsubagent prompt/result間のtransient carrierであり、最終Reviewには`complete-review`が再検証した同内容のScope decision projectionをprimary artifactの一部として永続記録する。`complete-review`はdirective、current artifacts、passed consumesから全entryを再計算し、`check-read` bypass、改竄、rejected、approved path外、2 file目のrequest、またはidentity不正があれば`reviewed`へ到達させない。既存auditはinvocation identity/completionを保持し、新audit eventやread ledgerは作らない。

## AuthoredSurface and GeneratedProjection

`AuthoredSurface`はcore reviewer persona、reviewing knowledge、stage protocol、harness-specific orchestrator skillである。`GeneratedProjection`はpackage generatorが作る6 harness配布treeで、正本ではない。self-install対象4面は別projection集合として既存closed listを維持する。

## Non-entities

- builderのmemory/plan/reasoningはreview domain inputではない。
- conversation date、model knowledge、audit timestampはReview Dateの代替正本ではない。
- sibling directory、record root、recursive globはpass-listではない。
- actual syscall/tool-readを全6 harnessで捕捉するledger、proxy、sandboxはentityではない。不可視readの完全検知は本Unitの要件にせず、declared request/resultの検証を反証可能な境界とする。
- new runtime service、database、frontend component、network dependencyはU08に存在しない。
