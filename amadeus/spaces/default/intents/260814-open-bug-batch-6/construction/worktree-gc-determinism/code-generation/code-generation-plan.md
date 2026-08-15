# Code Generation Plan — U-4 worktree-gc-determinism(#3031 / FR-4)

depth Minimal。D-4(判定分岐先行)の実行。トレース: 全 step → FR-4。

## Steps

- [x] Step 1: 一次証跡判定 — PR #3056 の retry 発火条件が CI run 31772609914 attempt 1 の観測失敗を覆うかを、attempt 1 ログの stderr 逐語と条件文字列の機械照合で判定(読取専用調査、conductor 委譲の probe で実施済み) → FR-4 (a)
- [x] Step 2: 判定 =「覆う」の場合 — 是正 0 件の根拠として一次証跡を record(primary-evidence-log.md)へ確定記録 → FR-4 (a)
- [x] Step 3: 対称面棚卸し — fixture 準備に retry なしの実 `git worktree add` を使うテストの全数列挙(検索述語併記)→ 同一リスクは修正でなく起票 → FR-4 (c)
- [x] Step 4: 棚卸し結果の起票(1 Issue、8 箇所の列挙) → FR-4 (c)
- [x] Step 5: record checkpoint の配送(PR)と report mint、code-summary 作成

## テスト方針

判定 =「覆う」のためコード・テスト変更 0 件(FR-4 (a) の分岐どおり)。時間アサーション裁定に抵触する変更なし。
