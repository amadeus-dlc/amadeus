# Scalability Design — scope-ledger (U6 / FR-6a)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

宣言外の追加入力(同 unit の FD): business-rules.md、domain-entities.md(本文で実参照)。

測定 ref: repo 内 file:line は **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**(`git rev-parse HEAD` の出力転記)の実測。

## 1. 判定: 実行時スケーラビリティは N/A(根拠付き)

本 unit は文書1件のみを生成し、実行される構成要素・常駐プロセス・受け付ける負荷を持たない(business-logic-model.md §1 実文 `本 unit は **文書1本を生成するだけの unit** であり、実行可能な振る舞い(プロダクションコード・テスト・CI)を一切持たない。`)。

cid:nfr-design:c1 のとおり、CLI・library・文書資産に対して常駐 service 向けの機構(horizontal scaling、ロードバランシング、シャーディング、コネクションプール、オートスケール)を機械的に適用しない。本 unit では代わりに**決定的な file 境界と fail-closed 契約**へ置換する — 具体的には business-logic-model.md §5 の A1〜A5(`test -f` / `grep -c` / 行数照合)と、部分受理を作らない受入契約(同 §3 `[S4]`)である。

| 関心 | 判定 | 置換した設計 |
| --- | --- | --- |
| 水平スケール / オートスケール | N/A | 実行される構成要素が無い。file 境界 A1〜A5 |
| 負荷分散 | N/A | 同上 |
| シャーディング・パーティション | N/A | 台帳は record 内に **1 件のみ**(domain-entities.md `:22` 実文 `同一性: intent record 内に台帳は **1 件のみ**存在する`) |
| 同時実行・並行制御 | N/A | 単一 unit・単一ファイルへの書込。business-rules.md `:27` BR-SL-13 のとおり他 unit と面が交差しない |
| コネクション/リソースプール | N/A | 保持するリソースが無い |
| バックプレッシャ | N/A | 流入する要求が無い |

## 2. 規模の上限が閉じていること(スケール議論が不要な理由)

本 unit の入力規模は**設計時点で閉じた定数**であり、成長するパラメータを持たない。

- 対象 Issue は **9 件ちょうど**の閉集合。domain-entities.md `:36` 実文 `取りうる値は 9 個の閉集合 {#1904, #1878, #1946, #1953, #1906, #1860, #1459, #1547, #1871}`。business-rules.md `:17` BR-SL-3 が `対象は **9件ちょうど**` かつ `行の追加・削除をしない` と定める。
- 分量は **40〜60 行**の範囲(business-rules.md `:26` BR-SL-12 の検査 `\`wc -l\` が 40〜60 の範囲`)。
- 検査手数は 5 ステップ固定(A1〜A5)。入力規模に依存しない。

すなわち、規模に対する計算量の議論(線形性・N の増加に対する挙動)は、N が定数に固定されているため成立しない。

## 3. 将来の規模拡大は本 unit の射程外(分担が確定済み)

「44 件全量への拡大」という規模拡大の唯一の現実的シナリオは、**設計時点で別 Issue へ分担済み**である。

- business-rules.md `:17` BR-SL-3 実文 `44件全量の分類は本台帳の責務ではない`、根拠列 `requirements.md \`:47\`(\`44件全量は #1979 へ\`)、\`:81\` \`44件全量の分類台帳化(#1979 へ)\``。
- business-logic-model.md §5 A4 実文 `対象外の Issue を足していない` — 検査 `表の行数 = 9(44 件全量の分類は #1979 の担当 …)`。

したがって本 unit は「9 件 → 44 件」への拡張余地を設計に織り込まない。**むしろ拡張を機械検査で禁止する**(A4)。これは容量設計の放棄ではなく、境界を明示して所有を分けた結果である。#1979 側が 44 件規模の台帳を扱う際に必要になる構造(自動生成・クエリ・分割)は、その unit の設計判断であり、本 unit の 9 行表を先回りして汎化しない(先行着地の禁止)。

## 4. 並行実装面のスケール(unit 間)

本 unit は依存を持たず、他 unit と並行に実装できる。

- business-logic-model.md §6 実文 `unit-of-work-dependency.md の YAML edge block(\`:13-14\` 実文 \`  - name: scope-ledger\` / \`    depends_on: []\`)のとおり **依存なし**。`
- 同 §6 実文 `本 unit の書込面は record 直下 1 ファイルのみで、他 unit と交差しない。`

これは実装スループット面での並行度に寄与するが、成果物側のスケーラビリティ属性ではない。

## 5. 保証の層別

| 層 | 保証 | 非保証 |
| --- | --- | --- |
| 入力規模層 | N = 9 の定数固定(§2)。増加しないことを A4 が機械検出 | 44 件規模の設計(#1979 の所有) |
| 成果物層 | 単一ファイル・行数上限あり(BR-SL-12) | ファイル数の増加に対する耐性(発生しない) |
| 検査層 | 5 ステップ固定・規模非依存 | 検査対象が変わった場合の妥当性(上流の裁定事項) |
| 実行層 | — | 該当なし(実行される構成要素が存在しない) |

## 6. 上流参照の補足

- business-logic-model.md §6 実文 `NFR-1〜NFR-5(requirements.md \`:55-59\`)のうち本 unit に掛かるのは NFR-5(既存ブロッキング集合の全緑維持 = 文書追加で壊さないこと)のみである。` — 規模関連の NFR は本 unit に掛からない。
