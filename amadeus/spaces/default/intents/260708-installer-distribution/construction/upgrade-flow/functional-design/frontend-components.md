# Frontend Components — upgrade-flow(CLI 対話サーフェス)

> ステージ: functional-design (3.1) / Unit: upgrade-flow / 作成: 2026-07-08
> 出典: `../../install-flow/functional-design/frontend-components.md`(U2 の CLI サーフェスを再利用)、`../../../inception/user-stories/stories.md`(US-B1〜B5)

## 再利用と差分

対話フロー・出力レイアウト・入力バリデーションは **U2 の CLI サーフェスを再利用**する(ウィザード・確認プロンプト・レポート書式・エラー表示は同一基盤)。upgrade 固有の差分のみ以下に規定する。

## upgrade 固有の表示

| 場面 | 表示 |
|------|------|
| 差分レポート冒頭 | `UpgradeSource.strategyNote()` — 更新元分類(manifested / manual-or-unknown の保守的戦略)を明示(US-B1) |
| バージョン境界の非 proceed | already-up-to-date(現行版を明記・成功トーン)/ downgrade-unsupported(要求版と導入版を併記)/ installed-newer-than-latest(案内: `--version` での明示指定) |
| 適用承諾プロンプト | 「差分レポートの内容で更新します。よろしいですか?(y/N)」— backup 件数を強調(US-B2/B3) |
| 完了出力 | 旧版 → 新版の遷移、退避ファイル一覧(`.bk` パス)、検証結果、ネクストステップ |

## 状態と副作用の境界

- U2 と同一(ウィザードローカル状態 → `InstallInputs` 不変値、`TtyIO` ポート経由)
- upgrade は非対話でも確認なしで適用まで進む(BR-U13)— CI ログには適用前レポートが必ず残る(FR-007)
