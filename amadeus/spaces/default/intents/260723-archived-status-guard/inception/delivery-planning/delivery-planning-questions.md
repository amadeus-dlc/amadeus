# Delivery Planning Questions

Leader approval evidence: ユーザー承認 2026-07-23T07:50:59Z

Mode: guided

## Q1. Bolt sequencing heuristic

依存DAGは `status-registry → lifecycle-transaction → guard-integration` の直列です。どの経済的ヒューリスティックでBolt順序を説明しますか。

A. Hybrid: dependency-first + risk-first（推奨）
B. Walking-skeleton-first
C. Value-first
D. WSJF
X. Other (please specify)

[Answer]: A — Hybrid: dependency-first + risk-first（2026-07-23T07:45:58Z、Mode: guided）

## Q2. WSJF-style scoring

この直列DAGではスコアで順序を入れ替えられません。WSJF-styleの定量スコアを併用しますか。

A. 使用しない。依存制約とリスク根拠を明記する（推奨）
B. 参考値として等重みWSJFを併記する
C. リスク低減を2倍に重み付けしたWSJFを併記する
X. Other (please specify)

[Answer]: A — 使用しない。依存制約とリスク根拠を明記する（2026-07-23T07:46:27Z、Mode: guided）

## Q3. Bolt granularity

3 UnitをBoltへどう割り当てますか。

A. 1 Unit = 1 Bolt（推奨）
B. 3 Unitを1 Boltへ束ねる
C. Unit境界をまたぐthin sliceへ再分割する
X. Other (please specify)

[Answer]: A — 1 Unit = 1 Bolt（2026-07-23T07:46:52Z、Mode: guided）

## Q4. Construction parallelism

Unit間に独立な組がなく、共有ファイルもあります。Boltを並行実行しますか。

A. Bolt間は厳密に直列実行する（推奨）
B. 実装は直列、後続Boltの設計だけ先行並行する
C. worktreeを分けて全Boltを並行実行する
X. Other (please specify)

[Answer]: A — Bolt間は厳密に直列実行する（2026-07-23T07:47:19Z、Mode: guided）

## Q5. External dependencies

Constructionをブロックする外部API、データ提供、外部チーム承認、待ち時間はありますか。

A. なし。repository内で完結する（推奨）
B. PRレビューとマージ承認だけを外部ゲートとして扱う
X. Other — owner、lead time、blocked Bolt、workaroundを指定

[Answer]: A — なし。repository内で完結する（2026-07-23T07:47:47Z、Mode: guided）

## Q6. Earliest risk target

依存DAGを守りつつ、最も早く不確実性を潰すべきリスクはどれですか。

A. lifecycle transactionの原子性・recovery・監査冪等性（推奨）
B. status migrationとstrict validator
C. selector/next/unparkのUXと配布同期
X. Other (please specify)

[Answer]: A — lifecycle transactionの原子性・recovery・監査冪等性（2026-07-23T07:48:26Z、Mode: guided）

## Q7. Walking Skeleton

このbrownfield変更でWalking Skeletonを独立Boltとして設けますか。

A. 設けない。3つのdependency-complete Boltで進める（推奨）
B. Bolt 1を最小end-to-end sliceへ変更する
C. 3 Unitを横断するBolt 0を追加する
X. Other (please specify)

[Answer]: A — 設けない。3つのdependency-complete Boltで進める（2026-07-23T07:49:54Z、Mode: guided）

## Q8. Bolt ownership

Team FormationはSKIPされています。3 Boltの実行担当をどうしますか。

A. 全Boltをamadeus-developer-agentへ割り当てる（推奨）
B. Bolt 2だけarchitect-agentとの共同担当にする
X. Other (please specify)

[Answer]: A — 全Boltをamadeus-developer-agentへ割り当てる（2026-07-23T07:50:20Z、Mode: guided）

## Q9. Per-Bolt delivery contracts

次のUnit、Definition of Done、confidence hypothesis、expected demoでBolt計画を確定しますか。

- Bolt 1 / `status-registry`: 4値validatorと一件migration、全registry検証、配布drift 0。仮説は「status契約を一元化しても既存lifecycleを壊さずlegacy `closed`を排除できる」。デモはinvalid status拒否と対象一件だけのmigration。
- Bolt 2 / `lifecycle-transaction`: archive/unarchive、7 failure境界、同一operationId recovery、監査一件性、reader前recovery。仮説は「複数ファイル更新を公開CLIから中間不整合なしに収束できる」。デモはfailure injection後の同一operationId recovery。
- Bolt 3 / `guard-integration`: selector、stale cursor `next`、unpark拒否、utility委譲、dist/self-install同期。仮説は「すべての通常再開経路を迂回不能に閉じられる」。デモは3拒否経路とunarchive後の通常選択。

A. Approve Plan（推奨）
B. Revise Plan
X. Other (please specify)

[Answer]: A — Approve Plan（2026-07-23T07:50:59Z、Mode: guided）

## Q10. 次回へ残す学び

このステージから、今後のAI-DLC実行へ永続化する学びはありますか。

A. 追加なし（推奨）
X. Other (please specify)

[Answer]: A — 追加なし（2026-07-23T07:58:08Z、Mode: guided）
