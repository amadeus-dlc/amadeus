# Team Allocation — 260807-merged-pr-convergence

上流入力(consumes 全数): `unit-of-work`(単一 Unit)、`unit-of-work-dependency`(並行度 1)、`bolt-plan`(姉妹成果物 — 実行方式)、`requirements` / `components` / `unit-of-work-story-map`(参照 — 追加割当なしの根拠)。

## 割当

| 役割 | 担当 | 備考 |
|---|---|---|
| conductor | 本セッション(ソロモード) | ループ駆動・§12a scope 発行・record 管理・PR 収束 |
| builder | Agent worktree isolation の隔離 subagent ×1 | Bolt 1 実装(TDD)。engine 操作禁止・逸脱は実装前停止を焼き込み |
| reviewer | §12a reviewer subagent(read-only) | per-unit code-generation レビュー(max iterations は directive 準拠) |
| 承認 | ユーザー(Intent Autonomy full の範囲外 = PR マージ) | stage-gate は grant 自動承認、マージのみ人間 |

## 定員と並行度

builder 1(単一 Bolt・並行化実益なし — unit-of-work の正当化どおり)。チームモードのメンバー配置・agmsg は不適用(ソロモード)。
