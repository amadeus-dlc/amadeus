# Intent Capture — 明確化質問(opencode-plugins-hooks / Issue #1049)

> E-OC1 証跡(E-PM6 L1 様式): 選挙不要判定(0問)を 2026-07-16T21:00Z 頃に leader へ申告し、leader 承認 2026-07-16T21:02:46Z(agmsg 出典)。スコープ訂正(feature→amadeus、ユーザー裁定 21:02:58Z)後も承認は有効(leader 明示)。選挙対象の質問は存在しない。

上流入力(consumes 全数): Issue #1049 本文(スコープ4点・現状・ラベル見立て — クロスレビュー2名確認済み)、intent 260715-opencode-cursor-harness の application-design/decisions.md ADR-3(hooks 統合の Cursor 先行と opencode plugins 分離の裁定)、PR #1046 本文(U3 工程0 = 偽グリーン排除前例)。

## 既決照合(0問の根拠)

| 論点 | 既決の所在 |
|---|---|
| 目的・スコープ4点 | Issue #1049 本文(調査/薄い実装/偽グリーン排除/機能単位表) |
| 非目標 | ADR-3 Alternatives Rejected (a) — 全 stage 完全互換・core への harness 分岐は #626 から不変 |
| plugins 写像可否 | 質問ではなく実測対象(RE/feasibility で調査) |
| ステークホルダー | #1048 と同型(opencode 利用開発者・保守・運用) |

## 選挙対象の質問

なし(0問)。
