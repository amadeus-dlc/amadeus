# Component Methods — 260720-leader-store-sync

上流入力(consumes 全数): requirements, components, architecture, component-inventory, team-practices — 各メソッドの AC 対応は requirements.md、シャード合成規則は architecture.md 同定節、既存メソッド流用可否は component-inventory.md、様式は team-practices.md の live 層に依拠

## メソッド一覧

| # | メソッド(純関数/port) | シグネチャ要旨 | AC 対応 |
| --- | --- | --- | --- |
| M1 | `resolveOwnedSet(root, cloneShardName): OwnedSet` | elections/ 配下全 path+`intents/*/audit/<cloneShardName>` 実在集合+persist 済み norm 差分 path を決定的列挙(LLM 判断なし)。clone-id 不在は `err("clone-id-missing")`(fail-closed) | AC-3a, NFR-3 |
| M2 | `shardBasename(host, cloneId): string` | `auditShardName` と同一規則の合成(`<host48>-<12hex>.md`)。host 正規化含む純関数 | AC-3a |
| M3 | `checkExclusions(diff: FileDiff[], owned: OwnedSet): Result<void, ExclusionViolation[]>` | 所有物外の M/D 検出(全数)・memory 層パス検出・snapshot パス検出 — いずれか非空で err(E-PM10A 述語) | AC-3b |
| M4 | `restoreMemoryLayer(git: GitRunner): Result<void>` | memory/ 配下を `git checkout origin/main --` で強制復元(E-PM10A の機械実装) | AC-3b |
| M5 | `selfCheck(files, git): SelfCheckReport` | 純追加性(owned 外 A/M/D=0)・JSON parse・マーカー3語彙(行頭 `<<<<<<<`/`>>>>>>>`/`\|\|\|\|\|\|\|` — `=======` 既定除外)を構造化レポートへ | AC-3d |
| M6 | `composePr(git, gh, report): Result<PrUrl>` | main 起点ブランチ→commit→`gh pr create`(本文へ SelfCheckReport 機械転記)。gh 不在/失敗は loud err | AC-3c, AC-3d, NFR-1 |
| M7 | `syncStatus(git, store): SyncStatus` | 未同期選挙数(origin/main に無い elections dir 数)・シャード差分行数・**norm 差分行数(memory 層 vs origin/main の diff 行数 — 警告表示のみ、ADR-3)** を計測。`SYNC_ELECTION_THRESHOLD`(named constant、根拠 = 本日実測の選挙バースト数十件/時級 — E-LSSRA2 留保)超過を bool で返す | FR-2 |
| M8 | `main(argv, ports)` | verb dispatch — argv パラメータ化 export(seam-export-handler-amend、in-process 駆動) | AC-5a, NFR-2 |

## 異常系分類(error-classification)

 clone-id 不在・git/gh 実行失敗 = fault(exit 1 loud)/ 引数不正 = usage(exit 2)/ 除外違反・自己検査赤 = 検出成功の正常系出力(exit 1+構造化理由 — 検証劇場でない実測由来)。

## 完成条件の実証シナリオ(E-LSSRA1 留保 2/2 の設計反映)

- **落ちる実証(留保 e2 — AC-3b)**: integration テストで一時 workspace の sync ブランチへ (i) team.md を1コミット過去版へ巻き戻す変更 (ii) メンバー intent snapshot(`intents/<member-intent>/` 配下ファイル)を混入 — の2注入を行い、`checkExclusions`(M3)が **ExclusionViolation で赤**になることを固定する。次に `restoreMemoryLayer`(M4)適用後に (i) が解消され green へ戻る往復を実証(fix コミット後の面切替・SHA 明示復元 = E-GMECG 追補準拠)。
- **corpus sweep(留保 e4 — AC-5b)**: `selfCheck`(M5)+`checkExclusions`(M3)を origin/main の既存 elections **全量**へ適用し「正当データで赤くならない」側を実証。fixture には **transient-state(ワークフロー中間状態)**を明示的に含める: (a) collect-wait 中(ballots 部分集合・tally.json 不在) (b) hold 状態(tally は hold・record.md 未 render) (c) views のみ配布済み(ballots 0)の3形(transient-state-fixtures 準拠)。
