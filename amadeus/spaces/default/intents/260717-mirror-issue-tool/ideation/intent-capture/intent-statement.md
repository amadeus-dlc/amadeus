# Intent Statement — amadeus-mirror ツール

上流入力(consumes 全数): なし(本ステージは consumes 宣言なし。入力はユーザー記述と team.md cid:intent-first-mirror-issue、PR #1159)

## Problem Statement(解決する業務問題)

intent-first 起票運用(team.md cid:intent-first-mirror-issue、PR #1159)を採用したが、ミラー Issue の作成・状態同期・クローズを手作業で行うと手間が大きく、運用が守られなくなるドリフトリスクがある。#1157 で実測されたとおり、道具がないと Issue 本文に設計詳細が蓄積し「影の仕様書」化が再発する。

## Target Customer(誰がどう得をするか)

- **一次**: この repo で amadeus ワークフローを運用する開発チーム(ソロ/チーム両モード)— 起票・同期・クローズが1コマンドになり、定型3要素の規律が構造的に守られる
- **二次**: GitHub Issues をかんばんとして見る協働開発者 — ミラーが常に最新状態を映す

## Success Metrics(成功指標)

1. intent birth からミラー Issue 起票までが1コマンドで完了する
2. ミラー本文が定型3要素(概要+record リンク+状態行)のみを保ち、設計詳細ゼロ
3. close は着地機械検査(intent 完了状態の実測)を通過した場合のみ成功する(不成立は exit 1)

## Initiative Trigger(なぜ今か)

2026-07-17 の #1157 grilling で「Issue 本文の影の仕様書化」を実測し、同日 intent-first 起票ノルム(PR #1159)をユーザー裁定で確定した。ノルムの実効性は道具の有無に依存するため、運用開始と同時にツールが必要。

## Initial Scope Signal(初期スコープ感)

- repo ローカルの小さな CLI(`scripts/`、bun 直接実行)。framework 出荷は運用安定後の別 intent
- サブコマンド3つ: create / sync / close。状態は `amadeus-runtime.ts summary --json` と intents.json から決定的に読む(LLM 側で数えない)
- 同期は record → Issue の一方向、書き込み面は Issue 本文の状態セクション
- 本 intent は ideation まで実行して park(試運転)。クロスレビューは park 時の record PR(intent birth PR)で実施
