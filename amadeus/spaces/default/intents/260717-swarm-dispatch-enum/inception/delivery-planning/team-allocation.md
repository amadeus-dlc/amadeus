# Team Allocation — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`。

## 体制(チームモード)

- conductor: e2(本 record の現 conductor — 領域アフィニティ: 本 intent の RE〜UG を通貫)
- builder: per-unit ループを conductor が駆動(3 Unit 直列のため同時アクティブ builder は常に1 — parallel-bolts 上限4の枠内)。unit 実装は worktree 隔離の builder サブエージェントへディスパッチ(c2 規律: 本線絶対パス非混入・割当ツリー外 git 操作禁止・逸脱は実装前停止・同期完遂文言)
- reviewer: 実装者以外のメンバーへ PR ごとに依頼(independent-review-on-pr、作成者先行指名 — 自己実装の自己レビュー禁止)。レビュー観点既定+swarm 特有(検証劇場・語彙 drift・未配線 adapter)
- leader: ゲート執行(グラント f8f6b049 は stage-gates 対象 — TTL 2026-07-18T03:05Z 失効後は再発行)・PR マージ承認伺い(no-AI-merge)

## エスカレーション

実装逸脱=実装前停止→選挙(deviation-stop-before-implement、既存様式準拠と判断する場合も停止対象)。仕様変更=ユーザー(正準リスト(4))。ブロッカー=leader へ自発報告(push-reporting)。
