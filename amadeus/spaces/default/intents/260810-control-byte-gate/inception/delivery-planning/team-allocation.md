# Team Allocation — 制御バイト検出ゲート(Issue #2814)

上流入力(consumes 全数): requirements.md(TDD・レビュー要求 = 役割分担の入力)、components.md(コンポーネント規模 = 1 builder で足りる根拠)、unit-of-work.md(相対複雑度 S)、unit-of-work-dependency.md(並行化不要 = 追加 builder 不要)、unit-of-work-story-map.md(単一ジャーニー = 分担境界なし)

## 割当(ソロモード)

| 役割 | 担当 | 備考 |
|---|---|---|
| conductor | 本セッション(Fable 5) | 工程駆動・ゲート執行・検証裏取り・PR 発行 |
| builder | amadeus-builder-agent(subagent、worktree 隔離) | Bolt 1 の TDD 実装 — c1-pcp-isolated-session-swarm-incompat の isolation 経路 |
| reviewer | §12a reviewer subagent(read-only) | code-generation の per-unit レビュー(iteration 予算 2) |
| 人間 | ユーザー | walking-skeleton gate(autonomy full グラントで auto 承認可)・PR マージ承認(人間専権) |

## 能力・制約

- 同時アクティブ builder は 1(単一 Bolt — parallel-bolts 上限 4 の内側)。
- coverage 計測はブランチ単独所有(c1-coverage-single-owner)— conductor と builder の並行 coverage 実行をしない。
