# Intent Backlog — インストーラの実装

> ステージ: scope-definition (Ideation) / 作成: 2026-07-07
> 優先度付け: MoSCoW / 出典: `scope-document.md`、`../intent-capture/intent-statement.md`、`../feasibility/constraint-register.md`

## プロト Unit(候補ユニット)

依存優先の順序(Q4)に沿って並べる。正式な Unit 分割は inception の units-generation で確定する。

### Must Have

| # | プロト Unit | 内容 | 依存 |
|---|-------------|------|------|
| P1 | 共通基盤 | GitHub タグ指定アーカイブ取得、配布物マニフェスト解決、ファイル操作(コピー/所有判定)、バージョン検出 | なし |
| P2 | `init` コマンド | ハーネス選択(対話式 + 非対話フラグ)、配布物の展開、導入完了の検証・案内 | P1 |
| P3 | `upgrade` コマンド | 導入済みバージョンの検出、ファイルレベル差分レポート(適用前表示)、非破壊マージ(`amadeus-*` のみ更新)、`--force` | P1、P2(検証パスの再利用) |
| P4 | npm パッケージング & 公開整備 | `@amadeus-dlc/setup` パッケージ定義、bin `amadeus-setup`、npx/bunx 両対応ビルド、license/repository の既存不整合是正、publish 手順の明文化 | P1〜P3(成果物の同梱) |
| P5 | ドキュメント更新 | README の導入セクションをワンライナーへ置換(成功指標2)、CHANGELOG・バージョンバンプ(Mandated ルール) | P4 |

### Should Have

| # | 項目 | 備考 |
|---|------|------|
| S1 | プレフィックスなし共有ファイル(`.claude/settings.json` 等)の丁寧な取り扱い | 非破壊マージの例外リスト。requirements-analysis で仕様確定(constraint T5) |
| S2 | ネットワーク失敗時の明確なエラーメッセージとリトライ案内 | feasibility R2 の緩和策 |

### Could Have

| # | 項目 | 備考 |
|---|------|------|
| C1 | `--version` によるタグ固定インストール | feasibility R3 の緩和策。既定は最新タグ |
| C2 | 導入後のネクストステップ案内(`/amadeus` の使い始めガイド表示) | オンボーディング体験の仕上げ |

### Won't Have(今回)

| # | 項目 | 出典 |
|---|------|------|
| W1 | 組織一括展開 | Q3 |
| W2 | オフラインインストール(dist 同梱) | Q3 |
| W3 | ロールバック | Q3 |
| W4 | 既存手動導入の自動検出・マイグレーション | Q3 |
| W5 | npm provenance / CI 自動公開 | Q3 |
| W6 | doctor サブコマンド | Q1(既存 `/amadeus --doctor` と重複) |
| W7 | 内容差分(diff 表示) | Q2(ファイルレベル一覧で価値の大半を実現) |

## バリューストリーム

新規ユーザー: `bunx @amadeus-dlc/setup`(P2)→ ハーネス選択 → 1分以内に導入完了 → `/amadeus` で開発開始
既存ユーザー: `bunx @amadeus-dlc/setup upgrade`(P3)→ 差分レポート確認 → カスタマイズを失わず更新完了
