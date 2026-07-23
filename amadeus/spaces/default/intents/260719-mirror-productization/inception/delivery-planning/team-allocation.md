# Team Allocation — 260719-mirror-productization

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

## 配置(チームモード・役割は責務)

- **conductor**: e3(本 intent のディスパッチ割当 2026-07-23)。Bolt の builder ディスパッチ・§12a 手配・ゲート執行(グラント/委任経路)
- **builder**: Bolt ごとに conductor がディスパッチ(並行時は worktree 隔離 — cid:code-generation:c2。同時アクティブ builder 上限4/intent)。Bolt 2 は U1 と非交差のため並行ディスパッチ可(c6 の非交差判定は着手前に対象ファイル目録で実測)
- **reviewer**: 実装者以外(role-model — 自己実装の自己レビュー禁止)。PR ごとに作成者が即指名(pr-reviewer-nomination-creator-first)
- **T-norm(norm PR)**: leader 執行+2名レビュー(norm-pr-provenance-reviewer: 当事者1+非当事者1)

## リソース制約

- レートリミット下では手空き許容(rate-limit-idle-allowance)— 稼働率埋めの前倒しディスパッチをしない
