上流入力(consumes 全数): requirements.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, team-practices.md

# Team Allocation — test-pyramid-rebuild(#684)

## 適用モード

`AMADEUS_OPERATING_MODE` の値に従う(team.md「Operating Modes」)。ソロモードでは1エージェントが以下の役割を工程ごとに順次担い、チームモードでは別メンバーへ役割を割り当てる。役割はいずれのモードでも**能力ではなく責務**として割り当てる(team.md「役割は…能力ではなく…作業上の帽子で割り当てる」)。

## 役割割当の原則

- **自己実装の自己レビューは禁止**(team.md role-model)。実装者と reviewer は別セッション/別サブエージェントとする
- **同一メンバーへの連続した conductor 割当を避け、レビュー能力を常に確保する**(team.md role-model)
- 本 intent の規模(3ユニット・実装 Out・record 成果物中心)に見合う **最小構成**とし、過剰な役割分化はしない

## Bolt 別役割マトリクス

| Bolt | conductor(進行・成果物起草) | builder(実装/構築作業。本 intent は設計台帳の construction だが construction フェーズの慣例役割名を踏襲) | reviewer(独立検証) |
| --- | --- | --- | --- |
| Bolt 1(U1) | 1名 | 1名(conductor と兼務可。ソロモードでは同一セッションが順次担う) | conductor/builder と異なる主体(サブエージェント委任可 — delegated-review-analysis-with-owned-verdict) |
| Bolt 2(U2) | 1名 | 1名 | Bolt 1 の reviewer と別、または輪番 |
| Bolt 3(U3) | 1名(Bolt 2 と並行のため独立) | 1名 | Bolt 2 の reviewer と別 |

**builder 数と reviewer 輪番(E-TPR-DP Q4=A、2-1)**: Bolt2・Bolt3 各1 builder(計2、上限4に余裕)+ reviewer は Bolt 間で輪番。**留保転記(e1, GoA2)**: (1)『計4/計2』はチームモード前提であり、**ソロモードでは同一セッションが順次担う**ことに帰着する(:19 と整合)。(2)輪番割付では **reviewer は自己実装 Bolt のレビューを担当しない**(role-model 既決の執行、:11 の自己レビュー禁止の輪番適用)— 輪番は自己実装回避を満たす順序でのみ組む。

## 並行実装時の builder 上限

Bolt 2・Bolt 3 を並行実行する場合、**同時にアクティブな builder は本 intent あたり最大4**(team.md「並行実装」cid:parallel-bolts)。本 intent は Bolt 2・Bolt 3 の2並行に留まり(U1 完了後の2分岐)、上限4に対し余裕がある。worktree 隔離規律(cid:code-generation:c2)を適用し、割当 worktree 外の git 操作を禁止、本線絶対パスをディスパッチプロンプトへ混入させない。

## swarm(prepare → fan-out → check → finalize)の適用

Bolt 2・Bolt 3 は construction フェーズで swarm 型の worktree 分離並行実装が既定(team.md cid:parallel-bolts)。本 intent は実装 Out(設計・台帳 materialize のみ)で swarm の対象は「成果物ファイルの並行執筆」だが、**finalize の明示クレーム(--claimed 必須、cid:swarm-finalize-claimed-required)は record 成果物の construction にも同一運用で適用する** — E-TPR-DP Q3=A(2-1、起草者推奨 B=record 専用簡略は敗)。理由: 緩和はガードに内容別の穴を作り(e3)、finalize の検証意味論は record 成果物でも同一(e4)。すなわち conductor の明示クレームを経ずに finalize しない(check の converged 記録だけでは merge しない)。記録(e1 A 受容度7): code-generation 前提の運用を record 成果物へ over-application する懸念。

## 逐次 vs 並行の判断

- Bolt 1 → Bolt 2/Bolt 3: **DAG 制約により逐次**(U2・U3 が U1 に実データ依存、unit-of-work-dependency.md:21-23)
- Bolt 2 ⇔ Bolt 3: **相互依存なしのため並行可**(unit-of-work-dependency.md:24「DAG からの除外は正当」)。編集正本の非交差は bolt-plan.md「並行可否」節に記載済み

## モデルピン

team.md「サブエージェント有効活用」に従い、高判断(設計逸脱の裁定・§13 学習選定等)を伴うサブエージェントは opus ピンを既定とする(定義の model: ピンに従う)。本 intent の reviewer サブエージェント委任時も同様。
