# Scope Definition Questions — 260807-merged-pr-convergence

上流入力(consumes 全数): `intent-statement`(`ideation/intent-capture/intent-statement.md` — 確定済み裁定 Q1〜Q3 と設計申し送りをスコープ境界の導出元として消費)。

## 質問 0 件の判定(E-OC1 様式)

本ステージの契約質問(最小スコープ / must vs nice / 依存 / シーケンス / 期限)は、いずれも既決から一意に導出される**執行**であり、真に未決の判断を含まない:

- 最小スコープ = intent-capture Q1〜Q3 の裁定(landed 事実記録型 / report+status 両検出 / checks informational)が定める capability 集合そのもの。
- must/nice = 全 capability が Q1〜Q3 と公開契約の完結に必要(sensor 語彙拡張はレビュー B 申し送りで完了条件に確定)。nice-to-have は存在しない(縮小案は Q2/Q3 で棄却済み)。
- 依存・シーケンス = self-feature の Mandated(最初の Construction Bolt に walking-skeleton gate 維持)と単一機能の凝集性から単一 Bolt が自然導出。
- 期限 = なし(Issue #2401 / P2、期限記載なし)。

判定根拠種別: 既決 contract への機械的適用(`cid:requirements-analysis:always-elect` の執行クラス)。
ユーザー承認: 2026-08-07T10:12:00Z(Intent Autonomy Mode full グラント `intent-grant-bdacfd16d77dbd4e4a59fdcf104e2fff` コミット — 実 HUMAN_TURN「full承認」由来。質問 0 件につき内容裁定の代答なし = `cid:approval-handoff:c2-grant-gates-only` と整合)

## 裁定の記録

質問 0 件(全事項が既決からの執行)。追加裁定なし。
