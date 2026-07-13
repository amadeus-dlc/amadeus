# Initiative Brief

## 推奨判断

**条件付きGO — Inceptionへ進む。**

今回のIntentは、Constructionのmulti-Unit swarmにおけるdriver選択を、決定的・検証可能・監査可能な共通契約へ移行する。問題、対象利用者、scope、実現可能性、移行境界、完了証明、delivery ownershipは合意済みである。

唯一の重大な未実証事項は、Claude Agent TeamsのTeam実起動とCodex Ultraのsubagent委譲を非対話実行から機械判定できる証跡である。これはRG-01としてInception後の最優先stop conditionにする。証跡を確立できないdriverは、既存floorへ置換して成功扱いせず、scopeへ戻して再承認する。

## Intentと利用者価値

[`intent-statement`](../intent-capture/intent-statement.md) が定義した中心問題は、`AMADEUS_USE_SWARM`の同じbooleanがハーネスごとに異なる方式を意味し、利用者が実driver、native能力、fallback、監査再現性を予測できないことである。

主要利用者はClaude Code、Codex、KiroでAmadeusを実行する利用者・開発チームであり、第二の利用者はハーネス統合と配布を保守するmaintainerである。今回届ける価値は次のとおり。

- 通常時は`auto`が利用可能能力とtask topologyからdriverを決定的に選ぶ。
- 明示driverは、指定したnative surfaceを実際に使えない場合に実行前hard errorとなる。
- `auto`のfallbackは利用者表示と監査の両方にrequested / selected / reasonを残す。
- 0.1.x利用者は旧設定の意味を保ったまま新selectorへ移行できる。

## 公開契約

公開変数は`AMADEUS_SWARM_DRIVER`、既定値は`auto`とする。公開値は次の5つに閉じる。

- `auto`
- `claude-agent-teams`
- `claude-ultracode`
- `codex-ultra`
- `kiro-subagent`

適用範囲はengineが許可したConstructionのmulti-Unit `invoke-swarm`だけである。通常のstage subagent、対話conductor、Responses API Multi-agent、custom driver、plugin SDKは対象外とする。

## Feasibilityと主要リスク

[`feasibility-assessment`](../feasibility/feasibility-assessment.md) は4driverすべてを条件付きで実現可能と判定した。[`constraint-register`](../feasibility/constraint-register.md) は21件の技術・互換・運用制約を固定し、[`raid-log`](../feasibility/raid-log.md) は6件のRisk、5件のAssumption、4件のIssue、6件のDependencyを管理する。

| 優先 | リスク | 合意済み緩和 | Go / No-Go条件 |
|---|---|---|---|
| 1 | Agent Teamsのheadless実起動を安定判定できない | 最小live probeでTeam固有証跡を取得 | 取得不能ならscopeへ戻り、driverを出荷しない |
| 2 | Codex Ultraの委譲eventを通常実行と区別できない | `ultra`を明示し、機械可読eventをfixtureで固定 | 区別不能ならscopeへ戻り、floor代替しない |
| 3 | provider認証・network・rate limitでlive suiteが不安定 | 決定的suiteとopt-in live suiteを分離 | skipや未認識eventをpassにしない |
| 4 | 正本・各ハーネス・`dist`・self-installがdriftする | 既存のpackage / promotion drift guardを必須化 | 全同期検査がgreenになるまで完了しない |

新しいAWS資源やcredential保管は不要である。非機密fixtureに限り、decision ownerは現在の認証済みClaude Code、Codex、Kiroとprovider token / networkの利用を承認している。prompt、secret、生provider responseは監査へ保存しない。

## Scopeと優先backlog

[`scope-document`](../scope-definition/scope-document.md) はIn Scope 13件、Out of Scope 8件を確定した。[`intent-backlog`](../scope-definition/intent-backlog.md) はrisk-firstで、RG-01と縦切りproto-Unit 6件を定義している。

