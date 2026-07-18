上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

本ユニット U2 のユーザー価値は「層責務の規約を確立する — どの tier がどの size まで許容かを定め、逸脱を tier-aware に検出する設計を持つ」(unit-of-work-story-map.md の U2 段)。

# フロントエンドコンポーネント — U2 層責務仕様 + tier-aware ドリフトゲート

## 該当なし(N/A — 反証可能な不存在根拠)

本ユニット(U2 層責務仕様 + tier-aware ドリフトゲート設計、FR-2/FR-3/FR-5)は **UI を持たない設計成果物**(規約・判定 IF・ガイドライン)であり、フロントエンド/UI コンポーネントは存在しない。したがって本書の対象(画面・コンポーネント階層・状態管理・ユーザーインタラクション)は **該当しない(N/A)**。

この N/A は「未検証」でも「PASS」でもなく、**反証可能な不存在** である(project.md deployment-execution:c3 の N/A / NOT EXECUTED / PENDING / PASS 分離、observability:c3 / environment-provisioning:c3 の N/A 分離規律に倣う):

- **反証可能根拠1**: 本ユニットの成果物は 層責務規約(`allowedMaxSize` 写像、business-rules.md R1)・判定 IF 設計(`detectTierSizeViolation` / `buildTierDriftReport`、component-methods.md C3)・比率/実行時間予算ガイドライン(FR-2/FR-5)であり、レンダリングされる view・DOM・クライアント状態を一切持たない。
- **反証可能根拠2**: 対象フレームワークは利用者向けランタイムサービス・UI を持たない CLI/ツール系である(services.md「ランタイムサービスは存在しない」節、project.md「Deployment: デプロイ基盤は持たず、リリースは npm パッケージ配布と GitHub 上のタグ/PR 履歴で管理」)。
- **反証可能根拠3**: requirements.md の FR-2/FR-3/FR-5 はすべて規約・ゲート設計・ガイドラインに閉じ、UI/画面/フロントエンドの記述は一切ない。
- **反証可能根拠4**: tier-aware ドリフトゲートの提示形態は(実装される移設 intent 側で)CI ログ・exit code・ドリフトレポート成果物であって画面ではない(services.md S2「CI ジョブへ配線される想定」、既存 size ドリフトゲート `t-test-size-drift` も CI チェックであって UI ではない)。**その実装・配線すら本 intent Out**。

## 出力提示形態(UI の代替 = 設計文書 + 移設 intent の CI 提示)

UI が無い代わりに、本ユニットの利用者向け提示は次の2面である。既存 CLI 兄弟の様式に揃え、新規 UI 様式を発明しない(ui-less-mockups-as-output-contract の系列 — 出力は判定契約・レポートデータであって画面ではない):

- **本 intent の提示 = 設計文書**: 層責務規約表(business-rules.md R1)・判定フロー(business-logic-model.md)・型契約(domain-entities.md)。人間可読の規約テーブルと判定 IF 記述。
- **移設 intent の提示(Out)= CI ログ + ドリフトレポート**: 実装される tier-aware ゲートは、既存 size ドリフトゲート(`tests/unit/t-test-size-drift.test.ts`)や `coverage-project-gate.ts`(`tests/coverage-project-gate.ts`、`--check` で stderr + exit1)と同型の CLI/CI 提示様式に揃える想定。`TierDriftReport`(violations + summary、domain-entities.md D4)を機械可読レポートとして出力。**この提示の実装・配線・exit code 契約は本 intent Out**。
- **インタラクション無し**: 判定は決定的(台帳の突き合わせ、services.md S2 決定的検査)。ユーザー操作・イベントハンドラ・遷移は存在しない。
- **N/A を PASS と偽装しない**: 本書は「フロントエンド検証成功(PASS)」を主張しない。フロントエンドが **存在しないこと** を反証可能根拠付きで記録するのみ(deployment-execution:c3 の分離 — N/A ≠ PASS ≠ NOT EXECUTED)。

## 実装スコープ境界(Out 明記)

- 本ユニットに UI 実装は存在せず Out 以前に対象外。tier-aware ドリフトゲートの CI 提示(ログ・exit code・レポート出力)の **実装・配線は移設 intent**(FR-3 AC-3b、unit-of-work.md:113)。
- 将来 UI(ドリフトダッシュボード等)を作る計画も本 intent には無い。必要になれば別 intent の新規スコープとして扱う。adapter/登録スロットの先行着地はしない(N3)。
