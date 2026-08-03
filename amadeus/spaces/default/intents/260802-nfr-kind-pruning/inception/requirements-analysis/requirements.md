# 要件分析 — Issue #2019 NFR Unit-Kind Pruning

## Intent分析

本Intentは、[Issue #2019](https://github.com/amadeus-dlc/amadeus/issues/2019) で確認された upstream v2.2.18 の片翼移植を `self-fix` として完了する。現行Amadeusは、Unit kindと `produces_kinds` からUnit別の成果物集合を絞るconsumer機構を持つが、`units-generation` がkindを書かないため、その機構が通常ワークフローで発火しない。

利用者価値は、CLI・ライブラリ中心のUnitに対して適用外NFR成果物を生成・レビューする時間を減らしつつ、service UnitのNFR成果物契約と既存recordの再開互換性を維持することである。Issueで実測されたNFR 2ステージ合計20分25秒は問題規模の根拠であり、本Intentの合否を決める固定時間閾値にはしない。決定的な合否指標は、engineが要求する成果物数と入力欠落判定である。

## 根拠と現状

| 根拠 | 確認事項 |
|---|---|
| Issue #2019 | 片翼移植の機序、50成果物、NFR 2ステージ20分25秒、受入条件の方向性 |
| upstream commit `831bd29c392eff141a230e1e0501239eae132c31` | `name` → `kind` → `depends_on` のYAML様式と5種のkind定義 |
| `business-overview.md` | 利用者価値、対象ステージ、後方互換の必要性 |
| `architecture.md` | producer → runtime graph → kind-aware routing の処理経路 |
| `code-structure.md` | stage、sensor、engine、test、packagingの変更面 |
| `packages/framework/core/amadeus-common/stages/inception/units-generation.md:97` | 現行producerはUnit定義とYAML blockにkindを要求しない |
| `packages/framework/core/tools/amadeus-graph.ts:799` | `produces_kinds` に基づく既存の成果物絞り込み関数 |
| `packages/framework/core/tools/amadeus-orchestrate.ts:1630` | kind不明・不正時にfull matrixへ戻す既存のfail-safe |
| `packages/framework/core/amadeus-common/stages/construction/nfr-design.md:24` | NFR DesignがNFR Requirements 5成果物をすべてrequired入力にする現行非対称 |

`intent-statement` と `scope-document` は、この最小 `self-fix` の初期化経路では個別成果物として生成されていない。ユーザー意図はIssue #2019、対話回答、監査ログから取得した。`team-practices` 相当の制約は、適用中の `org.md`、`team.md`、`project.md`、`phases/inception.md` から取得した。

## 機能要件

### FR-1: 新規Unit計画は正準kindを持つ

`units-generation` は、計画承認時と成果物生成時に、すべての新規Unitへ次のいずれか1つのkindを必須で割り当てなければならない。

| kind | 判定基準 |
|---|---|
| `service` | 独立してデプロイ・実行される実行体 |
| `spec` | その場で消費される契約またはschema |
| `ui` | frontendの利用者接点 |
| `packaging` | build・distribution成果物 |
| `library` | 単独runtimeを持たない再利用コード |

受入条件:

- Given 新しいUnits Generation計画、When 計画承認を提示する、Then 各Unitのkindと、そのkindがConstruction成果物範囲を決めることを要約する。
- Given `unit-of-work.md`、When Unit定義を読む、Then 各Unitに正準kindが1つ記録されている。
- upstreamはkind省略を許すが、本Intent以後の新規producer契約では省略を許さない。このローカル強化をstage本文に明記する。

### FR-2: machine-readable DAGへkindを出力する

`unit-of-work-dependency.md` の必須fenced YAML blockは、全Unitを次の順序で表現しなければならない。

```yaml
units:
  - name: <unit-name>
    kind: library
    depends_on: []
```

受入条件:

- 各Unitは `name`、`kind`、`depends_on` を1回ずつ持つ。
- `kind` は `service | spec | ui | packaging | library` のいずれかである。
- 既存の一意名、参照整合、自己依存禁止、非循環のDAG契約は維持する。
- runtime compile後の `bolt_dag.units` は、入力したkindを失わず保持する。

### FR-3: Units Generationのゲートでkind欠落を拒否する

`required-sections` sensorは、`units-generation` の `unit-of-work-dependency.md` に対して、既存のedge-block検査に加え、全Unitのkind実在と正準語彙適合を検査しなければならない。

受入条件:

- Given kindがないUnitを1件含む新規Unit成果物、When sensorを実行する、Then `pass: false` となり、欠落Unitを識別できるfindingを返す。
- kind欠落時のsensor CLIはexit 0のJSONとして `pass: false`、1件以上の `findings_count`、欠落Unit名の配列を返し、dispatcherが `SENSOR_FAILED` としてgateを止める。
- Given不正kindを含む成果物、When `required-sections` sensorを実行する、Then共有parserの `malformed` 判定を `edge_block: malformed`、`pass: false` として返し、dispatcherがgateを止める。
- Given 全Unitが正準kindを持つ非循環DAG、When sensorを実行する、Then kind検査とedge-block検査がともに成功する。
- kind欠落fixtureが実際に赤になることを先に実証し、その後に緑へする。

### FR-4: kindに応じてNFR成果物を絞り込む

既存 `produces_kinds` をapplicabilityの正本として維持し、engineは既知kindのUnitに対して該当成果物だけを要求しなければならない。既存mapの語彙や対応関係は本Intentで変更しない。全5kindの正準期待集合は次のとおりとする。

| kind | NFR Requirementsの必須成果物 | NFR Designの必須成果物 |
|---|---|---|
| `service` | performance、security、scalability、reliability requirements、tech-stack-decisions（5件） | performance、security、scalability、reliability design、logical-components（5件） |
| `ui` | performance-requirements、security-requirements、tech-stack-decisions（3件） | performance-design、security-design、logical-components（3件） |
| `library` | security-requirements、tech-stack-decisions（2件） | security-design、logical-components（2件） |
| `spec` | security-requirements、tech-stack-decisions（2件） | security-design（1件） |
| `packaging` | security-requirements、tech-stack-decisions（2件） | security-design（1件） |

受入条件:

- Given `kind=library`、When NFR Requirementsをrouteする、Then必須成果物は `security-requirements` と `tech-stack-decisions` の2件である。
- Given `kind=library`、When NFR Designをrouteする、Then必須成果物は `security-design` と `logical-components` の2件である。
- Given `kind=service`、When両NFRステージをrouteする、Thenそれぞれ従来どおり5成果物を要求する。
- Given `kind=ui | spec | packaging`、When両NFRステージをrouteする、Then上表の集合と件数へ一致する。
- Given library Unitの2成果物だけが存在する、When Unit coverageを判定する、ThenそのUnitをcoveredと判定し、省かれた3成果物を再開要求しない。
- Given各kindの上表にある成果物だけが存在する、When Unit coverageを判定する、ThenそのUnitをcoveredと判定する。

### FR-5: producer applicabilityをconsume側へ投影する

consumerの必須入力集合は、入力成果物を所有するproducerの既存 `produces_kinds` から導出しなければならない。`consumes_kinds` のような重複するapplicability正本は追加しない。NFR Designの正準期待入力は次のとおりとする。

| kind | NFR Requirements由来 | Functional Design由来 | 合計 |
|---|---|---|---:|
| `service` | performance、security、scalability、reliability requirements、tech-stack-decisions | business-logic-model | 6 |
| `ui` | performance-requirements、security-requirements、tech-stack-decisions | business-logic-model | 4 |
| `library` | security-requirements、tech-stack-decisions | business-logic-model | 3 |
| `spec` | security-requirements、tech-stack-decisions | なし | 2 |
| `packaging` | security-requirements、tech-stack-decisions | なし | 2 |

受入条件:

- Given `kind=library` のNFR Design、When入力を解決する、Then NFR Requirements由来の必須入力は `security-requirements` と `tech-stack-decisions` の2件であり、省かれた `performance-requirements`、`scalability-requirements`、`reliability-requirements` を `consumes_absent` に出さない。
- `business-logic-model` など、別producerがkind上適用すると宣言する入力は従来どおり扱う。
- Given `kind=service`、When同じ入力を解決する、Then NFR Requirements由来の5入力をすべて必須として扱う。
- Given `kind=ui | spec | packaging`、When同じ入力を解決する、Then上表の集合と件数へ一致し、producer側で省かれた入力を `consumes_absent` に出さない。
- Given producer成果物に `produces_kinds` 指定がない、Thenその成果物は全kindに適用する。

### FR-6: legacy kindless recordのfull-matrix fallbackを維持する

本Intentの必須化は新規 `units-generation` 出力にのみ適用し、既存recordを遡及編集しない。runtime側は次の粒度で既存のfull-matrix fallbackを維持する。

- runtime graph全体が正常に読め、Unit行のnameが一意かつkind以外の形状が正しい場合、kind付きUnitはkind-aware、kind省略Unitだけはfull matrixとして扱う。
- 1行でも不正kind、空name、重複nameなどがありUnit集合を安全に解釈できない場合、kind map全体を破棄し、そのステージの全Unitをfull matrixとして扱う。
- runtime graph自体が欠落・不正JSONの場合、全Unitをfull matrixとして扱う。

受入条件:

- Given kind行のない既存record、When resumeしてNFRステージをrouteする、Then各ステージの全5成果物と、対応する全入力契約を維持する。
- Given有効なkind付きUnitとkind省略Unitが混在するlegacy record、When routeする、Then前者だけをkind-awareに絞り、後者だけをfull matrixへ戻す。
- Given1件の不正kind、空name、重複name、または不正runtime graph、When routeする、Then全Unitをfull matrixへ戻す。
- 新規producerのゲート強化とlegacy runtime fallbackを同じfixtureで混同しない。

### FR-7: 適用外成果物と既決内容の転記を抑止する

3つのstage正本を次の責務で更新する。

- `units-generation`: 計画承認・Unit定義・YAML block・完了要約でkindを必須化し、5kindの意味を記述する。
- `nfr-requirements`: engine directiveが指定したapplicable outputsだけを生成し、既決内容を転記しない。
- `nfr-design`: engine directiveが指定したapplicable outputsとpresent consumesだけを使い、省かれた入力・出力を再作成せず、既決内容を転記しない。

受入条件:

- kindで省かれた成果物を、N/A placeholderやcompletion目的で作成しない。
- Requirements Analysis、Functional Design、CodeKBで既決の内容を再分類・転記せず、必要箇所を `file:line` で参照する。
- applicable成果物内で項目が適用外の場合は、理由を1行で記述する。
- source contract testで、上記3stageそれぞれの責務を表す文言が正本に存在することを固定する。

### FR-8: stale normを条件付き表現へ訂正する

`project.md` の `cid:nfr-design:c1-engine-produces-all-five` は、kindがない場合のlegacy fallbackに限定して正しい。実装着地時に、既知kindでは `produces_kinds` が成果物集合を絞り、kindlessでは全5成果物を要求する条件付き表現へ訂正する。

受入条件:

- 訂正後のnormがFR-4とFR-6の両方を正確に表す。
- 他の履歴的根拠や無関係なnormを変更しない。

### FR-9: 正本と配布物を同期する

変更は `packages/framework/core/` の正本へ加え、既定のpackaging/promote経路で全harness配布物とself-install面へ同期しなければならない。

受入条件:

- `dist/` を直接編集しない。
- `bun scripts/package.ts --check` と `bun run promote:self:check` が成功する。
- stage本文、sensor、engine、testの変更が生成先へ同期される。

## 非機能要件

### NFR-1: 実行コスト

- library Unitでは各NFRステージの必須成果物数を5件から2件へ減らす。削減率は `(5 - 2) / 5 = 60%` とする。
- library Unitが5件ある比較例では、両NFRステージ合計の要求成果物数は `5 Unit × 5成果物 × 2ステージ = 50` から `5 Unit × 2成果物 × 2ステージ = 20` になる。
- wall-clock時間はモデル、review iteration、実行環境に依存するため固定SLOを設けず、本Intentの受入条件にしない。着地後の実Intentでのbefore/after観測は効果仮説の参考検証であり、実装gateをブロックしない。

### NFR-2: 信頼性と安全側挙動

- 新規producer出力のkind欠落・不正値はgateでfail-closedに拒否する。
- legacy runtime入力のkind不明は過少生成を避けるためfull matrixへfail-safeする。
- consumer投影はproducerの既存applicabilityから決定的に導出し、producer/consumer間の二重定義driftを作らない。

### NFR-3: 保守性

- kind語彙は既存 `UNIT_KINDS` を唯一の正本とし、新しい列挙を独立定義しない。
- 既存 `requiredArtifactsForUnit` または同じapplicability判定を再利用し、単発のlibrary特例を作らない。
- engine変更はconsume applicability投影に必要な範囲へ限定し、routing全体を再設計しない。

### NFR-4: テスト容易性

- Comprehensive Test Strategyとして、producer gate、parser/runtime graph、producer routing、consumer input projection、coverage、legacy fallback、source contract、package driftを自動テストで検証する。
- 不具合を再現する赤テストを先に置き、実装後に対象テスト、typecheck、lint、全CI suiteを実行する。

## 制約

- Scopeは `self-fix`。composeや別scopeへ変更しない。
- `tech-stack-decisions` の `optional_produces` 化は本Intentに含めない。
- `UNIT_KINDS` の5語彙と既存 `produces_kinds` mapを変更しない。
- functional-designの既存kind-pruningや成果物集合を変更しない。
- scope-grid世代不整合の調査・修正は別Issueとし、本Intentへ混ぜない。
- formal-model-check advisoryは本修正の必須経路ではなく、対象外とする。
- 既存recordを一括変換・遡及編集しない。

## 前提

- `produces_kinds` は成果物のUnit kind applicabilityを所有する正準契約である。
- `security-requirements`、`tech-stack-decisions`、`security-design` は `produces_kinds` に列挙されていないため全kindに適用する。
- Issue #2019の2件の独立クロスレビューとReverse Engineeringの承認結果は、問題の実在性と変更目的の根拠として有効である。
- 実装中に既存applicability map自体の誤りが見つかった場合は、この要件からの逸脱として停止し、別途裁定を求める。

## スコープ外

- `tech-stack-decisions` のconditional/optional化
- NFRステージ全体のscope-grid SKIP方針
- NFR reviewer回数やsubagent並列性の変更
- functional-design、infrastructure-designの成果物map変更
- Unit kind語彙の追加・名前変更
- 過去Intent成果物の書き換え
- 固定wall-clock SLOの導入
- GitHub Issue・PRの追加作成、commit、push、merge

## 受入テスト対応表

| 要件 | 検証面 |
|---|---|
| FR-1〜FR-3 | `t133`系fixtureでkind欠落のsensor JSON、5正準kindの緑、不正kindのmalformed、runtime保持を検証 |
| FR-4 | `t248`系engine fixtureで5kindすべてのNFR Requirements／NFR Design期待集合とcoverage成立を検証 |
| FR-5 | kind-aware consume fixtureで5kindすべての期待入力、pruned入力の `consumes_absent` 不在を検証 |
| FR-6 | 全kindless、valid+kindless混在のUnit単位fallback、不正1件・runtime graph欠落の全Unit fallbackをcharacterization検証 |
| FR-7 | 3つのstage正本に対するsource contract assertionを検証 |
| FR-8 | stale cidの条件付き本文をdiffと検索で検証 |
| FR-9 | package/check、promote/self check、生成物drift guardを検証 |
| NFR-1 | library fixtureの要求成果物数を式どおり比較。wall-clock観測は非ゲートの参考検証として明示 |

## 完全性分析

| 次元 | 状態 | 根拠 |
|---|---|---|
| Functional requirements | 完了 | producer、sensor、routing、consume、fallback、stage本文、同期を定義 |
| Non-functional requirements | 完了 | コストproxy、fail-safe、保守性、テスト戦略を定義 |
| User scenarios | 完了 | 新規library/service、legacy kindless、欠落・不正kindを網羅 |
| Business context | 完了 | 恒常的なNFR生成・レビュー時間の削減をIssue実測へ追跡 |
| Technical context | 完了 | stage、sensor、engine、graph、test、packaging seamを特定 |
| Quality attributes | 完了 | 決定性、後方互換、安全側挙動、単一正本、検証可能性を定義 |

## 未解決事項

なし。consume側の非対称はユーザー回答により、producerの既存 `produces_kinds` を投影する方式で解決した。実装中に要件・既存mapとの矛盾が実測された場合は、無申告でscopeを狭めず承認ゲートへ戻す。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T00:34:34Z
- **Iteration:** 1
- **Scope decision:** none

library/service の価値、producer applicability の投影、legacy 互換、scope 外は明確である。一方、5種kindの網羅、fallback粒度、検証責務に未解決の曖昧さがあり、開発者とQAが同じ契約を一意に導けない。

### Findings

- FR-4/FR-5はlibraryとserviceしか期待結果を定義していない。正準語彙として必須化するspec、ui、packagingについても、NFR Requirements／NFR Designの出力、必須入力、coverageの期待集合を明示するか、正準mapの具体的な参照表を受入契約に含める必要がある。
- FR-6の「Unit kind集合を安全に解釈できない場合」のfallback粒度が不明である。複数Unit中の1件だけがkindless／不正な場合に、そのUnitだけをfull matrixへ戻すのか、ステージ内の全Unitを戻すのかを定義し、mixed-kind legacy fixtureの受入条件を追加する必要がある。
- FR-3は不正kindの拒否主体を「sensorまたは共有parser」としており、冒頭の「required-sections sensorが検査する」という契約と一致しない。どの境界が必ずfail-closedにし、どのobservable finding／終了結果を返すかを一意に定める必要がある。
- FR-7は本文でnfr-requirementsとnfr-designの2 stageだけを対象としている一方、受入テスト対応表は「3つのstage正本」を要求している。第三のstageと各stageで固定する文言・検証対象を明記する必要がある。
- NFR-1の着地後観測は「代表的な1 Intent」の選定条件、計測手順、記録場所が未定義で再現可能な受入条件になっていない。参考観測として要件外へ分離するか、QAが同じ結果を確認できる測定契約を定義する必要がある。
- Q&Aはconsume投影方式だけを裁定しており、上記の曖昧さを解消していない。それにもかかわらず「未解決事項なし」「完全性分析 完了」としているため、質問回答と成果物の完成宣言が整合していない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T00:38:14Z
- **Iteration:** 2
- **Scope decision:** none

前回の6 findingsは解消された。全5kindの出力・入力・coverage期待値、legacy混在時と不正時のfallback粒度、required-sections sensorの観測可能な失敗契約、3つのstage正本の責務が明示されている。wall-clock観測も非ゲートへ分離され、顧客価値、scope、後方互換、実装責務、受入テストのトレーサビリティが揃ったため、追加確認なしで開発とQAを開始できる。

### Findings

- None
