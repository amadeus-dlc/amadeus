# Pi Coding Agent対応 — Risk and Sequencing Rationale

## 採用heuristic

walking-skeleton-first + risk-first + dependency-firstのhybridを採用する。B1は`requirements`とscopeで既決のPi native extension event→canonical audit→interactive-only HUMAN_TURN→human gate→`agent_settled` continuation→RPC subagentを、fresh installからPi TUIまで横断する。その成立を人間が承認してから、transaction、distribution、doctor、guide、formal evidenceへ広げる。

数値WSJFは不採用である。business valueとtime criticalityの独立weightがなく、仮の点数は安全性と正式対応条件を既定した`team-practices`を上書きするだけだからである。LOC見積りはcapacity/riskの検知に使い、価値の代理scoreにはしない。

## リスク順序

| Risk | 早期化するBolt | Failure signal | Mitigation |
|---|---|---|---|
| R1 Pi event/presence/gate semanticsが公開surfaceで成立しない | B1 | RPC入力でHUMAN_TURN、未回答advance、duplicate continuation | captured fixture、negative journey、actual TUI gate |
| R2 RPC child lifecycleがtimeout/cancelで孤児化する | B1 | terminal欠落、kill/reap失敗、parent-child audit不整合 | handshake、deadline、AbortSignal、process fixture |
| R3 multi-file setupが部分適用や利用者file損失を起こす | B2 | injected failure後のbytes差分、未完了journal | preflight、staging、WAL、rollback、recovery |
| R4 setupとPi Packageがdriftする | B3 | normalized path/hash集合差分 | single authored projection、parity、regen guard |
| R5 unsupported/欠落環境をgreen扱いする | B4 | 0.82.x/Windows/欠落resourceがpass | typed check IDs、negative matrix、loud remediation |
| R6 guideと実装/catalogがdriftする | B5 | broken link、欠落registration、未検証claim | section/link/catalog checks、日英同期 |
| R7 formal greenがskipや環境偶然へ依存する | B6 | provider/authなし、TUI未実施、commit不明 | provenance付きskip不可evidence、macOS/Linux記録 |

## DAGとの整合

`unit-of-work-dependency`ではfoundation、lifecycle、child driver、transaction safetyがrootである。B1は経済的・安全上の理由で前者3 Unitを一つのdeployable sliceへ束ねる。B2は残るrootを閉じ、B3は4 rootの完成後、B4はB3後、B5はB4後、B6はB5後に置く。edgeを逆行するBoltは0件である。

B1の3 Unit bundlingはtopologyを変更せず、Unit ownershipを潰さない。B1だけで全正式対応を主張せず、transactional update、二重配布、詳細doctor、guide、formal evidenceを未完了と明示する。

## 規模とstop条件

全体は6,150〜9,550 LOC、B1は2,400〜3,700 LOCである。B1は全体の約39%だが、scopeで既決の最大リスク縦断に必要な3 boundaryだけを含み、transaction/distribution hardening以降を除く最小のdeployable sliceである。

各Boltで見積り上限を超える、新しい常駐service/database/専用CI workflowが必要になる、Pi private API依存が必要になる、またはdormant adapter/registration-only landingが発生する場合は、後続へ黙って持ち越さず当該Boltのgateで停止する。

## 上流トレーサビリティ

`requirements`のformal support条件、`components`の依存方向、`unit-of-work`の8 ownershipと数値見積り、`unit-of-work-dependency`のcycle-free DAG、`unit-of-work-story-map`のSCN/FR/NFR coverageから導出した。`stories`と`mockups`はscope上存在せずSCNを代替価値単位とし、`team-practices`のwalking skeleton、TDD、最大4並行、generated source-of-truthを適用した。
