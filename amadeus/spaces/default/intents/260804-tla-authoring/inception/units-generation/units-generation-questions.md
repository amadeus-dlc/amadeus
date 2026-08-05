# Units Generation Questions: TLA+ Model Authoring

## 回答方法

- モード: Guide me（人間回答 2026-08-04T17:05:32Z）
- 質問予算: 最大 8 件（Standard depth。follow-up 込み）。承認済み Application Design（C1〜C9、依存マトリクス、ADR-1〜ADR-7）で確定済みの事項は再質問しない。
- 実装順序の優先方針（value-first / risk-first 等）は Stage 2.8 Delivery Planning の裁定事項であり、本 stage では聞かない。

### Q0. 回答モードの選択

- A. Guide me（対話で 1 問ずつ）
- B. Grill me（1 問ずつ深掘り、推奨回答付き）
- C. I'll edit the file（このファイルを直接編集）
- D. Chat（自由に議論して抽出）

[Answer]: A. Guide me

## 質問

### Q1. Unit の境界戦略をどうしますか？

C1〜C9 を Unit of Work へ分解する切り方の選択です。`component-dependency.md` の依存マトリクスが topology の制約になります。

- A. 価値鎖スライス + 基盤分離の 6 unit（推奨）: U1 identity+evidence 基盤（C2+C4）、U2 判定+hold（C1+C9 + advisory 結線）、U3 referee 群（C3+C5）、U4 登録（C6）、U5 authoring stage 文書 + 未知題材 E2E（C7）、U6 import-closure guard + manifest 修復（C8）。独立テスト可能な粒度と並行実装の余地のバランスを取る
- B. 粗粒度 3 unit: 基盤（C2/C4）、authoring 経路（C1/C3/C5/C6/C7/C9）、配布（C8）。ゲート回数は減るが 1 unit が肥大し walking skeleton が切りにくい
- C. コンポーネント 1:1 の 9 unit。粒度は細かいが結合の強い C1/C9、C3/C5 を分けるとテスト境界が人工的になる
- X. Other (please specify)

[Answer]: A. 価値鎖スライス + 基盤分離の 6 unit（推奨）

- 人間回答: 2026-08-04T17:09:08Z（Guide me バッチ 1）

### Q2. 独立 unit 間の並行実装を許容しますか？

依存 DAG 上で独立な unit 集合の扱いです（本 stage は topology の記述のみ。順序の経済判断は 2.8）。

- A. 許容する（推奨）: DAG に並行機会を明記し、Construction の swarm 並行実装（team 既定）に委ねる
- B. 許容しない: 厳密な単一 topological order のみを記す（並行の判断を 2.8 から奪うため非推奨）
- X. Other (please specify)

[Answer]: A. 許容する（推奨）

- 人間回答: 2026-08-04T17:09:08Z（Guide me バッチ 1）

### Q3. 未知題材 E2E（FR-012 / AC-007）の fixture 題材をどれにしますか？

`FormalElection` / `MirrorLifecycle` 以外の未知題材で、要求→authoring→proof→review→承認→登録→既存 executor 実行までを実測します（decisions.md 末尾注記で本 gate の人間裁定事項と合意済み）。状態機械として実在し、まだモデル化されていない候補:

- A. swarm unit-pool ライフサイクル（推奨）: acquire → confirm-dispatch → settle-release → reconciliation の有限状態機械。語彙が閉じており（amadeus-swarm.ts）、要求文書（fixed pool protocol）も存在するため要求→invariant の trace が張りやすい
- B. audit lock の reap/steal ライフサイクル: 既知の相互排他破れ（260803-state-integrity の S1 級所見）があり、モデル化の価値は高いが、欠陥修正 intent と題材が絡むと E2E の合否が外部要因に依存する
- C. loop-monitor runtime の状態遷移: 新しく語彙は閉じているが、要求文書が intent record 側にあり trace の正本が薄い
- D. 合成 fixture（テスト専用のミニ状態機械を新造）: 外部依存ゼロだが「実在の未知題材」という FR-012 の趣旨に対して弱い
- X. Other (please specify)

[Answer]: A. swarm unit-pool ライフサイクル（推奨）

- 人間回答: 2026-08-04T17:09:08Z（Guide me バッチ 1）

## 上流トレーサビリティ

- `inception/application-design/`（components.md、component-methods.md、services.md、component-dependency.md、decisions.md）
- `inception/requirements-analysis/requirements.md`（FR-012、§9-6）
- team-practices: `memory/team.md`（parallel-bolts 既定）、`memory/project.md`、`memory/phases/inception.md`

## 計画承認

- Approve Plan（6 unit 分解計画）
- 人間承認: 2026-08-04T17:10:03Z
