# Initiative Brief — mirror-auto-modes

> 上流入力（consumes 全数）: `intent-statement.md`、`scope-document.md`、`intent-backlog.md`、`feasibility-assessment.md`、`constraint-register.md`。`competitive-analysis.md`、`team-assessment.md`、`wireframes.md`はN/A（理由は「非適用入力」参照）。

## Recommendation

**GO — Inceptionへ進める。**

`intent-statement.md`で承認された`off | prompt | auto`の3モード化は、既存の3層設定、GitHub mirror tool、engine境界、配布pipelineを拡張して実現できる。`feasibility-assessment.md`の条件付きGOに従い、重複create防止と自動closeのprovenance証明をRequirements・Designのhard conditionとする。

## Intent and Problem

現行のboolean `auto-mirror`は`true`でも既存Issueのsyncしか自動化せず、名称から期待されるcreate・sync・close全体の自動化と一致しない。さらに、IntentをGitHub Issueへ早期共有して他の開発者との重複・競合を避けるには、作成から完了まで一貫したpolicyが必要である。

解決後は次の意味になる。

- `off`: create・sync・closeを発火しない
- `prompt`: 各外部操作前に確認する
- `auto`: 安全ガード付きでcreate・sync・closeを自動実行する

旧booleanは互換維持せずエラーとし、未指定時は`prompt`とする。

## Feasibility and Risk

`feasibility-assessment.md`と`constraint-register.md`により、AWS・新規SaaS・新規dependencyなしで実現可能と確認した。主要リスクと処置は次のとおり。

| リスク | 必須処置 |
|---|---|
| Issue作成成功後のstate書込み失敗で重複create | 部分成功を再発見できる永続情報とfailure injection |
| Issue番号だけではAmadeus作成を証明できない | 自動close前に検証可能なprovenance |
| GitHub障害で未同期が不可視になる | Workflow継続、未同期状態、警告、次境界で再試行 |
| `auto`が人間承認境界を過大拡張する | Intentミラー、確定境界、Amadeus作成Issueへ限定したrule |
| coreと配布物がdriftする | package/promote生成と既存drift guard |

## Scope Boundary

`scope-document.md`と`intent-backlog.md`は、次の4能力をすべてMustとしている。

1. `auto`設定から安全なcreate、provenance、重複なし再試行までのwalking skeleton
2. create・sync・close全体に対する3モードpolicy
3. 非blockingな未同期記録と冪等なreconciliation
4. 限定的なrule改定、全harness配布、日英文書、検証

GitHub以外のtracker、stageごとのsync、boolean互換shim、外部Issueのauto close、Web UI・daemonは対象外である。

## Delivery and Resource Posture

- 現在はソロモードで、Ideation成果物は既存repo・既存Bun toolchainで作成済み。
- InceptionではRequirements、Application Design、Units Generation、Delivery Planningを通じて4つのproto-Unitを実装可能なUnitへ精密化する。
- Constructionのnamed mob、staffing、scheduleは現時点で確約しない。Unit依存とBolt順序が確定した後にDelivery Planningのゲートで承認する。
- 固定deadlineはなく、安全条件を削って日程を優先しない。

## Non-Applicable Inputs

- `competitive-analysis.md`: 内部frameworkの契約整合が目的で、市場競争によるbuild/buy判断を伴わない。
- `team-assessment.md`: Team Formationは本scopeでSKIPされ、現時点のnamed teamを捏造しない。
- `wireframes.md`: UIは追加しない。ユーザー可視面はconfig、CLI directive、status、日英文書である。

## Inception Handoff Contract

Inceptionでは次を曖昧なままConstructionへ渡さない。

1. 3モード×create/sync/close×lifecycle境界の完全な決定表
2. provenanceの所有者、保存先、検証規則、欠落時のfail-closed動作
3. create部分成功を含む再試行状態機械と冪等性
4. 未同期状態、警告、status表示、成功後の解消条件
5. team/project rule改定の正確な境界
6. core・全harness・dist・self-install・日英文書の変更面
