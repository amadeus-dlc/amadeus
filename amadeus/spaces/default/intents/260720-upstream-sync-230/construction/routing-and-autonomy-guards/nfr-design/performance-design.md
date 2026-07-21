# Performance Design — routing-and-autonomy-guards

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。既存Bun CLI invocation内のpure classificationと単一marker statへ閉じ、新SLO、cache、queue、pollingを追加しない。

## Help classification path

`classifyHelpIntent(tokens)`をengine parser、terminal classifier、direct utility handlerが共有する正準decision tableとして配置する。単独`help`/`-h`、既存read-only flag、`intent|space help|-h`、workspace verb、freeformの順で有界分類し、record directoryやworkspace inventoryをscanしない。

入力token列の一回走査で完結し、`help me build auth`や`build a help desk`をfreeformとして保持する。parser別の追加set、dynamic registry、retry、background processを作らない。

## Marker freshness path

`inspectComposeMarker(stat, nowMs, ttlMs)`はworkspace-level単一marker pathのstat結果と注入clockをpure resultへ変換する。TTLは正準定数`24 * 60 * 60 * 1000`の一箇所だけで定義する。

| Input | Result |
|---|---|
| absent | absent |
| stat failure / non-finite mtime | unreadable |
| `max(0, nowMs - mtimeMs) <= TTL` | fresh |
| `max(0, nowMs - mtimeMs) > TTL` | stale |

age=24hはfresh、24h+1msはstale、future mtimeはage 0でfreshとする。directory walk、polling、retry loopはない。

## Adapter ordering

autonomous ConstructionのStop hookはmarker I/O前に`continue-enforcement`を確定し、stat/unlinkを呼ばずjanitorをN/Aとする。non-autonomousだけがfreshnessを評価し、stale時にbest-effort unlinkを一度試す。unlink成否は`deleted`/`delete-failed`として観測するがblock decisionへ逆流させない。

doctorは同じseamをread-onlyで一回呼び、markerを変更しない。`assertRecomposeAllowed`はstate snapshot直後かつplan/graph/checkbox/audit mutation前に実行する。

## Verification・resource境界

fake clock/stat/unlinkでhelp 3入口、24h境界、future mtime、fresh/stale/unreadable、autonomous marker未読、unlink success/failure、doctor read-only、recompose mutation 0を決定的に検査する。daemon、network、database、cache、queue、AWS infrastructureは追加しない。

## トレーサビリティ

本設計は`performance-requirements.md`のPERF-U04-01〜04、`security-requirements.md`のnamespace/autonomy control、`scalability-requirements.md`の単一path/3入口/6/4面、`reliability-requirements.md`の境界fixture、`tech-stack-decisions.md`のBun/TypeScript seam、`business-logic-model.md`のHelp/Marker/Recompose workflowを実装可能な配置へ写像する。

## Review — Iteration 1

- Verdict: READY
- Reviewer: amadeus-architecture-reviewer-agent
- Date: 2026-07-21T02:21:12Z
- Iteration: 1

### Scope decision

既定のclosed pass-list（stage definition、Q&A、current Unitの5成果物）だけを対象とし、追加spot-check readは要求せず、承認pathは0件とした。`memory.md`、`plan.md`、reasoning、record root、sibling Unit、consumes元ファイルは対象外である。

### Sensor results

orchestrator実測では、適用されたrequired-sections、upstream-coverage、answer-evidenceを含む検査は11/11 PASSである。Markdown-only成果物のためlinterとtype-checkは非該当である。本reviewでは、その実測結果と指定された成果物の内容を照合した。

### Findings

- Critical: なし
- Major: なし
- Minor: なし

共有help decision table、単一markerと24時間境界、autonomous Constructionでのmarker未読、non-autonomous stale時だけのbest-effort unlink、doctor read-only、recomposeの全mutation前拒否、6 harness/4 self-installの決定的投影が5成果物間で整合している。公開面も承認済み3 seamに限定され、新規permission、runtime dependency、service、infrastructureへのscope拡張はないため、実装へ進める状態である。
