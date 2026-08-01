# Scalability Design — U3 ci-slim

上流入力(consumes 全数): business-logic-model.md(U3 FD)。nfr-requirements 5成果物は本 scope で同ステージ SKIP のため設計上不存在(consumes_absent expected:true)— requirements.md の FR-3/AC-3 と FD の照合ロジックを一次根拠に具体化する。

測定 ref = observed `da51af375`。

## スケール軸

- PR 数の増加に対し、削除後は benchmark 系ランナー消費が PR 数に比例しなくなる(daily 固定 — U2 側)— business-logic-model.md ロジック0 の一意化の効果
- ci.yml の job 数削減は workflow parse・スケジューリングの負荷も微減(副次)

## 非採用

段階的削除(job を if:false で無効化して残す)はしない — 死んだ設定の残置は検証劇場類型(cid:nfr-design:c1 の決定的境界優先)。
