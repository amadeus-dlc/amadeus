# セキュリティテスト手順 — 260810-plugin-harness-dir-token

Test strategy: **Comprehensive** / Depth: Minimal

## 判定: 本 intent に適用可能なセキュリティ NFR は存在しない

`<record>/inception/requirements-analysis/requirements.md` の非機能要件に、認証・認可・
機密情報・入力検証に関する要求は無い。本変更は**ローカルのファイル変換とテストのみ**で、
ネットワーク境界・認証境界・永続ストアのいずれにも触れない。

したがって SAST / DAST / 認証テスト / インジェクションテストは新規に作成しない。
**適用可能な NFR が無いことによる非作成であり、省略ではない。**

## それでも本変更に関係する既存の安全性ガード（すべて既存・非退行を確認済み）

| ガード | 何を守るか | 本変更との関係 |
|---|---|---|
| `copyRealFiles` の symlink スキップ | インストールが symlink の指す先を取り込むことを防ぐ | 本変更は `harnessDir` 引数を足しただけで、symlink スキップの分岐は無変更 |
| `t258-boundary-guard` | 出荷される core がホストに存在しない `scripts/` を参照しないこと | 本変更で追加したコメントが実際に赤を出し、修正した |
| `t377-plugin-boundary-guard` | `plugins/` から `scripts/` への参照禁止（fail-closed な空 allowlist） | 非退行を確認 |
| `t442` の import closure 制約 | 出荷 core が `scripts/` を import しないこと | この制約が core 側の変換を二実装にする理由そのもの |

## 変換による新たな攻撃面の評価

トークン置換は `{{HARNESS_DIR}}` を **manifest 由来の固定文字列**（7 種のいずれか）へ
置き換えるのみで、ユーザー入力や外部データを混ぜない。`rulesSubdirFor()` は未知の dir に対し
中立の `rules` を返す純関数で、パス脱出の余地を作らない。
置換対象は拡張子で `.md` / `.md.example` に限定され、実行可能ファイルには触れない。

**この評価は設計上の性質からの DEDUCED であり、専用のセキュリティテストによる実測ではない。**

## 将来この文書を書き換えるべき条件

plugin prose の変換が manifest 以外（環境変数・ユーザー設定・リモート値）を参照するようになったとき。
その時点で入力検証とパス脱出のテストが必要になる。
