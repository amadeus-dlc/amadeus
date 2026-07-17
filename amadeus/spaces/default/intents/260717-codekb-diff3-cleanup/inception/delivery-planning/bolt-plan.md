# Bolt Plan — codekb diff3 cleanup(Issue #1129)

上流入力(consumes全数): `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`。

## Plan Summary

| Field | Decision |
|---|---|
| Bolt count | 1 |
| Sequence | B001 only |
| Critical path | `B001 -> U001-codekb-hygiene-verification-handoff` |
| Heuristic | risk-first |
| Parallelism | strict sequential (parallel setなし) |
| WSJF | 不使用(比較対象1件) |
| Walking skeleton | false |
| Construction / external close | 別lifecycle |

`unit-of-work-dependency.md` の単一ノードDAGをそのまま1 Boltに包含する。`components.md` のno-topology-change境界と `team-practices.md` のbrownfield bugfixにおけるwalking skeleton skipを維持する。

## B001: CodeKB hygiene verification and handoff

| Field | Value |
|---|---|
| Included Unit | `U001-codekb-hygiene-verification-handoff` |
| Walking skeleton | No |
| Mob | `amadeus-developer-agent` |
| Deployment | embedded / non-deploying version-controlled record |
| Expected demo | 明示ref / SHA、marker / H2件数、ancestry、stage state / audit、external handoffの読み上げ |

### Definition of Done

- 対象2ファイル×4 marker語彙の行頭一致がすべて0件。
- 最新H2が各1件、`260715-opencode-cursor-harness` 履歴H2が各1件。
- fix `5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0` のancestryとcontent cleanを別verdictで記録。
- FR-1〜FR-5は5 / 5、NFR-1〜NFR-4は4 / 4でU001へtrace。
- 起票者以外の独立した2名のreview、CI green、各stageのdeclared sensors、§13、gate provenance、commit / push SHAをrecordに保持。
- `git diff --check` がPASS。main未merge、Issue #1129 OPEN、PR操作未実施を明記。
- landed mainの再計測とIssue closeはexternal handoffとし、Construction完了の事実に含めない。

### Confidence Hypothesis

B001を完了すれば、同一の明示refでCodeKBのcontent cleanを再現でき、fix lineageが未着地でもblind reapplyを避けられる。同時に、engine doneをmain landingやIssue closeと誤表示せず、未完了の外部状態を反証可能な形で残せる。

## Exit and Stop Conditions

B001のConstruction exitは、engineが指定するConstruction stagesの成果物、質問証跡、review、declared sensors、§13、gate、commit / pushがすべてgreenなことである。marker / H2不一致、ref不明、CI non-green、reviewer適格性不足はfail-closedでstopする。

external closeのexitは別である。human landing承認、main着地、landed-main再計測green、その後のIssue closeの順を守る。

## Integrated Delivery / Architecture Review

**Verdict: READY**。`unit-of-work-dependency.md` は1 Unit / 0 edge / cycle 0で、B001はDAGの唯一Unitだけを含む。topological orderからの偏差は0件。FR / NFRの孤児、孤児Unit、架空のdeployment boundaryは0件。Construction exitとexternal closeの停止条件は分離されている。