| 順序 | Backlog | Outcome |
|---|---|---|
| Gate | RG-01 | Agent TeamsとCodex Ultraのnative証跡契約を成立させる |
| 1 | PU-01 | 共通selectorから1つの検証済みdriver、収束、監査までのskeleton |
| 2 | PU-02 | Claude Agent TeamsとUltra Codeのend-to-end native driver |
| 3 | PU-03 | Codex Ultraのend-to-end native driver |
| 4 | PU-04 | Kiro subagentのend-to-end driver |
| 5 | PU-05 | 0.1.x旧互換、警告、移行文書、0.2.0削除Issue |
| 6 | PU-06 | 決定的suite、opt-in live suite、配布・文書・総合証明 |

今回の出荷境界は0.1.x移行ブリッジまでである。`AMADEUS_USE_SWARM`の完全削除実装は0.2.0の後続Issueへ分離する。

## 市場・visual・team観点

- `competitive-analysis` はmarket-researchがSKIPのため存在しない。本件は外部製品の購入・市場投資判断ではなく、既存Amadeusの公開契約修正であるため、go判断の欠落にはならない。
- `wireframes` はrough-mockupsがSKIPのため存在しない。CLI環境変数、診断、監査、文書が利用者interfaceであり、GUI concept visualは対象外である。
- `team-assessment` はteam-formationがSKIPのため存在しない。ユーザーがsponsor / decision owner、Amadeus agentsが実行主体となり、各approval gateでユーザーが判断する。追加のhuman team編成は今回不要である。

## 資源とdelivery ownership

| 項目 | Commitment |
|---|---|
| Sponsor / final decision | ユーザー |
| Execution | Amadeus agents。stage persona、Unit worktree、レフェリー、approval gateを使用 |
| Live environment | 現在の認証済みローカルClaude Code、Codex、Kiro。非機密fixtureに限定 |
| CI | 決定的testは既存CIへ統合。新しいcredentialed live jobは作らない |
| Live proof | 再実行可能なopt-in suiteをIntent完了前に4driverで実行 |
| Budget / schedule | 固定値なし。token効率よりnative能力保証と監査可能性を優先 |

## Inceptionへのhandoff条件

1. Requirements Analysisは、5つの公開値、`auto`選択、明示hard error、loud fallback、0.1.x互換、0.2.0追跡、4driverのlive証明をテスト可能な要求へ変換する。
2. Application Designは、RG-01の能力・証跡契約と、既存のprepare / check / finalizeを壊さないdriver境界を確定する。
3. Units Generationは、RG-01とPU-01〜PU-06を検証可能な縦切りUnitへ精製し、Claude / Codex / Kiroの並行可能性をDAGへ反映する。
4. Delivery Planningはrisk-firstを維持し、RG-01不成立時にscopeへ戻るstop conditionを最初のentry / exit criteriaへ入れる。
5. Constructionは、明示driverのfloor代替、live suiteのskip-as-pass、配布物driftを完了として扱わない。

## Ideation成果の適用性

| 成果物 | 状態 | Handoffでの扱い |
|---|---|---|
| `intent-statement` | 完了 | 問題、利用者、成功指標の正本 |
| `feasibility-assessment` | 完了 | 条件付き実現可能性とdriver能力の根拠 |
| `constraint-register` | 完了 | hard error、互換、credential、監査、配布制約 |
| `scope-document` | 完了 | In / Out境界とリリース境界 |
| `intent-backlog` | 完了 | risk gateとproto-Unit順序 |
| `competitive-analysis` | N/A | market-research SKIP。外部市場投資判断なし |
| `team-assessment` | N/A | team-formation SKIP。ownershipは本briefで確定 |
| `wireframes` | N/A | rough-mockups SKIP。GUI scopeなし |

## 最終勧告

Intent、scope、backlog、feasibility、resources、decision rightsは整合している。RG-01をmandatory stop conditionとして維持することを条件に、Inceptionへ進むことを推奨する。
