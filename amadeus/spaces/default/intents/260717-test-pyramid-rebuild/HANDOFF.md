# TPR 引き継ぎパッケージ(#684、conductor → Codex パイロット)

作成: 2026-07-17、e2(engineer-2)conductor による park 時点。record push = `ffafba3f2`。

## (1) 正確な到達点(engine 状態)

- **ワークフロー = PARKED**。`Current Stage = nfr-requirements`(construction phase、per-unit ループ)。
- 直近の未完 per-unit = **U1-size-ledger の nfr-requirements**(gate:false per-unit iteration)。
- **再開手順**: `bun .claude/tools/amadeus-state.ts unpark` → `bun .claude/tools/amadeus-orchestrate.ts next`(→ run-stage nfr-requirements / unit=U1-size-ledger / gate:false が返る想定)。
- 完了済み: inception 全ステージ承認、construction の **functional-design 全3ユニット承認**(GATE_APPROVED)。
- nfr-requirements: **U1 の5成果物 drafted 済み**(performance/security/scalability/reliability/tech-stack)。U2/U3 は未着手。

## (2) 未完タスクの残量

1. **U1 nfr REVISE の解消確認**: U1 nfr reviewer が REVISE(Major=「既存コレクタと exact 一致・4層閉じ」主張が全域再帰と不一致)。**この Major は E-TPR-NR1 伝播で是正済み**(scalability/tech-stack を全域再帰・tier 開放へ書き換え)。**要: U1 nfr 5成果物へセンサー再発火(required-sections/upstream-coverage)+ U1 nfr 再レビューで REVISE→READY 確認**。
2. **nfr-requirements の残ユニット**: U2、U3(各 architect draft + センサー + reviewer)→ 全ユニット完了で gate:true → §13 → grant approve。
3. **construction 残ステージ(per-unit)**: nfr-design(U1/U2/U3)→ code-generation(U1/U2/U3)→ build-and-test 等。
4. **E-TPR-NR1 伝播の残存4箇所(要判断)**: developer が意図的に未変更として報告(タスク明示対象外):
   - `verification/phase-check-inception.md:39` — 「全数値(440/163/…)」に旧 **440** 残存(governance snapshot。442 へ更新 or 歴史値として保持を判断)。
   - `inception/requirements-analysis/requirements-analysis-questions.md` — 選挙記録(投票者が見た前提)。歴史改変回避で 14%/86%/0.7%/377 残存(**保持推奨**)。
   - `inception/ideation/{intent-capture/intent-statement.md, scope-definition/scope-document.md}` — ideation 上流・対象外、440 残存(**保持推奨**)。
5. **承認後編集の注意**: E-TPR-NR1 伝播は**承認済み**の functional-design(U1/U2/U3)・requirements・application-design 成果物を編集した(442/tier 開放)。これは裁定に沿う整合変更だが、当該ステージのセンサー再発火は未実施。Codex は必要に応じ整合を確認。

## (3) 継承制約リスト(厳守)

- **実装 Out**: 実テスト移設・run-tests.sh 実装変更・新分類器・tier-aware ゲート CI 配線・#683 CI 配線・強制ゲート化はすべて**別 intent**。本 intent は設計・計画・台帳 materialize まで。
- **#1157 実装着手禁止**(ユーザー指示、クロスレビューまで)。未接触を維持。
- **442 権威マトリクス**(measurement ref `3917a283a953165866170d235d3dc25ad2fd3643`、classifyTestSize 全域再帰スイープ実測):
  - unit 48/162/1=211・integration 9/138/0=147・e2e 3/63/2=68・smoke 0/14/0=14・**harness 0/1/0=1・lib 0/1/0=1**。総計 **442**。
  - size 総計 small **60** / medium **379** / large **3**。比率 13.6% / 85.7% / 0.68%。
  - **unit non-small = 163(不変)**、signal FS153/spawn99/net1/timer1(重複計上・単純合算不可)。
- **Tier 開放(E-TPR-NR1)**: `NamedTier = "unit"|"integration"|"e2e"|"smoke"`(tier×size 規約対象)/ `Tier = NamedTier | (string & {})`(harness/lib 等補助 tier を含む開いた型)。**規約・ゲートは NamedTier のみ、harness/lib は台帳可視・規約対象外**。
- **E-TPR-AD 裁定**: Q1=B(台帳=tests/lib 独立モジュール)/ Q2=B(smoke=integration 相当 medium)/ Q3=A / Q4=A / Q5=A。
- **E-TPR-DP 裁定**: Q1=A(Bolt 1=U1 skeleton 単独ゲート)/ Q2=A(Bolt2⇔3 並行・c6)/ **Q3=A(swarm finalize --claimed 同一運用)**/ **Q4=A(各1 builder+reviewer 輪番、自己実装 Bolt 非レビュー)**。
- **grant dc2da4b5**(stage-gates・phase-boundary 込み)は **17:11:10Z 失効**。次ゲートで失効後なら leader へ再発行合図が必要。
- **§13-before-approve**、**E-OC1 / election-answer-after-ruling**(質問 [Answer] は裁定/承認後に記入)、**diary 記入必須**(空欄で gate 通さない)。
- Bolt 順: Bolt1(U1 skeleton 単独ゲート)→ Bolt2(U2)/Bolt3(U3)並行(c6 非交差判定)。

## (4) 委任中サブエージェントの状態

- **全て完了・未回収なし**。developer(E-TPR-NR1 伝播、27ファイル)完了・commit 済み。U1 nfr reviewer(REVISE、Major 実測確認済み)完了。**in-flight のサブエージェントなし**。

## 検証済み(park 時点)

- conflict marker 0(`<<<`/`|||||||` 含む)、closed `type Tier = "unit"…` 残存 0、不変値 163/60/3 保全(grep 二重確認)、442 反映 22ファイル。record push `ffafba3f2`。
