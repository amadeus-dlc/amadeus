# Scalability Requirements — U1 tla-externalize

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 対象規模

- U1 は単一の FormalElection モデルと設定を外部化する。並列利用者、リクエスト量、水平スケールの概念は持たない。
- `model-map.json` は選挙プロトコル実装の実在ファイル群を列挙できること。対象ファイル追加時も登録簿更新で線形に拡張できる。
- モデル追加を将来許容する場合も、各モデルは独立ファイルと独立 identity を持ち、巨大な共有埋め込み定数へ統合しない。

## 容量と成長時の判定

- 登録簿走査はエントリ数に対して O(n)、各ファイルのハッシュ計算は総バイト数に対して O(bytes) を上限とする。
- 現時点では自動 sharding、分散キャッシュ、並列ハッシュを導入しない。実測で通常 CI 予算を超える場合にだけ再評価する。
- 成長時も「外部ファイルが唯一の正」「不在・不整合は fail-closed」という `business-rules.md` の不変条件を維持する。
