# Build vs Buy — installer の新ハーネス追加(installer-new-harnesses)

> ステージ: market-research (Ideation) / 作成: 2026-07-16
> 上流入力(consumes 全数): `../intent-capture/intent-statement.md`
> 方式: 前 intent 260708 の build-vs-buy(ユーザー確定: 完全自作、bun/TS、ランタイム依存ゼロ)の差分再利用。

## 判定: 前 intent 決定を継承(変更なし)

本 intent は既存自作 installer(`packages/setup`)への列挙2値追加であり、build-vs-buy の意思決定は発生しない — 前 intent のユーザー確定(完全自作)の枠内の保守作業。外部ツール導入の検討余地なし(閉じ列挙の更新に「買う」対象が存在しない)。

## 再確認

- 自作継続のコスト: 5ファイル+テスト更新(前 intent RE で全数確定済み)— 小
- 依存追加: ゼロ(Bun-only 前提の Forbidden を維持)
