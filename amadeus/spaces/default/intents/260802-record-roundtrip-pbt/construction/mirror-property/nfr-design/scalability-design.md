# Scalability Design — unit `mirror-property`(U7・Could)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

宣言外の追加入力(明記): 同 unit の business-rules.md(BR-MP-5 / BR-MP-10)、domain-entities.md(§3 の受理ドメイン絞り込み)。

測定 ref: **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**(FD 群の ref `c8702be09` との対象パス差分は空)。

---

## 判定: 常駐サービス向けのスケーラビリティ設計は **非適用**(N/A)

本 unit の成果物はテストファイル2つであり、常駐プロセス・リクエスト処理・共有状態を一切持たない。したがって horizontal scaling・ロードバランシング・コネクションプール・キャッシュ階層・サーキットブレーカーは適用対象を持たない(`cid:nfr-design:c1` — CLI / ライブラリの NFR 設計では常駐サービス向け機構を機械適用せず、**決定的な file 境界と fail-closed 契約へ置換する**)。

置換後の「規模」の意味は次の2軸に限定される。両軸とも本 unit の内側で完結する。

## 軸1: 生成規模(numRuns)のスケール特性

| 階層 | numRuns | 所有 | 実行時間の見立て |
| --- | --- | --- | --- |
| 既定(PR CI) | 100 | 本 unit(business-rules.md BR-MP-5 第1項) | performance-design.md §4 の**推定** 9〜22ms |
| DEEP(`AMADEUS_PBT_DEEP=1`) | 50,000 | 実行面は unit `pbt-deep-ci`。分岐の設置のみ本 unit(BR-MP-5 第4項) | 既定の 500 倍 = **推定** 4.5〜11 秒 |

スケール特性は **run 数に対して線形**である。1 run が確保するのは snapshot 1 個(receipts 0〜3 件)とその文字列表現だけで、run 間で共有・蓄積される状態が無いためである(business-logic-model.md §2 のフローに run 間の持ち越しは現れない)。したがって「numRuns を N 倍にすると時間も概ね N 倍」以上のスケーリング設計は要らない。DEEP 側の 4.5〜11 秒という推定は NFR-4 の 2 秒予算の対象外(既定経路で走らないため — performance-design.md §5)だが、DEEP ジョブの時間設計を持つ `pbt-deep-ci` へ引き継ぐ情報として記録する。**推定値であり受け入れ基準には使わない。**

## 軸2: 受理ドメイン拡張時の増分

domain-entities.md §3 は v1 の非対象(`authorization` / `createIdentity` / `warnings` / `repairChallenges` / `expectedPrompt` / `auditOutbox` / `projectSync`)を列挙し、拡張の入口を「別の arbitrary を足して `validMirrorSnapshotArb` に合成する」形に固定している。この合成構造が、規模拡張を**加算的**に保つ設計上の担保である。

- 生成器は「フィールドごとの小さな arbitrary の合成」として書き、単一の巨大なレコード生成器にしない(domain-entities.md §3「拡張の入口」)。
- したがって1フィールドの被覆追加は、既存フィールドの生成器を書き換えずに済む。逆に巨大な単一生成器にすると、拡張のたびに全フィールドの生成分布が変わり、既存の被覆が無音で劣化する。
- 規模上限は components.md U7 の **60〜90 行**(domain-entities.md §3 が転記)。v1 がこの予算内に収まるよう非対象を明示的に置いたことが、規模制御そのものである。

## 明示的に作らないもの

| 機構 | 不採用の根拠 |
| --- | --- |
| 並列テストランナー・シャーディング | 新規ランナー・新規 CI 面を作らないと business-rules.md BR-MP-10 が定める。既存 `test:ci` に自動的に載る |
| 生成結果のキャッシュ・メモ化 | 固定 seed により入力列は決定的に再生成できる(reliability-design.md §2)。キャッシュは決定性の担保を二重化するだけで、`cid:nfr-design:c3`(Git 管理資産の二重保持禁止)と同趣旨の負債になる |
| numRuns の動的調整(時間予算からの逆算) | 既定 100 は BR-MP-5 第1項の canonical 規約。動的化は再現性(同一 seed で同一 run 数)を壊す |
