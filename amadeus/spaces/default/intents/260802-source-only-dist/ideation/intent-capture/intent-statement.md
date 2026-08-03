# Intent Statement — source-only 構成への移行と Release Asset 配布

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない。一次入力は GitHub Issue #2043 本文 = 2026-08-03 grilling 反映版・凍結済み)

## Problem Statement(解決する業務課題)

リポジトリが「正規ソース(`packages/framework/**` 544)+生成済み配布物(`dist/**` 3,846)+ルート self-install 6面(2,601)」の三層を同時追跡しており(実測 SHA `8e5dc6c4`、`git ls-files`)、次の実害が継続している。

1. ローカルの `git diff` / merge conflict が生成コピーに支配される(実例: PR #2017 は 167 ファイル中 140 = 84% が機械的投影)
2. 再生成漏れ・機械的競合が発生する(既知例: #1734 の scope-grid キー順 churn)
3. `dist:check` / `promote:self:check` が「正規ソースの検証」ではなく「コミット済みコピーとの byte 同期確認」になっている
4. リポジトリが継続的に肥大化する(ただし最大要因の `amadeus/` 83M は本 intent の対象外)

## Target Customer(誰がどう得をするか)

- **Amadeus コントリビューター**: レビュー差分が正規ソースと意図した設定変更だけに絞られ、機械的投影のノイズが消える
- **自己開発チーム(このリポジトリの日常開発者)**: 再生成漏れ・生成面の merge conflict・生成物由来の CI 赤から解放される
- **フレームワーク利用者(installer 経由)**: バージョン付き Release Asset + checksum による決定的なインストール経路を得る(codeload リポ全体 83M 超 → 単一 tar 42M)

## Success Metrics(測定可能な成果)

Issue #2043 の受け入れ条件 16 項目(G 番号参照付き)を正とする。代表指標:

- クリーン checkout から単一コマンドで全ハーネス配布物を生成でき、隔離2回生成が byte-identical
- `@amadeus-dlc/setup install --harness <name>` が Release Asset 経路(checksum 検証・fail closed)で全対応ハーネスをインストールできる。旧版は codeload フォールバックで動作
- `dist/**` と self-install 面(allowlist 除く)が Git 追跡対象に残っていない(境界ガードの落ちる実証込み)
- CI がクリーン checkout から build → 検証まで完走し、第3ガードが「compile 成功+グラフ不変量」検証として存続(自己参照化していない)
- 生成後の `git status --short` がクリーン(build は追跡ファイルを書き換えない)
- 規範衝突5点のノルム PR がマージ済み

## Initiative Trigger(なぜ今か)

- PR #2017 の実測で生成投影がレビュー差分の 84% を占めることが定量確認された
- クロスレビュー2名(CONFIRMED_WITH_REFINEMENTS)と grilling 13 裁定により、設計上の主要未決がすべて解消され着手可能な状態になった
- 代替案 #1865(Rust 全面移行)との優先関係も G13 で確定(本 intent 先行、P1/P3 維持)

## Initial Scope Signal

`self-feature`(確定)。単一 intent で完遂し、複数 Issue / 複数 intent への分割は行わない(project.md cid:intent-capture:c4-2)。並行化は Unit 設計と Construction Bolt の swarm で行う。walking skeleton は G10 のとおり「draft release への asset 付与 → installer が asset 経路で1ハーネスをインストール成功」の最小 end-to-end。

## 確定済み裁定(前提知識)

grilling 2026-08-03(13問、全問ユーザー裁定)。詳細は Issue #2043「確定済み裁定」節と本 record の質問票を参照。

| # | 裁定 |
|---|------|
| G1 | bootstrap(a): 単一ディスパッチャ方式(追跡1ファイル・不在時 no-op + build 案内。`.claude/settings.json` は追跡継続) |
| G2 | bootstrap(b): AGENTS.md は import 参照方式(追跡は手書き部+import 行のみ。build は追跡ファイル不触) |
| G3 | dist 手編集検出防御の消失は受容(伝播経路の構造的消滅を設計成果物で論証、代替ガードなし) |
| G4 | テストの dist 参照(373ファイル)は build-before-test 前提を維持(テスト本体無改修) |
| G5 | 第3ガード `compile --check` は「compile 成功+グラフ不変量」検証へ意味を再定義 |
| G6 | asset wrapper 契約は codeload 同一規約(単一トップレベルディレクトリ、locate() は2段 fallback) |
| G7 | asset / codeload 経路判定は導入バージョン定数でピン(`>=導入版` は asset 必須・fail closed) |
| G8 | allowlist 正本は packages/framework 配下のデータ1箇所+整合テスト(.gitignore / .gitattributes は手書き維持) |
| G9 | asset 粒度は全ハーネス同梱の単一 tar + checksum + manifest |
| G10 | walking skeleton は asset 公開→installer 取得の最小縦切り |
| G11 | `.agents/**` の linguist-generated 登録は先行小 PR で実施 — **完了**(PR #2057、`63e69d922` で main 着地済み) |
| G12 | Issue #2043 は凍結+状態行追記 — **完了**(intent 起動時に執行済み。以降の正本は本 record) |
| G13 | #1865(Rust 移行)より本 intent が先行、P1/P3 の現ラベル維持 |
