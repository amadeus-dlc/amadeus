# Decision Log — metrics 可視化(B1 後続)

上流入力(consumes 全数): intent-statement.md, scope-document.md, intent-backlog.md, feasibility-assessment.md, constraint-register.md

## Ideation フェーズの裁定一覧

| # | 裁定 | 決定者・時刻 | 出典 |
|---|---|---|---|
| D1 | B1(可視化)を新 intent として着手。旧 intent 再開は不採用 | ユーザー 2026-07-26(セッション対話) | intent-statement.md 承認系譜 3 |
| D2 | スコープは `amadeus-feature`(project.md Scope Overrides 既決の適用) | 既決照合 | intent-statement.md スコープ信号 |
| D3 | Q1=A: `metrics/index.html` をコミット(Pages 併用は不採用 → バックログ V1) | ユーザー直接回答 2026-07-26T04:54:00Z | intent-capture-questions.md |
| D4 | Q2=C: CI 同乗+手動コマンドの両方 | ユーザー直接回答 2026-07-26T04:54:00Z | intent-capture-questions.md |
| D5 | Q3=A: 全6系列を可視化対象 | ユーザー直接回答 2026-07-26T04:54:00Z | intent-capture-questions.md |
| D6 | Q4=D: 成功基準は 1画面トレンド把握(主)+閾値強調・SHA 遡及(従) | ユーザー直接回答 2026-07-26T04:54:00Z | intent-capture-questions.md |
| D7 | feasibility 判定 GO(全123件 parse 成功・reuse inventory 成立・依存ゼロ) | conductor 実測 2026-07-26 | feasibility-assessment.md |
| D8 | チャートは自前 inline SVG(CDN・チャートライブラリ不採用) | 制約導出(C1) | constraint-register.md C1 / feasibility 前提 |
| D9 | ステージゲートは常任グラント委任(#1497 回避で phase boundary 込み 46ef0bc9 へ再発行) | ユーザー裁定 2026-07-26(AskUserQuestion) | 監査シャード GRANT_ISSUED/GRANT_REVOKED |

## 未決事項(下流ステージへの委譲)

- HTML サイズ警告の閾値数値 → requirements(raid-log R1)
- 未知コレクタの表示契約 → requirements(raid-log R2)
- CI ステップの挿入位置詳細 → construction(raid-log R3)
- 閾値強調・SHA 遡及の具体 UI → design(scope-document S2/S3)
- ミラー Issue の起票時機 → ideation 完了時点の記録として: 本 intent はセッション内でユーザーと直接対話しており、共有面の即時起票は不要。park または inception 完了の節目で要否を再判定(intent-first ノルムの枠内)
