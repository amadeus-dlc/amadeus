# Feasibility 質問（260705-github-kanban-sync）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[competitive-analysis.md](../market-research/competitive-analysis.md)、[market-trends.md](../market-research/market-trends.md)、[build-vs-buy.md](../market-research/build-vs-buy.md)

規制要件（PCI、HIPAA など）と AWS 利用は本 Intent に該当しないため、質問は技術的実現性と運用制約に絞る。
実装先はこのリポジトリ内限定（Amadeus 本体には実装しない）という制約を前提とする。

---

## Q1. Projects v2 board の設置先はどちらにしますか？

A. org project（amadeus-dlc org 配下）。複数 repo を跨げるが、org 権限の管理が要る
B. repo にリンクした org project（amadeus repo からリンクして見せる）
C. user project（j5ik2o 個人配下）
X. Other (please specify)

[Answer]: B（org project を作成し amadeus repo にリンクする。将来 target workspace が別 repo になっても跨げる）**Mode:** chat 2026-07-05T02:09:41Z

## Q2. sync が board へ載せる Intent の範囲はどれですか？

A. status が active / in-progress の Intent だけ（completed は board から archive）
B. 全 Intent（completed も Done 列に残す）
C. 直近 N 件 + 進行中（古い completed は archive）
X. Other (please specify)

[Answer]: X（全 Intent を掲載し、completed は Done 列に置き、Projects の auto-archive で古いものを整理する）**Mode:** chat 2026-07-05T02:09:41Z

## Q3. 複数ホスト（例: mac-studio と他マシン）で作業する場合、各ホストの `gh` 認証に `project` scope を付与する運用で問題ありませんか？

A. 問題ない。現在の作業ホストは実質 1 台である
B. 複数ホストで作業しており、それぞれで scope 付与を行う
C. ホストごとの認証状態が不明なので、sync 側で scope 不足を検知して分かりやすく knock out する設計にしたい
X. Other (please specify)

[Answer]: C（sync 側で project scope 不足を検知して分かりやすいエラーで knock out し、drop を記録する。ホストが増えても運用が壊れない）**Mode:** chat 2026-07-05T02:09:41Z

## Q4. hook flush の失敗（オフライン、rate limit、scope 不足）が続いた場合の扱いはどれですか？

A. drop を hooks-health に記録し、次回 flush で回復するだけでよい（通知しない）
B. A に加え、statusline など目に入る場所に「kanban 同期の遅延」を表示したい
C. A に加え、失敗が N 回続いたら明示的に警告したい
X. Other (please specify)

[Answer]: A（drop を hooks-health に記録し次回 flush で回復する。board の鮮度フィールドが遅延の可視化を兼ねる。statusline 表示は必要になったら後続）**Mode:** chat 2026-07-05T02:09:41Z

## Q5. タイムライン・優先度の制約はありますか？

A. 特になし。段階 ①〜③ を順に進めればよい
B. 早く価値を見たい。段階 ②（手動 sync で board が埋まる状態）を最優先で先行させる
C. 他 Intent との並行を優先し、本 Intent は隙間で進める
X. Other (please specify)

[Answer]: A（①→②→③ の順。② の時点で board が埋まった状態を人間が確認する。追加制約: 本仕組みは暫定であり軽量に実装する。後日本格的な仕組みへ置き換える前提）**Mode:** chat 2026-07-05T02:09:41Z
