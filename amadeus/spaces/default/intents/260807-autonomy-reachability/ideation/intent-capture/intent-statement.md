# Intent Statement — autonomy-reachability(#2378)

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない)

## Problem Statement

`--autonomy` 起動宣言(#2253)と Intent autonomy 機構(#2067)は engine 側に実装済みだが、利用者・conductor がそこへ到達する導線が欠けており、宣言と実挙動が乖離している。実測: 人間ターンの 74.1% がモード設定前に発生(2独立母集団で一致)、presence guard 拒否が多数(committed corpus で 35件/13 intents、local 全 shard で 186件/51 intents)、#2253 着地後 `--autonomy` 宣言の使用は全 shard でゼロ。加えて `SCOPE_OUT`/`MODE_REQUIRES_HUMAN` が audit に残らず「なぜ人間に落ちたか」が観測不能。

本 intent 起動時のライブ実測で追加確認した欠陥: (a) `--autonomy` は birth と同時に使えない(`--autonomy needs an active intent` エラー — 新規 intent では宣言が構造的に1手遅れる) (b) 宣言成功後も `amadeus-state.md` の `Intent Autonomy Mode` 投影が `none` のまま(canonical audit との非対称) (c) 新経路は `AUTONOMY_MODE_SET` でなく `INTENT_AUTONOMY_TRANSACTION_COMMITTED` を発行するため、旧イベント名ベースの計測では使用が観測できない。

## Target Customer

Amadeus を headless・スケジュール実行・低介入で運用する開発者。および「なぜ止まったか」を audit から診断する必要のある運用者。

## Success Metrics

Issue #2378 完了条件(クロスレビュー訂正反映後):
1. `--autonomy` 起動宣言が Ideation 最初の質問より前に mode を有効化することの実測固定(birth 同時宣言の成立を含む)
2. `SCOPE_OUT`/`MODE_REQUIRES_HUMAN` の audit 可視化+`preview-autonomy` への非裁定種別列挙
3. `decide-question` 未経由質問の観測可能化
4. 回帰計測 — ベースラインは再現可能な C1(508/178/686)・C3 値
5. `--autonomy` 導線の全面追記(SKILL.md 全ハーネス正本・utility help・README・docs)+`stage-protocol.md:135` の semi 質問手順追記+導線パリティの回帰テスト
6. advisory ルーティングは #2318 実装済み — plugin stage 文書(formal-model-check / pr-convergence)と出荷コードの drift 是正へ差し替え

## Initiative Trigger

#2253 着地(2026-08-06)後も新機構が一度も使われていない実測と、ユーザーの明示着手指示(2026-08-07)。クロスレビュー2名成立済み(`ESTABLISHED_WITH_REFINEMENTS`)。

## Initial Scope Signal

self-feature(Amadeus 自己開発の機能追加・導線是正)。engine 実装は概ね存在するため、重心は導線(docs/SKILL.md/protocol)・可観測性(audit イベント)・birth 同時宣言・回帰テスト。
