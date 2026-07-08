# Requirements Analysis — 質問と回答

- **Intent**: 260708-installer-distribution
- **ステージ**: requirements-analysis (2.3)
- **モード**: Grill me(グリリング — 質問は動的に1問ずつ追記される)
- **深度**: Standard(前 intent の合意済み7決定の再確認+是正事項 c4 由来の新規ギャップ)

> このファイルは意思決定の正式記録。

---

## Q1. 前回合意7決定の一括再確認(install 改名を反映)

前 intent(2026-07-07、削除済み・git 履歴に Q&A あり)でユーザーが確定した7決定。`init` は今回の `install` に読み替え:

| # | 論点 | 前回決定 |
|---|------|----------|
| 1 | プレフィックスなし共有ファイルの upgrade 時扱い | 既知の md5 と一致すれば上書き可。相違すれば `$namefile.$timestamp.bk` に退避してからコピー(`$timestamp` はインストール実行単位で同一) |
| 2 | 既定のバージョン解決 | 最新 GitHub Release / tag を取得(今回の新タグ規約 `vX.Y.Z` が対象になる) |
| 3 | `install` の既存ファイル衝突時挙動 | 対話式なら確認して続行、非対話なら中断 |
| 4 | ネットワーク失敗時 | 1回だけ自動リトライ → 失敗したら原因分類+再実行案内 |
| 5 | 非対話モードの必須引数 | `--harness` と `--target` を必須。バージョンは既定値(最新タグ) |
| 6 | 成功検証の下限 | ファイル存在検証 + `/amadeus --doctor` 相当の起動前提チェック |
| 7 | npm 公開整備の範囲 | package metadata・bin・license/repository 是正・README/CHANGELOG 更新+**publish 手順書**(CI 自動 publish は含めない) |

この7決定をそのまま requirements.md の契約として採用するか?

- A. 採用 — 7決定すべてをそのまま採用する(推奨: いずれも昨日ユーザー自身が確定した内容で、その後の変化(タグ規約新設)とも整合する)
- B. 一部修正 — 特定の決定を変更する(番号と内容を指定)
- X. Other(自由記述)

[Answer]: A. 採用 — 7決定すべてを requirements.md の契約として採用(install 読み替え)(2026-07-08、Mode: grilling)

---

## Q2. 導入済みプロジェクトで `install` を実行した場合の挙動(scope-definition からの引き継ぎ)

Q1-③(衝突時挙動)は「同名ファイルが存在する場合」の一般則だが、**Amadeus が導入済み**(バージョン検出が既存の `VERSION` ファイル等を発見)のプロジェクトで `install` が実行された場合の専用挙動を CLI 契約として固定する必要がある(scope-definition diary の Open question)。

- A. 検出したら中断し `upgrade` を案内する — `install` は「未導入前提」のコマンドとして純粋に保ち、導入済み環境の変更はすべて `upgrade`(差分レポート付き)経由に一本化する(推奨: install/upgrade の対称文法(Q4-f)と役割分担が明確になり、意図しない再インストールを防ぐ。`--force` 付き `install` のみ強制再導入を許す)
- B. 検出したら対話で「upgrade に切り替えるか」を確認する(対話式のみ。非対話は中断)
- C. Q1-③ の一般則だけで足りる(専用挙動なし)
- X. Other(自由記述)

[Answer]: A. 導入済みを検出したら `install` は中断して `upgrade` を案内。`--force` 付き `install` のみ強制再導入可(2026-07-08、Mode: grilling)

---

## Q3. `@amadeus-dlc/setup` 自身のバージョンライフサイクル(是正事項 c4)

setup パッケージの npm バージョンは framework 版(`AMADEUS_VERSION`、現 1.1.0)と**別物**として管理する必要がある(setup のバグ修正だけのリリース、framework だけの更新があり得る)。リポジトリに二重バージョンの前例はない。

- A. 独立 semver — `packages/setup/package.json` の `version` を 0.1.0 から独立運用。バンプは「setup を publish する PR」で行い、publish 手順書に記載。リポジトリの CHANGELOG/t68/`vX.Y.Z` タグは従来どおり framework 版専用とし、setup のタグは打たない(推奨: 完全分離が最も単純で、install 時のバージョン解決は「setup 版と無関係に最新 framework タグを取得」(Q1-②)と整合する)
- B. 独立 semver+setup 用タグ(`setup-vX.Y.Z`)も発行する(将来 setup のリリース履歴を VCS で追える。タグ2系統の運用負荷)
- C. framework 版と同期 — setup の version を常に `AMADEUS_VERSION` と一致させる(単純だが、setup のみの修正でも framework 版が上がってしまい t68 と衝突)
- X. Other(自由記述)

[Answer]: A(補足込みで確定)— 独立 semver(0.1.0〜)。開発中は publish せずローカル検証(`bun link` / `npm pack` tarball)。必要時のみプレリリース版(`X.Y.Z-rc.N`)+ dist-tag `next` で publish し、`latest` には安定版のみ(npm に Maven 型の可変 SNAPSHOT は存在しない旨をユーザーへ説明済み)。setup 用 git タグは打たない。バンプは publish する PR で行い手順書に記載(2026-07-08、Mode: grilling)

---

## Q4. 公開物の実ツール検証(是正事項 c4)

publish される tarball の内容(bin エントリ・ビルド済み JS・LICENSE 2種・README)が契約どおりであることを、シミュレーションではなく実ツールで検証する要件を固定する。

- A. テスト層に組み込む — `npm pack --dry-run --json`(または `bun pm pack --dry-run`)を実行し、ファイルリスト契約(bin / dist JS / LICENSE-MIT / LICENSE-APACHE / README)をアサートするテストを `tests/` の integration 層に追加し、CI で常時実行する(推奨: 「新設ゲートは落ちる実証まで」の team.md Mandated と整合し、公開直前ではなく常時ドリフトを検出できる)
- B. 手順書のチェックリストのみ — publish 手順書に `npm pack --dry-run` の目視確認を記載する(自動化なし)
- C. A+B 両方
- X. Other(自由記述)

[Answer]: A. CI テスト化 — `npm pack --dry-run` のファイルリスト契約テストを integration 層に追加し常時実行(2026-07-08、Mode: grilling)
