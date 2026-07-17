# Intent Statement — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): Issue #1049 本文、#626 ADR-3(application-design/decisions.md — hooks 統合の Cursor 先行裁定)、PR #1046 本文(偽グリーン排除の工程0前例)。

## 意図

opencode の plugins 機構(`.opencode/plugins/`、JS)へ amadeus core hooks を写像し、Cursor アダプタと同型の薄い hook アダプタを提供する — ADR-3 が将来 Issue として分離した opencode 側 hooks 統合の実現。

## 成功の姿

1. **写像対応表(実測)**: amadeus core hooks(audit-logger / session lifecycle / state sync / statusline 等)× opencode plugins イベントの対応可否が、opencode 公式文書・公開ソースの実測に接地した表として確定している(推測記載なし — external-seam-vocab-measurement)
2. **薄いアダプタ**: 対応可能なイベントについて `packages/framework/harness/opencode/` に Cursor 同型(adapter+lib)の薄い表層が実装され、dist/opencode へ regen されている
3. **偽グリーン排除**: payload フィールドが文書化されたイベントのみ配線 — 実測不能な面は出荷せず、根拠付きで「未対応」を維持(PR #1046 U3 工程0 前例の踏襲)
4. **機能単位表の整合**: docs の per-harness 機能表の「opencode hooks: 未対応」行が、実装済み面の解消または根拠付き維持へ更新されている

## 非目標(ADR-3 から不変)

- 全 stage の完全互換・core への harness 分岐直書き(#626 非目標の継承)
- hook による gate 強制の置換 — ゲート強制・監査整合はツール所有 emit が正、hook は補助(ADR-3 セキュリティ影響欄)

## 制約

- 逸脱は実装前停止 / E-OC1 3段 / 検証は同期完遂 / PR マージは per-PR 伺い(leader ディスパッチ 2026-07-16T20:56Z 明記)
- スコープ = amadeus(ユーザー裁定 21:02:58Z — 本リポジトリの intent birth は常に --scope amadeus)
