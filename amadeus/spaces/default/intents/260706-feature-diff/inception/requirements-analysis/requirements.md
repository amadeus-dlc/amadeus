# Requirements — 260706-feature-diff（Issue #524）

## Intent 分析

上流 awslabs/aidlc-workflows の main / v2（基準 commit b67798c3）と Amadeus の三者で、機能の一致・適応・独自拡張を一望できる文書が存在しない。本 Intent は docs/amadeus に機能差一覧（英語正本 + 日本語対訳）を新設し、利用者・開発者が「上流のどの機能がどの形で入っているか」「Amadeus 独自の拡張は何か」を出典付きで確認できるようにする。

コードベース文脈（codekb）: Amadeus が上流の適応コピーである位置づけと運用モデルは [business-overview.md](../../../../codekb/amadeus/business-overview.md)、比較軸になる scope 体系・エンジン seam・audit イベント数は [architecture.md](../../../../codekb/amadeus/architecture.md)、層構成（harness/ を含む）は [code-structure.md](../../../../codekb/amadeus/code-structure.md) を実測根拠として参照した。

## 機能要求

### FR-1: 文書の新設

- FR-1.1: `docs/amadeus/upstream-feature-diff.md`（英語、正本）と `docs/amadeus/upstream-feature-diff.ja.md`（日本語対訳）を新設する（questions Q1 = A。言語方針 = #509 準拠、相互リンク規約に従う）。
- FR-1.2: 構造は比較軸ごとの H2 節 + 三者比較表（上流 main / 上流 v2 = b67798c3 / Amadeus）+ 出典列とし、冒頭に全体サマリ表を置く（questions Q2 = A。#571 ガイド章が節単位で再利用できる形）。

### FR-2: 比較軸のカバレッジ

Issue 記載の比較軸をすべて含む: ライフサイクル構造（phase / stage 集合）、scope 集合（pdm 等の独自 scope）、エンジンツール群、hooks、sensors、audit イベント、質問プロトコル（grilling 結線）、多体連携運用、validator、インストーラ、harness（codex 差分層 = #552 反映）、上流にあって Amadeus に無いもの（Adaptive Workflows の取り込み状況 = #428 の結果を反映）。

### FR-3: 出典の実測

- FR-3.1: 各比較行に出典（上流の基準 commit、parity-map.json の nameMappings / engineFileExceptions / exceptions / relocations、#428 のドリフト判断表、独自機能群の各 Issue・PR、既存 docs/amadeus 文書）を付す。
- FR-3.2: 出典の記載値は転記ではなく実測で確認する（数値・件数・path の実在照合。#534 以降の「要求記載も実測で検証する」規範）。

### FR-4: 上流 main と v2 の差の扱い

main / v2（v1/v2）の違いは要約に留め、詳細は上流リンク（https://github.com/awslabs/aidlc-workflows の各 branch）へ委ねる（Issue 記載どおり）。

### FR-5: 追従手順

基準 commit 更新時の追従手順（どこを見て何を更新するか）を 1 節にまとめ、実務詳細は各機構の文書（harness/codex/provenance.md 等）へリンクする（questions Q3 = A）。

## 非機能要求

- NFR-1（言語）: 英語正本 + 日本語対訳の同時新設。両版の意味論一致（PR に両方含める = language-policy 同期規約）。
- NFR-2（整合）: #428（2.2.0 取り込み + ドリフト 8 項目）の結果と矛盾しない。ドリフト項目は「意図的差分」として本文書に転記または参照する。
- NFR-3（検証）: validator（Intent 指定込み）と `npm run test:all` が pass する（rename-leftovers は docs も走査対象のため、旧名トークンを持ち込まない = allow 規則の範囲で上流名を記載）。加えて、内容品質の受け入れ条件（一望性・出典）は自動検査の対象外のため、build-and-test で次の決定論的チェックを実施して記録する: ①比較表の出典列に空欄行がないこと（grep / スクリプトで機械確認）②Issue 記載の比較軸がすべて H2 節として存在すること（見出し一覧の照合）③en / ja の H2 節構成が一致すること。文面の妥当性は reviewer と PR の人間レビューに依存する（docs 系 Intent の許容範囲として明示する）。

## 制約

- 変更は docs/amadeus 直下の新規 2 ファイルのみ（既存文書・コード・tooling に触れない）。
- 接触面: engineer2（lifecycle/ 英語化）・engineer5（docs/guide 新設）と非接触（ディスパッチ確認済み。#533 Q1 = A の責務分離とも整合 = ガイドは docs/guide、契約・調査は docs/amadeus）。
- PR merge は人間。draft PR ルール適用。

## 前提

- 材料は確定済み: #428 完了（2.2.0 全面取り込み + ドリフト 8 項目）、#552 完了（harness/codex）。上流構造は #552 の fresh clone 全数調査で当方が把握済み。
- 上流 main の構造は本 Intent で要約レベルの実測（tree 取得）を行う（v2 とは branch が異なるため）。

## スコープ外

- docs/guide の利用者ガイド本文（#533/#571 = engineer5）。本文書はその素材・リンク先。
- parity-map / AMADEUS.md の baselineCommit 旧値ドリフトの是正（#552 で leader へ申し送り済みの別件）。
- 上流への提案や機能追加。

## 未解決事項

- なし（文書設計の細部 3 問は questions Q1〜Q3 ですべて自己判断確定済み。gate の人間承認で確定する）。

## 受け入れ条件

Issue #524 の受け入れ条件（3 件）と、作業内容節由来の追加要件（1 件）を区別して転記する。

| 区分 | 受け入れ条件 | 対応要求 |
|---|---|---|
| Issue 受け入れ条件 | 三者の機能差が 1 文書で一望でき、各行に出典（commit、parity-map、既存文書）がある | FR-1、FR-2、FR-3 |
| Issue 受け入れ条件 | 基準 commit 更新時の追従手順が文書内に明記されている | FR-5 |
| Issue 受け入れ条件 | #428 の結果と矛盾しない | NFR-2 |
| 追加要件（Issue 作業内容 = 言語方針 #509） | 英語 *.md + 日本語 *.ja.md の対で新設する | FR-1.1、NFR-1 |
