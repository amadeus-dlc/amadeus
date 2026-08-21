# Election Record
Election ID: E-260820-FMC-CG-U4DEV
Run ID: run-1
Lifecycle: tallied
Established questions: 1
Hold questions: 0
Held question IDs: none

## Question q-u4-deviations: code-generation U4 applicability-arms(#3186、worktree commit 8c74522f3)の builder が実質的逸脱1件 + 機械的適応3件を申告し停止・報告した。【D1(実質)】FD の vocabularyDrift 発火述語の文字どおりの形『|C∩S|≥2 ∧ C⊄S』は、FD 自身の両側受け入れ条件(FormalElection/MirrorLifecycle の governed 面で発火しない)と矛盾する偽陽性を実測した — MirrorLifecycle の governed ソースの MirrorProjectSyncState が Statuses と2リテラル共有、MirrorOperation が NonCloseOps の上位集合で発火する。builder は狭義に強い述語(S = モデルの宣言済み文字列語彙全体、クラスタがサイズ≥2 の宣言済み値集合を**完全被覆**するときのみ発火)へ精緻化 — この形の発火はすべて FD 形も満たし(単調な強化)、FD の陽例2件(PrConvergenceGate/BoltPrAttestationGate の landed クラスタ)は発火維持、陰例2件は非発火(MirrorLifecycle は非空虚な陰例、FormalElection は値集合ゼロの空虚な陰例と明示 assert)。代替案(auxiliaries を無視して model .tla のみ読む)は FD 文字どおりを満たすが両陰例を空虚化するため不採用。【機械的適応】(a) tier-(i) テストは実 corpus をディスクから読むため medium 分類となり cid:code-generation:c2-doctor-seam に従い tests/integration/ へ配置(FD の『述語レベル』の意味論は不変)(b) 新モジュール tla-applicability-arms.ts の plugin.json tools[] 宣言(t3078 の機械強制)(c) model-map 宣言パスの解決基点を map の正準位置から導出(strict スキーマが絶対パスを禁じるための実装詳細、新 CLI フラグなし)。提案: D1 を承認済み改訂として追認(FD の受け入れ条件どうしの矛盾を実測で解消する唯一の非空虚な形)+ 機械的適応3件も追認(選択肢1)。
Established: D1 精緻化 + 機械的適応3件を追認 (choice 1)
Choice counts:
- Choice 1 D1 精緻化 + 機械的適応3件を追認: 2
- Choice 2 D1 差し戻し(FD 文字どおり + 陰例の再設計): 0
- Choice 3 全件差し戻し: 0
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x1 3x1 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-20T22:45:00Z] GoA 3: (a) FD の落ちる実証節が MirrorLifecycle/FormalElection の非発火を同一述語レベルで要求することは既存 FD 条項であり builder の発明でないことを確認済み。(b) 文字どおりの述語の自己矛盾は実ファイルから独立再導出済み: MirrorLifecycleCore.tla の Statuses(7 literals)/ NonCloseOps={create,sync} に対し、governed の amadeus-mirror-types.ts の MirrorProjectSyncState={synced,pending,safety-blocked}(∩=2・非包含)と MirrorOperation={create,sync,close}(⊇NonCloseOps・∩=2・非包含)が両方とも FD 文字形を発火させる。(c) 追認の条件として、FD 本文を次回改訂サイクルで精緻化述語(S = モデル全宣言語彙・サイズ≥2 の宣言済み値集合の完全被覆条件)へ明文修正すること — 現行本文は弱い per-set 形のままで将来の読者を誤導する。
- Reservation subagent-2 [original:2026-08-20T22:45:00Z] GoA 2: 一次資料から敵対的に再導出して全主張を確認。(1) 偽陽性は実在(MirrorLifecycleCore.tla:205-206 Statuses 7 lits × amadeus-mirror-types.ts:352 MirrorProjectSyncState ∩=2 非包含、:15 MirrorOperation × Core.tla:535 NonCloseOps ∩=2 非包含 — いずれも FD 文字形を発火)。(2) 実装の精緻化述語(tla-applicability-arms.ts:120-163)は builder 要約より精密な2部構成 — 宣言済み集合 S(|S|≥2)の完全被覆 AND モデル全語彙に不在のリテラル≥1 — 後者が MirrorOperation==Operations 型の完全一致ケースを新偽陽性にしない要石であり、builder の一行要約はこれを省略していたが設計は健全。単調強化の証明成立: 被覆⇒C∩S=S(≥2)、unknown リテラル⇒C⊄S。(3) 陽例2件の発火維持・(4) FormalElection 空虚陰例の明示 assert(t3186:99-103)・(5) 矛盾が承認済み FD 内部のものであること(business-logic-model.md:26,:9)を確認。未検証残余: 落ちる実証の red→green 再実行、model-map パス解決と t3078 強制の深部監査(低リスクの機械項目)。
Late responses:
- None
Run lineage: run-1

## Timeline
- tallied at=2026-08-20T22:45:54Z run=run-1