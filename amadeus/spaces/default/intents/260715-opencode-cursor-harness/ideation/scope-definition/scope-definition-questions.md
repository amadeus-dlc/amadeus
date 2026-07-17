# Scope Definition — 明確化質問

intent: `260715-opencode-cursor-harness`(Issue #626)
起草: 2026-07-16 / conductor e3(amadeus-product-agent ペルソナ、amadeus-delivery-agent 支援)

> **選挙不要判定(E-OC1 3段順序、[Answer] は leader 承認後に記入)**: 起草時の既決照合の結果、以下5問はすべて Issue #626 本文・承認済み上流成果物(intent-statement / feasibility-assessment / constraint-register)・実測に帰着すると判定。真に未決の設計判断は検出されず、選挙依頼はなし。
>
> 根拠種別(1問1行):
> Q1 = Issue #626 verbatim(「初期スコープ案」節)
> Q2 = Issue #626 verbatim(「受け入れ条件」=must、「非目標」=out)
> Q3 = 実測+承認済み上流(feasibility-assessment: 両 port は相互独立、共に package.ts seam へ依存)
> Q4 = 承認済み上流(feasibility-assessment「opencode は port 容易度が最も高い」+ org.md walking-skeleton 規律 — スケルトンは最小・最速の e2e スライスを選ぶ)+ leader 割当指示(3)の例示と整合
> Q5 = 実測(Issue #626 ラベル P2・期限記載なし)

## Q1: 価値を出せる最小スコープ(MVP 相当)は何か?

- A. Issue #626「初期スコープ案」verbatim: 両ハーネスとも manifest.ts 追加+onboarding/invocation surface+dist/<name>/ 生成+最小起動導線で、`--doctor` / `--version` / basic workflow start が動くところまで
- B. 全32ステージの完全互換動作まで
- C. dist 生成のみ(起動導線なし)
- D. ドキュメントのみ(実装なし)
- E. opencode のみ(Cursor は別 intent)
- X. その他

[Answer]: A

## Q2: must-have と nice-to-have の境界は?

- A. must = Issue 受け入れ条件7項(実行モデル文書化/構造準拠/dist 生成/既存回帰なし/core 中立性/最小 smoke or drift check/README 記載)。out = 非目標4項(全 stage 完全互換・core 分岐直書き・機能差の隠蔽・TAKT executor 互換)。nice-to-have = 受け入れ条件を超える追加機能(hook 相当の高度統合等)で、明示的に後続 intent へ送る
- B. 全部 must
- C. ドキュメントは nice-to-have
- D. smoke test は nice-to-have
- E. 不明
- X. その他

[Answer]: A

## Q3: capability 間の依存関係は?

- A. opencode port と Cursor port は相互に独立(異なる harness dir・異なる dist ツリー)。両者とも既存 packaging seam(package.ts の manifest 発見)と検証基盤(dist:check / promote:self:check / tests)に依存。README/harness guide 更新は両 port の実装成果に依存(最後)
- B. Cursor が opencode に依存する
- C. 両者は同一ファイルを触るため直列必須
- D. 依存なし(検証基盤も不要)
- E. 不明
- X. その他

[Answer]: A

## Q4: シーケンシング方針(risk-first / value-first / dependency-first)は?

- A. walking-skeleton 規律に従い「最小・最速で end-to-end を貫くスライス」= port 容易度が最も高い opencode の最小スライス(manifest+dist 生成+--version 導線)を Bolt 1(単独ゲート)とし、以後は独立な capability を並行化(risk-first: Cursor の hook seam 未確認リスクは RE で先行検証)
- B. Cursor を先行(利用者が多い)
- C. 両ハーネス同時に skeleton
- D. value-first で README から着手
- E. 順序に選好なし
- X. その他

[Answer]: A

## Q5: 特定 capability に紐づくハードデッドラインはあるか?

- A. なし(enhancement / P2、Issue に期限記載なし)。リリースは通常の release.yml フローに乗るだけで、本 intent 固有の締切なし
- B. 次回リリースに必須
- C. 四半期末まで
- D. 外部イベント連動
- E. 不明
- X. その他

[Answer]: A

## 回答モード記録

チームモード実行。E-OC1 の3段順序に従い、空欄起草→判定申告→leader 承認(16:31:13Z)後に記入した。矛盾検出: Q1〜Q5 の回答間に矛盾なし(Q4 の序列は Q3 の依存関係と整合)。
