# Practices Evidence — election-ts-foundation

> 上流入力(consumes 全数): scan-notes.md(同日 RE codekb 代用 — practices-discovery:c1 準拠)

## 証拠スキャンの代用宣言

同日(2026-07-19T00:15:36Z 直前)実施の RE 差分リフレッシュ(base=e9a001105 / observed=c2e4975ff)が CI・テスト・コードスタイル・配布チャンネルのスキャン面をカバーしており、これを証拠として代用する(practices-discovery:c1)。affirm 済み team.md との差分ギャップのみ検討。

## 実測ポイント(RE scan-notes 由来)

- テスト: tests/ 4層(smoke/unit/integration/e2e)+Bun runner、coverage ゲート自前 — 既 affirm と一致
- リンター/型: Biome+tsc --noEmit — 既 affirm と一致
- 配布境界: canonical→dist→self-install の3層+contrib overlay(dist 非対象)の4本目 — **新知識だが規範変更ではなく機構の発見**(architecture.md へ反映済み)
- チームローカルツール規範: gh-scripts-boundary・functional-domain-modeling-ts(判別ユニオン Result)— 既 affirm と一致、本 intent の実装にそのまま適用可能

## ギャップ判定

affirm 済み team.md/project.md と本 intent の作業面(TS ツール+contrib SKILL+テスト)の間に**新規規範を要するギャップなし**。変更セクションなし = promote 不発(practices-discovery:c2、live 温存)。
