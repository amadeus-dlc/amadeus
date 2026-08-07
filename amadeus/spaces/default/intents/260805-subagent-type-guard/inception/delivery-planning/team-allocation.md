# Team Allocation

**上流入力(consumes 全数)**: `unit-of-work`(U1〜U3 の責務)/ `unit-of-work-dependency`(並行可能性)/ `bolt-plan` と対で読む。`requirements`(NFR-2 の TDD / レビュー要求)/ `components`(実装座標)/ `unit-of-work-story-map`(価値の受け手)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## 実行形態

**ソロモード**(`AMADEUS_OPERATING_MODE=team` 未設定)。役割は責務として conductor が工程ごとに順次担い、実装は worktree 分離の builder subagent へ fan-out する。

| 役割 | 担い手 | 備考 |
|---|---|---|
| conductor | 本セッション(Fable 5) | 指令ループ・ゲート執行・§13・PR 管理 |
| builder(Bolt 1〜3) | worktree 分離の subagent(既定 Opus — ユーザー指示「メイン以外は基本 Opus/Sonnet」) | ディスパッチプロンプトに逸脱停止・同期完遂・engine 操作禁止を明記(c2 / builder-prompt-sync-completion / cg-subagent-state-mutation-ban) |
| §12a reviewer | `amadeus-architecture-reviewer-agent` 等の読取専用プロファイル | 配送は最終メッセージ + transcript 監視の2経路(E-STG-S13E 追補 — Write 非所持のため scratch 併書不可) |
| 承認(walking-skeleton / PR マージ) | **ユーザー** | グラント対象外(Forbidden / no-AI-merge) |

## モデル配分(本 intent の題材そのもの)

builder / reviewer / 選挙投票者は定義済み persona の model ピンまたは明示指定で起動する — ad-hoc 名・型未指定 spawn を避ける。本 intent の成果(型規律ガード)が着地すれば、この配分方針の逸脱が機械検出されるようになる。

## レビュー体制

自己実装の自己レビュー禁止(role-model)— builder が実装した Bolt の §12a は別コンテキストの reviewer subagent が担い、PR レビューは `j5ik2o-gh-pr-converge-loop` の収束後にユーザーがマージ判断する。
