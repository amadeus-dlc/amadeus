# Team Allocation — opencode / Cursor harness 対応

intent: `260715-opencode-cursor-harness`。上流入力: unit-of-work.md / unit-of-work-dependency.md(バッチ構成)/ unit-of-work-story-map.md、application-design の components.md(C1〜C5 の規模)、team-practices.md、requirements.md(検証契約)。

## 割当方針(実割当は leader のディスパッチ権限 — 本書は提案)

| batch | Bolt | builder | reviewer | 備考 |
| --- | --- | --- | --- | --- |
| 1 | Bolt 1(opencode-skeleton) | 1名(conductor=e3 が builder を兼ねるか、leader 割当の別 member) | 実装者以外1名(PR レビュー)+ conductor 検分 | 単独ゲート。ディスパッチプロンプトに「逸脱は実装前停止」「バックグラウンド待ちでターン終了しない」を明記(deviation-stop-before-implement / builder-prompt-sync-completion) |
| 2 | Bolt 2(opencode-surface)+ Bolt 3(cursor-port) | 各1名(worktree 分離、c2 隔離規律 — 本線絶対パス非混入・割当ツリー外 git 操作禁止) | 相互レビュー禁止ではないが自己実装の自己レビュー禁止(role-model) | 同時アクティブ2 ≤ 上限4。着手前に c6 実 diff 交差判定 |
| 3 | Bolt 4(verification-docs) | 1名 | 実装者以外 | U2/U3 の実測結果が入力 |

## レビュー観点の既定(independent-review-on-pr + 本 intent 固有)

完全性 grep / dist 同期 / surgical / 落ちる実証 / 実測 exit code / 無申告逸脱なし + **AC-4d core-neutrality grep** + **AC-5c 目録との第3再列挙差分** + deslop 残存。

## エスカレーション

ブロッカー・逸脱は conductor(e3)経由で leader へ(blocker-election)。マージはユーザー承認後 leader 執行(no-AI-merge)。
