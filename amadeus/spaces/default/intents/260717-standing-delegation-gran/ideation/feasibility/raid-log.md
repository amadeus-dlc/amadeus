# RAID Log — standing-delegation-grant

上流入力(consumes 全数): `../intent-capture/intent-statement.md`(成功基準1〜7・Out of Scope)

## Risks

| # | リスク | 影響 | 緩和 |
|---|---|---|---|
| R-1 | グラントの scope 逸脱で P4 が弱まる(除外ゲートへの適用) | 高 | 既定除外の構造実装(C-3)+落ちる実証「scope 外拒否」+standing-approval-scope-limit のノルム側二重防衛 |
| R-2 | TTL 比較の型不正で無言 fail-open(`now < "five"` クラス) | 高 | verification-numeric-parse(parse→比較)+型不正入力の落ちる実証を必須ケース化(C-6) |
| R-3 | 撤回の伝播遅延 — 取込前の member ツリーで撤回済みグラントが verify される時間差 | 中 | delegate と同じ結果整合モデルであることを design で明文化(FQ2)。TTL が上限を画す(無期限グラントを作らない) |
| R-4 | ソロモードへの漏出(env 未設定環境でグラントが効く) | 高 | C-2 の両側判定 fail-closed+落ちる実証「ソロでの発行・受理拒否」(ユーザー指示) |
| R-5 | 偽 provenance(グラント行の捏造) | 高 | 発行行は issuer シャード実在照合+根拠 HUMAN_TURN 実在照合(verifyDelegatedProvenance 同族)— HUMAN_TURN mint 拒否(C-4)が根を守る |

## Assumptions

- A-1: 1グラント=複数ゲート通過が停滞解消に十分(仮説 — #1125 の3波実測に基づく。着地後に運用観測)
- A-2: leader シャードの checkpoint/cherry-pick 流路は per-grant 1回の配送で足りる(per-gate 配送の消滅が効果の実体)

## Issues

- I-1: なし(起票時点のブロッカーなし — #623 canonical settings は本 intent の依存外: グラントは state verb であり設定キーを要しない)

## Dependencies

- D-1: #671 委任承認 provenance(拡張元 — 白側 sweep の基準面)
- D-2: audit-format.md のイベント taxonomy(GRANT_ISSUED/GRANT_REVOKED 追加)
- D-3: E-SDG-IC C1 採用済み(一時状態 fixture の明示包含)— 本 intent のテスト設計に適用(承認待ち窓・TTL 境界などの一時状態 fixture)
