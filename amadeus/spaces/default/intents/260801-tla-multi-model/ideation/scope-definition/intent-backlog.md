# Intent Backlog — 260801-tla-multi-model

上流入力(consumes 全数): `scope-document.md`

| # | 項目 | 種別 | 対応 Issue | 受け入れ条件 |
|---|---|---|---|---|
| B1 | model-map v2 へ補助モジュール identity 配列(optional)を追加 | スキーマ拡張 | #1921 | 既存4資産の identity 値不変・宣言モデルの補助モジュールがピンされる |
| B2 | EXTENDS/INSTANCE の静的推移解決 + 宣言不一致の赤化 | 検証強化 | #1921 | 宣言漏れ・過剰宣言で赤。コメント中構文の偽赤なし(落ちる実証付き) |
| B3 | MirrorLifecycle へ Core 宣言・ピン | 設定変更 | #1921 | Core 意味論編集で drift ガード赤(成功 (ii)) |
| B4 | tlc-toolchain のモデル別化(変数列・module 名・反例検証・frozen binding) | 実装 | #1920 | FormalElection 側結果・receipt 不変(成功 (iii)) |
| B5 | TLA_NAMED_INVARIANTS のモデル別化(Q1=A) | 実装 | #1920 | MirrorLifecycle の反例トレースが parse 可能 |
| B6 | loader のモデル選択方式確定 + 無引数ピン改訂 | 実装+裁定 | #1920 | モデル指定で両モデルを実行可能。ピン改訂は裁定記録付き |
| B7 | CI port / diagnostic / skeleton の --model/--cfg 引数化 | 実装 | #1920 | 全登録モデルがジョブで走る |
| B8 | CI で MirrorLifecycle AsIntended 完全探索 green | 検証 | #1920 | completion marker + state 統計付き green(成功 (i))。超過時は time-box 後続裁定 |
| B9 | 両モデルの注入 red 実証 | 検証 | #1920/#1921 | 注入で赤・除去で green を両モデルで実測 |
| B10 | stage md・テスト改訂(27 ファイル中の前提固定分) | ドキュメント/テスト | #1920 | 単一モデル前提の記述が除去され CI green |
