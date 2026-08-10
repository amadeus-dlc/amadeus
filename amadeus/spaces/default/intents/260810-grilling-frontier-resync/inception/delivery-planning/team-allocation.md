# Team Allocation — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: delivery-planning (2.8)

上流入力(consumes 全数): `bolt-plan.md` と同一の導出元 — `unit-of-work.md`(複雑度から担当モデルを選定)、`unit-of-work-dependency.md`(並行可否)、`unit-of-work-story-map.md`(スライス責務)、`requirements.md`(検証責務)、`components.md`(所有ファイル境界)。

## 割当(ソロモード)

| 役割 | 担い手 | 責務 |
|---|---|---|
| conductor | 本セッション(main agent) | 指令ループ駆動、ゲート提示、§12a/§13 の執行、Bolt 取込み(fidelity diff)、検証再実行、PR 発行・converge |
| Bolt 1 builder | Agent(worktree isolation、**opus** — 複雑度 L・骨格逐語の byte 忠実性) | U1 実装+検証、逸脱は実装前停止 |
| Bolt 2 builder | Agent(worktree isolation、**opus** — 落ちる実証・対角実測の設計判断を含む M) | U2 実装+検証 |
| Bolt 3 builder | Agent(worktree isolation、**sonnet** — 機械的語彙置換 S) | U3 実装+検証(重い検証は conductor が最後に直列実行) |
| §12a reviewer | amadeus-architecture-reviewer / product-lead(read-only、iteration ≤2) | per-unit レビュー |
| §13 投票者 | subagent-1 / subagent-2(fresh) | ステージ完了時の学習選定選挙 |
| 意思決定 | ユーザー | 全ゲート承認・仕様裁定・マージ承認(autonomy = none) |

## 割当原則

- 自己実装の自己レビュー禁止 — builder と §12a reviewer は常に別コンテキスト。
- builder ディスパッチプロンプトの必須文言: 割当 worktree 外の git 操作禁止 / 逸脱(既存様式準拠と判断する場合も)は実装前停止 / 検証は同期完遂・完了報告まで1タスク / 成果物・record への書込は禁止(record は conductor 所有)。
- FR 全文をプロンプトへ焼き込み、directive 非依存で実装開始できる形にする(c1-parallel-degrade-batch の分離運用は units ありの本 intent では不要 — per-unit ループの directive を conductor が捕捉して §12a に使う)。
