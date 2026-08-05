<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-05T17:05:00Z — reviewer i1(初回 dispatch)が verdict 未返送のまま transcript 227KB で stall(3回実測不変・nudge 無効)→ TaskStop で停止し、E-MPRRAS13 の配送形(scratch 併書)を指定した i1b を再ディスパッチ。i1b は Write 非所持(architecture-reviewer の tools は Read/Grep/Glob)のため併書は不成立だったが、最終メッセージ経路で verdict を配送(NOT-READY、BLOCKER 2件)。教訓: reviewer プロファイルに Write が無い場合、scratch 併書指示は成立しない — 配送保証は teammate message + transcript 監視の2経路で担保する。
- 2026-08-05T17:10:00Z — i1b BLOCKER 1 の是正で **cross-stage 訂正**を実施: requirements.md AC-3 の「16種(persona 8 + 組込 8)」は RE 観測タリーの「組込8」(unknown 含む)の写しで、FR-2b(unknown を警告)と自己矛盾していた。AC-3 を「15種(persona 8 + 組込 7)」+ 警告側 330(69+261)へ訂正(訂正注記・機械再計算を本文に明記)。承認済み RA 成果物への遡及編集だが、無申告ではなく訂正注記付き・センサー再発火済み(requirements-analysis ステージとして PASSED)。
- 2026-08-05T17:12:00Z — i1b BLOCKER 2 の是正: 全 ADR に Reversibility assessment を追加(ステージ契約 Step 5:116 の必須項目の記載漏れ)。FOLLOW-UP 2件も是正(ADR-3 に C10 の inline 定義と正本参照 / ADR-4・ADR-7 に第2代替案)。
- 2026-08-05T17:20:00Z — 〔E-STG-S13E 留保の履行〕Reversibility 記載漏れの機序は `cid:requirements-analysis:c2-mandated-sections-precheck`(契約の mandated sections を先に読み機械照合する)と同一で、差は照合粒度(必須節集合 = H2 レベル vs 成果物内の必須フィールド = 行レベル)のみ。選挙裁定(2-0)により独立 cid とせず、**同型欠落が1回再発したら同 cid へ『照合は節名 grep に限らず契約が宣言する必須フィールド名 grep まで及ぶ』の1行追補として昇格する予約**を残す(次回週次蒸留ラウンドでも統合可)。先例: 260717 E-SMF-RA13 c3 の条件付き不採用。

## Tradeoffs
- 2026-08-05T16:45:00Z — RA が委譲した Open questions 1〜7 を ADR-1〜ADR-7 として全数裁定した(inception ルール: 各 ADR に Alternatives Rejected を最低2案 — 出力面3案・台帳2案・model 順序2案などで充足)。最重要は ADR-3(観測値 harness > 要求値 request > 宣言値 pin、source 併記): reviewer i1 の BLOCKER が要求した「委譲された設計判断としての明示裁定」をここで実施。監査目的では観測値が要求値に優るという rationale と、source 併記による情報非損失を明記した。
- 2026-08-05T16:45:00Z — 新設モジュールを `amadeus-lib.ts` 側から import させる方向(新設が下位)に固定し循環を回避。C-6(registry)→ C-5(配線)の同一 PR 内順序制約を component-dependency に明記。
- 2026-08-05T16:45:00Z — 集計は `composeSubagentLifetimes`(休眠 seam)を採用せず COMPLETED 単独タリーの新設 CLI とした(ADR-6)。STARTED が実質0件の現状で lifetime ペアは空になるため。休眠 seam の再評価は #2303/#2297 着地後の別 intent へ。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
