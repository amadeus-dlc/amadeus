# Business Rules — leader-sync-tool(U1)

上流入力(consumes 全数): requirements, components, component-methods, services, unit-of-work, unit-of-work-story-map — 各 BR は requirements.md の AC・components.md の C 責務・component-methods.md 実証シナリオ節・services.md の外部面・unit-of-work.md 完成条件・unit-of-work-story-map.md の verb 文脈に依拠

## ルール一覧

| # | ルール | 出典 |
| --- | --- | --- |
| BR-1 | 抽出は2クラス(elections/ 全量+自クローンシャード)限定 — 他パスの混入は ExclusionViolation | ADR-3、AC-3a |
| BR-2 | memory 層はブランチ上で常に origin/main 版へ復元し、復元後も foreign-modify が残れば abort | E-PM10A、AC-3b |
| BR-3 | ブランチは origin/main 起点 `sync/leader-<UTCdate>-<seq>`、PR 作成まで(auto-merge 禁止) | ADR-1、AC-3c、C-4 |
| BR-4 | SelfCheckReport は PR 本文へ全フィールド機械転記(消費されないフィールドを持たない) | AC-3d、検証劇場 Forbidden |
| BR-5 | `SYNC_ELECTION_THRESHOLD = 10` / `SYNC_SPLIT_FILE_LIMIT = 300`(named constant、根拠 = ADR-4: 本日選挙バースト 30+件/12h の中央値運用と #1280 の531ファイル2分割相当) | ADR-4、E-LSSRA2 留保 |
| BR-6 | 落ちる実証は fix コミット後の面切替+SHA 明示復元で実施(2注入: team.md 巻き戻し・snapshot 混入) | E-GMECG 追補、実証シナリオ節 |
| BR-7 | corpus sweep は origin/main 全 elections+transient 3形(collect-wait / hold / views-only) | E-LSSRA1 e4 留保、AC-5b |
| BR-8 | `shardBasename`(M2)は packages 側 `auditShardName`(amadeus-lib.ts:2838-2846)と同一入力→同一出力であることをドリフト検知テストで固定(規則変更時にテストが赤化し同期を強制) | ADR-2 |
| BR-9 | 選挙 store へは read-only(書込はブランチ上の git 操作のみ)— tool から elections/ 配下への直接書込 API を持たない | AC-5c、C-8 |

## 委譲注記

- BR-5 の数値は実装で named constant として定義し、本表の値が唯一の canonical(実装との drift はテストで検知)。
- BR-8 の drift 検知は M2 と `auditShardName` の両実装へ同一入力群(通常 host・記号混じり host・48字超・cloneId 1〜32字)を与える同一出力 assert で実装する。
