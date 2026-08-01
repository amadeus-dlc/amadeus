# RAID Log — 260801-tla-multi-model

上流入力(consumes 全数): `feasibility-assessment.md`、`constraint-register.md`

## Risks

- R1: CI 完全探索の時間超過(208k states)。発生確率 中 / 影響 中 → FE Q1 で方針裁定、設計段で実測上限を確認
- R2: 推移解決の偽赤(コメント・文字列中の構文誤検出)。確率 低〜中 / 影響 中 → 抽出規則の固定 + 偽赤の落ちる実証テスト
- R3: モデル別 invariant 集合の供給方式の設計誤りで FormalElection 側 receipt が変わる。確率 低 / 影響 高 → 成功3点 (iii) の pin テスト

## Assumptions

- A1: CI runner の docker + tla2tools toolchain は MirrorLifecycle 探索にもそのまま使える(u7 ローカル実測と同一 jar)
- A2: AsImplemented / Vacuity 変種は恒常ジョブ外のまま(一度限り実証用、#1921 本文どおり) — 本 intent の対象は AsIntended(MirrorLifecycle.cfg)
- A3: 第3モデルの追加は本 intent のスコープ外(スキーマは複数対応にするが、追加モデルの登録は行わない)

## Issues

- I1: #1921(ESTABLISHED)— Core 未ピンの drift 空洞化。本 intent で解消
- I2: #1920(ESTABLISHED_WITH_REFINEMENTS)— TLC 実行の単一モデル固定。本 intent で解消。留保: verdict の「TLC 実走未実施」は実装段で閉じる

## Dependencies

- D1: model-map v2 スキーマと loader(plugins/formal-model-check/tools/) — 変更の正本
- D2: CI ジョブ配線(.github/workflows/ci.yml の formal-model-check) — 起動契約
- D3: u7 の実測記録(208628/89099/depth 18、e2e-evidence.md) — AC の基準値
