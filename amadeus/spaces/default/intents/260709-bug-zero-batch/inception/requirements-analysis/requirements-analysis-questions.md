# Requirements Analysis — 明確化質問(bug-zero-batch)

> 回答方式: エージェント間選挙。判断材料は各 Issue の深掘り分析コメント(全6件に投稿済み)とクロスレビュー(1人目: claude-engineer-1 全件 CONFIRMED、2人目: #676/#668 CONFIRMED 済み)。#677/#678 は修正方式・テスト方式とも深掘り分析で一意に収束しており質問なし。以下は真に未決の設計判断のみ。

## Q1. #674 修正方式 — merge-back 失敗の unit 結果への反映

深掘り分析は A を推奨。requirements として確定する方式は?

- A. merge 失敗時に該当 unit の results を `status: "failed", reason: "error", detail: "merge-back failed: ..."` に更新し、既存の SWARM_UNIT_FAILED / SWARM_BATON_RETURNED / tally に流す(audit taxonomy 変更なし。envelope の merge_failures は互換のため残す)
- B. `reason: "merge-failed"` 等の新しい分類を追加する(状態表現は明確だが UnitResult 型・audit enum・下流 parser への波及あり)
- C. verified / merged の二段状態に再設計する(綺麗だが P1 修正として差分過大)
- X. Other

[Answer]: A — 全会一致。merge 失敗を results に反映し既存 SWARM_UNIT_FAILED/SWARM_BATON_RETURNED/tally に流す(taxonomy 変更なし、envelope の merge_failures は互換のため残す)

## Q2. #675 修正範囲 — reject の human-presence guard と委任 provenance

approve と同じ3段ガード(isAutonomousMode → humanPresenceGuardDisabled → humanActedSinceGate)を reject に配線することは深掘り分析・クロスレビューで一致。未決なのは委任トポロジーとの整合:

- A. ガード配線のみ(共通ヘルパー化推奨案どおり)。委任 reject(delegate-rejection)は本 intent のスコープ外とし、必要になったら Issue 起票(現運用では Request Changes は leader 中継の会話で伝達され、conductor は状態 reject を使わず Keep/Modify/Redo するため)
- B. ガード配線に加えて、#671 の delegate-approval と対称の delegate-rejection も同時に実装する
- X. Other

[Answer]: A — 5:1。ガード配線のみ(共通ヘルパー化)。少数派指摘の反映: 遠隔 reject が構造的に詰む対称ギャップ(delegate-rejection)を requirements に明記して Issue 起票する。共通ヘルパーは presence 機構(humanActedSinceGate = #671 委任行も認識)を参照する設計とし、将来の delegate-rejection が自動継承される形を優先

## Q3. #676 修正方式 — bolt start の pre-audit 検証

深掘り分析は A を推奨。requirements として確定する方式は?

- A. start の全経路(worktree / 非 worktree)で emitAudit 前に readStateFile(pd, flags.intent, flags.space) を必須化。既存 t33 の state なし前提 fixture は seed する形に更新(バグを固定していたテストの更新として扱う)
- B. 非 worktree 経路のみ activeIntent/recordDir の解決検査(軽いが worktree 経路と契約がズレる)
- C. emitAudit/auditFilePath 側で bare fallback への lifecycle event を拒否(audit サブシステム全体の契約変更になるため別 Issue 向き)
- X. Other

[Answer]: A — 全会一致。start 全経路で emitAudit 前に readStateFile(pd, flags.intent, flags.space) を必須化。t33 の state なし前提 fixture は seed 型へ更新(バグを固定していたテストの是正)

## Q4. #668 修正範囲 — 既存分裂ディレクトリの統合

derivation 修正(git remote 由来の repo slug 優先、remote なしのみ basename fallback)は深掘り分析・クロスレビューで一致。未決なのは既存の分裂4ディレクトリ(amadeus / installer-distribution / claude-leader / claude-engineer-1)の扱い:

- A. 本 intent で統合まで実施: 最新スキャン(claude-engineer-1、2026-07-09、6バグ重点)を正として `codekb/amadeus/` へ統合し、旧3ディレクトリは削除(git 履歴に残る)。統合の根拠(どれを正としたか)を成果物に記録
- B. derivation 修正のみ。統合は別 Issue を起票して手動判断に委ねる(それまで読み手は複数ディレクトリを見に行く必要が残る)
- X. Other

[Answer]: A — 4:2。本 intent で codekb/amadeus/ へ統合まで実施。最新スキャン(claude-engineer-1 版、claude-leader 版ベースの差分リフレッシュ)を正とし、旧3ディレクトリ(installer-distribution / claude-leader / 旧 amadeus)は削除(git 履歴で復元可能)。統合根拠を成果物に記録
