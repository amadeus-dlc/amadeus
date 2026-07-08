# Application Design — 質問と回答

- **Intent**: 260708-installer-distribution
- **ステージ**: application-design (2.6)
- **モード**: Grill me(グリリング — 質問は動的に1問ずつ追記される)
- **深度**: Standard

> このファイルは意思決定の正式記録。

---

## Q1. コンポーネント分割案(packages/setup 内部モジュール)

単一パッケージ `packages/setup` の内部を、責務ごとに8モジュールへ分割する案:

| モジュール | 責務 | 主な FR |
|-----------|------|---------|
| `cli` | 引数解析・ヘルプ・サブコマンドディスパッチ・対話ウィザード・TTY 判定 | CLI Contract, FR-003, FR-011 |
| `resolver` | バージョン解決(GitHub Release/タグ一覧、SemVer 順序、プレリリース/ドラフト除外) | FR-006 |
| `fetcher` | タグアーカイブの取得+展開、1回リトライ、エラー分類 | FR-006, FR-012 |
| `planner` | install/upgrade プラン作成(ファイル分類 owned/shared/user-preserved、md5 判定、差分エントリ生成) | FR-004/005/007/008 |
| `applier` | プラン実行(コピー、`$namefile.$timestamp.bk` 退避、force 印付け) | FR-008/009 |
| `manifest` | `amadeus/.installer/amadeus-setup-manifest.json` の読み書き・スキーマ | FR-016 |
| `verifier` | 導入後検証(ファイル存在+doctor 相当) | FR-013 |
| `reporter` | 差分レポート描画・エラーメッセージ・案内文 | FR-007, FR-012 |

情報隠蔽の方針: `planner`/`applier` は「プラン=データ、適用=実行」で分離し(dry-run 可能)、`manifest` だけが永続状態(マニフェスト)を知る。深いモジュール志向で、公開 API は各モジュール数個の関数に絞る。

- A. 採用 — この8モジュール分割で進める(推奨: FR との対応が明確で、plan/apply 分離が差分レポート(FR-007)と `--force` 監査(FR-009)を自然に実現する)
- B. 修正 — 分割を変更する(統合/分割/名称、内容を指定)
- X. Other(自由記述)

[Answer]: A. 採用 — 8モジュール分割+plan/apply 分離(2026-07-08、Mode: grilling)

---

## Q2. ADR-001: promote-self.ts の抽出 vs 独立実装(OQ-003)

事実: `scripts/promote-self.ts` は278行、リポジトリルート固定(`REPO_ROOT` 導出)・管理ファイルのハードコード(`managedFiles`)・byte-diff の check モードという**このリポジトリ専用の dogfood ツール**。一方 setup の非破壊マージは「マニフェスト由来の期待 md5 判定+`$namefile.$timestamp.bk` 退避+対象プロジェクト操作」で、**変更理由が異なる**。

- A. **独立実装(参照移植)** — setup は自前の planner/applier を実装し、promote-self の実証済みパターン(walk・preserved 判定・check/apply 分離)を**コードコピーではなく設計参照**として移植する。共有モジュールは作らない(推奨: construction フェーズルール「意図ベースの重複排除 — 変更理由が異なるコードは統合しない」に合致。promote-self は repo 専用進化、setup は配布物として独立進化するため、共有すると両者の変更が互いを壊す)
- B. 共有モジュール抽出 — walk/diff/copy を共通パッケージへ抽出し、promote-self と setup の両方が依存する(単一実装だが、workspace 内結合が増え、dogfood ツールの変更が公開 CLI に波及する)
- X. Other(自由記述)

[Answer]: A. 独立実装(参照移植)— 共有モジュールは作らず、setup 自前の planner/applier を実装(2026-07-08、Mode: grilling)

---

## Q3. ADR-002: ビルド形式(OQ-002)

npx(Node)/bunx(bun)両対応(FR-002)のためのビルド形式:

- A. **`bun build` による単一ファイル ESM バンドル(target: node)** — `packages/setup/dist/cli.js` 1ファイルに全モジュールをバンドルし、shebang `#!/usr/bin/env node`、bin がこれを指す。ソースは TypeScript のまま保守(推奨: 実行時依存ゼロを最終成果物レベルで保証でき、npx の Node 実行と bunx の双方で動く。ビルドは既存の bun 前提ツールチェーンだけで完結)
- B. `tsc` によるマルチファイル JS 出力 — ディレクトリごと publish(ファイル数が増え、pack 検証(FR-018)の契約が複雑化)
- C. TypeScript のまま publish(bun 専用)— npx で動かず FR-002 違反のため不可
- X. Other(自由記述)

[Answer]: A. `bun build` による単一ファイル ESM バンドル(target: node、shebang、bin 参照)(2026-07-08、Mode: grilling)

---

## Q4. GitHub との通信方式(resolver/fetcher の外部契約)

バージョン解決とアーカイブ取得の通信方式:

- A. **GitHub REST API(認証なし)+ codeload アーカイブ URL** — `GET /repos/amadeus-dlc/amadeus/releases` と `/tags` でバージョン一覧を解決し、`codeload.github.com/amadeus-dlc/amadeus/tar.gz/refs/tags/vX.Y.Z` でアーカイブ取得(推奨: 認証不要・公開リポジトリで安定。無認証 REST の rate limit 60回/時は CLI の利用頻度なら十分で、429/403 は FR-012 のエラー分類で「しばらく待って再実行」を案内)
- B. `git ls-remote --tags` — git バイナリに依存(環境前提が増える)
- C. GitHub GraphQL API — 認証必須のため不可
- X. Other(自由記述)

[Answer]: A. GitHub REST API(認証なし)+ codeload アーカイブ URL(2026-07-08、Mode: grilling)
