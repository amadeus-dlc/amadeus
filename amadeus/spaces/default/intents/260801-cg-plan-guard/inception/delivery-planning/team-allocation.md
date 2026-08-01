# Team Allocation — 260801-cg-plan-guard

上流入力(consumes 全数): unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、components.md、requirements.md

- 割当は `requirements.md` の制約(ソロモード・worktree 分離)と `unit-of-work.md` の規模見積りに基づく。`unit-of-work-dependency.md` の直列 DAG により同時アクティブ builder は常に1。`unit-of-work-story-map.md` の価値到達点を各 builder のディスパッチプロンプトの焼き込み対象とする。
- builder ディスパッチプロンプトへ焼き込むコンポーネント境界(純判定層/I-O 層)は `components.md` の2層構成を正とする。

## 割当

| 役割 | 担当 | 備考 |
|---|---|---|
| conductor | 本セッション(ソロ) | ゲート・§12a・§13・PR 収束・record 側直列処理 |
| builder(Bolt 1〜4) | worktree 分離の subagent(逐次1体) | FR 全文焼き込み・engine verb 禁止・逸脱停止・同期完遂の標準文言 |
| §12a reviewer | architecture-reviewer subagent(iteration ≤2) | scratch 併書形で回収 |
| §13 投票者 | fresh subagent 2体(auto-solo) | 選挙 CLI 指令ループ |

## Construction Autonomy Mode

Bolt 1(walking-skeleton)後のラダープロンプトでユーザーが選択(gated 想定 — 直列編成のため batch ゲートの負担は小)。
