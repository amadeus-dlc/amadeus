# Intent Capture 質問 — metrics 可視化(B1 後続)

> 回答方式: ソロモード・ユーザー直接回答(AskUserQuestion、選挙不要 — 人間本人の裁定)。
> 承認: ユーザー直接回答 2026-07-26T04:54:00Z(全4問、いずれも推奨案を選択)

> 事前整理済みの裁定(intent-capture:c1 に基づき質問から除外):
> - 問題・トリガー: #921 論点欄「可視化の要否」→ 260712-metrics-observation intent-backlog.md B1。snapshot 123件蓄積で B1 発動条件(「蓄積してから価値が出る」)充足
> - 顧客: ユーザー(j5ik2o)本人 — コードベース健全性のトレンド観測
> - 方向性: 「静的 HTML 生成等の軽量案から検討」(B1 備考)
> - Codecov 非重複: カバレッジの時系列可視化は Codecov 既保有に委ねる(260712 build-vs-buy 既決)— ただしリポジトリ内台帳の横断表示としての coverage 数値表示は重複にあたらない
> - ランタイム: Bun 単独・外部依存ゼロ(project ノルム: 配布フレームワークへの runtime dependency 追加禁止)

## Q1. 生成物の形と置き場所は?

- A. `metrics/index.html`(または `metrics/report.html`)1ファイルをリポジトリにコミットする — self-contained HTML、git で履歴も残る
- B. 生成物はコミットせず gitignore、ローカルで都度 `bun scripts/...` を実行して開く
- C. GitHub Pages 用に `docs/` などへ出力して公開する
- D. A + C の併用(コミットしつつ Pages でも見える)
- X. その他(自由記述)

[Answer]: A(ユーザー直接回答 2026-07-26T04:54:00Z — metrics/index.html をコミット)

## Q2. 再生成のトリガーは?

- A. 既存の metrics-snapshot CI job に同乗 — snapshot 記録と同じコミットで HTML も再生成(常に最新、手作業ゼロ)
- B. 手動コマンドのみ(`bun scripts/metrics-report.ts` を見たいときに実行)
- C. A + B 両方(CI 同乗+手動もいつでも可)
- X. その他

[Answer]: C(ユーザー直接回答 2026-07-26T04:54:00Z — CI 同乗+手動の両方)

## Q3. 可視化対象のメトリクス範囲は?

- A. 全コレクタ一括 — ccn(複雑度分布)/ coverage / loc(core・scripts・tests)/ tests(件数・assertion)/ test_pyramid(層別積み上げ)/ dist_size の6系列すべて
- B. 品質系のみ(ccn / coverage / tests)に絞る
- C. まず coverage と ccn だけの最小版から
- X. その他

[Answer]: A(ユーザー直接回答 2026-07-26T04:54:00Z — 全6系列)

## Q4. 成功基準として最重要なのは?

- A. 「1画面で全系列のトレンドが把握でき、劣化(coverage 低下・CCN 増・dist 肥大)が一目で分かる」こと
- B. 特定メトリクスの閾値超過が視覚的に強調されること(ゲートの補完)
- C. commit SHA からスナップショット時点へ遡れるトレーサビリティ
- D. A を主、B・C を従として全部
- X. その他

[Answer]: D(ユーザー直接回答 2026-07-26T04:54:00Z — A 主、B・C 従)
