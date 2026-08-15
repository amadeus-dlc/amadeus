# Team Allocation — intent 260815-rfc-autonomy-modes

- 運用形態: ソロモード(conductor = 本セッション)。実装は Bolt ごとに amadeus-builder-agent へ委譲(git worktree 分離、owned files 非重複)、§12a レビューは書込不可 reviewer 種別(architecture-reviewer / product-lead)。
- engine/state 変更操作(orchestrate / state / log / bolt / learnings)は conductor 専有(cid:practices-discovery:c2-engine-mutation-ban)。
- 選挙・梯子: 設計裁定は E-260815-RFC0001-DESIGN で確定済み。実装中の設計逸脱は fresh 2 voter 選挙、fail-closed のみ人間へ。
- モデル委任: 定型実装 = Sonnet、複雑・高リスク(U1/U3/U5)= Opus、統合判断 = conductor(Fable 5 温存方針)。
