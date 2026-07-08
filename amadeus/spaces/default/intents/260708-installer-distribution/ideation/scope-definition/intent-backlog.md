# Intent Backlog — インストーラの実装(installer-distribution)

> ステージ: scope-definition (Ideation) / 作成: 2026-07-08
> 優先度付け: MoSCoW / 出典: `scope-document.md`、`../intent-capture/intent-statement.md`、`../feasibility/constraint-register.md`(`../feasibility/feasibility-assessment.md` のリスク対応を含む)

## プロト Unit(候補ユニット)

依存優先の順序(Q3)に沿って並べる。正式な Unit 分割は inception の units-generation で確定する。

### Must Have

| # | プロト Unit | 内容 | 依存 |
|---|-------------|------|------|
| P1 | 共通基盤 | GitHub タグ指定アーカイブ取得、配布物マニフェスト解決、ファイル操作(コピー/所有判定)、バージョン検出 | なし |
| P2 | `install` コマンド | ハーネス選択(対話式 + 非対話フラグ)、配布物の展開、導入完了の検証・案内 | P1 |
| P3 | `upgrade` コマンド | 導入済みバージョンの検出、ファイルレベル差分レポート(適用前表示)、非破壊マージ(`amadeus-*` のみ更新)、`--force` | P1、P2(検証パスの再利用) |
| P4 | npm パッケージング & 公開整備 | `@amadeus-dlc/setup` パッケージ定義(`packages/setup`)、bin `amadeus-setup`、npx/bunx 両対応ビルド、license/repository の既存不整合是正、publish 手順の明文化 | P1〜P3(成果物の同梱) |
| P5 | ドキュメント更新 | README の導入セクションをワンライナー(`bunx @amadeus-dlc/setup install`)へ置換(成功指標2)、CHANGELOG・バージョンバンプ(Mandated ルール) | P4 |

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
| W1 | 組織一括展開 | Q2 |
| W2 | オフラインインストール(dist 同梱) | Q2 |
| W3 | ロールバック | Q2 |
| W4 | 既存手動導入の自動検出・マイグレーション | Q2 |
| W5 | npm provenance / CI 自動公開 | Q2 |
| W6 | `doctor` サブコマンド(既存 `/amadeus --doctor` と重複) | Q2 |
| W7 | 内容差分(diff 表示) | Q2 |
| W8 | サブコマンドなし実行での install/upgrade 自動判定(なしはヘルプ表示に固定) | Q4-f |

## バリューストリーム

- 新規ユーザー: `bunx @amadeus-dlc/setup install`(P2)→ ハーネス選択 → 1分以内に導入完了 → `/amadeus` で開発開始
- 既存ユーザー: `bunx @amadeus-dlc/setup upgrade`(P3)→ 差分レポート確認 → カスタマイズを失わず更新完了
