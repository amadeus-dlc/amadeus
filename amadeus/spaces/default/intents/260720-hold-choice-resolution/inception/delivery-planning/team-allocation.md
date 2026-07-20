# Team Allocation — 260720-hold-choice-resolution

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md — 割当は単一 Bolt 構成(unit-of-work.md U1)と並行 intent 境界(unit-of-work-dependency.md の e4 非交差実測 — 交差面の関数一覧は components.md の非変更リスト)から、役割規律(conductor/builder/reviewer/ゲート執行)は team-practices.md の Operating Modes と役割ノルムから導出。requirements.md FR-5 の非接触面が builder への制約として引き渡される。

## 割当

| 役割 | 担当 | 備考 |
| --- | --- | --- |
| conductor | e2(本セッション) | ユーザー承認済み編成(dispatch 指示) |
| builder | developer subagent(worktree 隔離、E-TCRCGS13/E-BFACG 準拠 — plan は fork 前コミット、resume 時は worktree 明示再掲) | 単一 Bolt、並行 builder なし(parallel-bolts 上限内) |
| reviewer(stage) | 各ステージの宣言 reviewer subagent(読み取り専用・verdict 最終テキストのみ) | E-BFAADS13 文言必須 |
| reviewer(PR) | 実装者以外のメンバー(作成時に先行指名 — pr-reviewer-nomination-creator-first) | e1/e3/e4 の空き状況で指名 |
| ゲート執行 | leader(delegate/grant cabcb933) | §13 選挙後 approve |

## 並行境界

e4 バッチ(#1254/#1255/#1257)とは record.ts 無変更設計によりファイルレベル非交差(AD ADR-2)。election.ts は handleOpen(e4)/handleHoldResolved+handleRender(当方)で関数非交差 — 後着地側が再接地(base-advance-regrounding、--no-ff+完遂機械確認)。スコープ変動時は相互即時通知(autonomous-decision-immediate-report)。
