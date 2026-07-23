# Decision Log — チーム機能のコア昇格(Ideation 全裁定)

> 上流入力(consumes 全数): intent-statement、scope-document、intent-backlog、feasibility-assessment、constraint-register(各裁定の出所として参照)
> 全裁定はユーザー直接回答(実 HUMAN_TURN)。選挙不実施の判定と承認アンカーは各ステージ questions ファイルのヘッダに固定(WORKFLOW_STARTED 2026-07-22T22:24:58Z)

## 運用モードの裁定

| # | 裁定 | 出所 |
|---|---|---|
| D-0a | 本 intent の判断はエージェント選挙を実施せずユーザー直接回答で確定 | ユーザー宣言(intent 起動時) |
| D-0b | 回答モード: intent-capture=Grill / feasibility=Grill / scope-definition=Grill / approval-handoff=Guide | 各ステージ Q0 |

## Intent Capture の裁定(2026-07-23)

| # | 裁定 | 出所 |
|---|---|---|
| D-1 | 目的 = チーム機能のコア昇格(機能提供が主眼)。自己開発混乱の懸念は3層構造の実在確認で払拭 | IC Q1 = X |
| D-2 | 境界ガードテスト(配布ツリー→scripts/ 参照禁止)を同一 intent で新設 | IC Q2 = A |
| D-3 | **スコープ = チーム機能一式**(起動/メッセージング/選挙/docs)。UX 逆算で確定 — 壁打ち時の「team-up.sh 非配布」裁定は失効。配布形態・外部依存の扱いは設計段で UX 起点判断 | IC Q3 = C(ユーザー逆質問起点) |
| D-4 | 成功定義 = クリーン環境 E2E | IC Q4 = A |
| D-5 | 顧客 = 主: 外部利用者 / 副: ドッグフードチーム | IC Q5 = A |
| D-6 | §13: ux-first-scope-for-distribution-intents を project.md へ persist(PR #1387 で main 着地済み) | IC §13 = A |

## Feasibility の裁定(2026-07-23)

| # | 裁定 | 出所 |
|---|---|---|
| D-7 | **herdr / agmsg は bun 同格の必須外部 prerequisite**。PATH に通って使えればよい。同梱・取り込み・抽象化はしない | F Q1 = X(ユーザー verbatim「パスが通っていて使えればよい」) |
| D-8 | サポート下限 = macOS + Linux。Windows はチーム機能対象外と docs 明記 | F Q2 = A |
| D-9 | クリーン環境 E2E は既存基盤(fake-herdr パターン+pty e2e)への組み込みで自動化。手動実証は不採用 | F Q3 = X(ユーザー却下→conductor 再実測で確定) |
| D-10 | §13: 0件(Q3 誤推奨は absence-claim-grep-verify 違反実例として PM 報告) | F §13 = A |

## Scope Definition の裁定(2026-07-23)

| # | 裁定 | 出所 |
|---|---|---|
| D-11 | Must = 最小 UX+境界ガード+E2E+docs / Should = バリエーション(E2E 保証なし)/ Won't = 同梱・テンプレ・Windows | SD Q1 = A |
| D-12 | 運用契約の公式化は docs のみ。memory シードテンプレは out | SD Q2 = A |
| D-13 | 優先順序 = dependency + risk-first(c3 既習)。proto-Unit 6件 | SD Q3 = A |
| D-14 | ハードデッドラインなし | SD サマリ確認 |
| D-15 | §13: 0件 | SD §13 = A |

## Approval & Handoff の裁定(2026-07-23)

| # | 裁定 | 出所 |
|---|---|---|
| D-16 | 残リスク(R-1 agmsg 入手経路未確定 / R-2 herdr 互換)を緩和策込みで承認し Inception へ進む | AH Q1 = A |

## 承認系譜(approval-lineage-citation 対応の索引)

本 intent はスコープ境界が intent-capture 内で拡大した(D-3)。requirements-analysis 起草時は本ログの D-3(当初壁打ち裁定 → ユーザー逆質問 → 一式へ拡大)を冒頭の承認系譜段落として引用すること。
