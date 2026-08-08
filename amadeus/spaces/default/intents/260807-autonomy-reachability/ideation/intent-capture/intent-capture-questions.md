# Intent Capture 質問票 — 260807-autonomy-reachability

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない)

## 事前裁定の適用(質問 0 件の根拠)

本 intent は Issue #2378(クロスレビュー2名成立: run `xrev-2378-20260807T110535Z`、収束 `ESTABLISHED_WITH_REFINEMENTS`)を正本とする事前整理済み intent であり、ステージ既定の明確化質問4問はいずれも既決のため、新規質問は 0 件とする(既決事項の再質問はしない)。

- **What business problem are we solving?** — 既決: Issue #2378 本文「背景・対象範囲」。`Intent Autonomy Mode: full/semi` の宣言と実挙動の乖離(到達性ギャップ)。人間ターンの 74% がモード設定前に発生(2独立母集団で 74.1% を再現)
- **Who is the customer? What pain?** — 既決: Issue #2378「影響・価値」。Amadeus を headless / 自律運用する開発者。full を宣言しても人間が張り付く必要がある
- **What does success look like?** — 既決: Issue #2378 完了条件(クロスレビュー訂正反映後の 6 点、birth 引数に逐語で固定済み)。回帰計測ベースラインは再現可能な C1(508/178/686)・C3 値へ差し替え(レビュー裁定)
- **What is the trigger?** — 既決: #2253 着地(2026-08-06)後も `--autonomy` 起動宣言が一度も使われていない実測(audit 全 shard)+ユーザーの着手指示(2026-08-07)

## 裁定の記録

- 対応着手のユーザー裁定: 2026-08-07(本セッション、Issue 指定「これを対応したい」+クロスレビュー→intent 起動の経路選択)
- Autonomy モード裁定: semi(protocol 所定質問への回答、`--autonomy semi` 起動宣言経路で記録 — `INTENT_AUTONOMY_TRANSACTION_COMMITTED` / `modeProvenance: human-command`)
- ユーザー承認: 2026-08-07T11:29:58Z(HUMAN_TURN、audit shard 実測値)
