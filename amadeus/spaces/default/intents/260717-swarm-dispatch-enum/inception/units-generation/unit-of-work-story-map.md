# Unit of Work Story Map — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。

user-stories は本 scope で SKIP のため、価値記述は `requirements.md` Intent 分析の受益者(Construction 実行者・framework contributor)ベネフィットで代替する(先例 = `260717-mirror-issue-tool/inception/units-generation/unit-of-work-story-map.md`「user-stories ステージは本スコープ SKIP — intent-statement の成功指標を直接写像」— 実在を確認のうえ引用)。

## 価値の流れ(scope Value Stream Map の Unit 写像)

| Step(利用者価値) | Unit | 受益者が得るもの |
|---|---|---|
| 1. 値を選ぶ / 2. dispatch を決定する | U1 | 三値だけ理解すれば同じ入力から同じ結果(decision table+resolve の機械検証) |
| 3. session 内で実行する | U2 | Claude/Codex が同型の native fan-out(外部 worker 廃止)、降格・停止が予測可能 |
| 4. 収束を判定する | U1(回帰)+U2 | referee lifecycle 不変の安心(t134/t135 green) |
| 5. 結果を監査する | U1(audit)+U2(表示) | `SWARM_DEGRADED` と利用者表示の一致 — 監査から再現可能 |
| 6. 配布後も同じ挙動 | U3 | docs・dist・self-install の drift ゼロ |

## リリース単位

各 Unit = 1 Bolt = 1 PR(スカッシュ)。U1 単独では利用者可視の挙動変化なし(契約+テストの内部完結)、U2 で挙動が切り替わり、U3 で配布面が追随 — 3 Bolt 完了で Acceptance Boundary(scope)の全条件へ trace する。
