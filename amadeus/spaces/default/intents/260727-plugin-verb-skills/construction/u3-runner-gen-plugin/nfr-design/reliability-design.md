# Reliability Design — U3 u3-runner-gen-plugin

上流入力(consumes 全数): reliability-requirements.md、performance-requirements.md、security-requirements.md、scalability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計

RL-U3-1〜3(reliability-requirements.md)の実現:
- spawn 失敗 = false 戻り → failure(stage:"apply")で loud(business-logic-model.md 配線層 — spawnRecompile と同一の失敗契約、compose/drop 両側で対称)
- 冪等性: write は同一 graph → 同一出力(fixture でバイト比較ピン — tech-stack-decisions.md TS-U3-2 の integration 層)
- stock 不変: 変更前後の write dry 出力 diff+t129 実行の機械比較を完了条件に含む(security-requirements.md の入力限定が stock 出力への影響経路を構造的に閉じる)

## 検証設計

compose 済みホスト模擬 fixture(実 FS tmp)で FR-4a/4b の縦断を、graph 焼き込み判定の純関数 unit テストで識別面を、それぞれピン(performance-requirements.md / scalability-requirements.md への追加負荷なし — 既存ランナー内)。
