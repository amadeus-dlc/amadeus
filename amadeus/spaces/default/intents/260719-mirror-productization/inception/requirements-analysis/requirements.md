# Requirements — 260719-mirror-productization

上流入力(consumes 全数): intent-statement.md、scope-document.md、business-overview.md、architecture.md、code-structure.md、team-practices.md

**承認系譜(スコープ境界の変遷 — 申告、cid:approval-lineage-citation)**: 本 intent は 2026-07-19 の ideation 完了時に正規 park され、scope-document「実施範囲と出口」は「以降の Inception 続行/park はユーザー判断」と予約した。その後続承認が 2026-07-23 のユーザー着手決定(leader ディスパッチ 2026-07-23T00:48:23Z、issue-selection-user-decides 充足 — agmsg 一次記録、agmsg-git-evidence-split 準拠)として成立し、本 requirements は「承認済みの実装 intent」として inception 以降を対象にする — ideation-park 裁定からの逸脱ではなく、同裁定が予約した後続ユーザー承認の執行である。要件レベルの追加裁定は Q1〜Q3(requirements-analysis-questions.md、選挙方式 — P-02 は継続分に限りユーザー裁定 2026-07-23T01:13:32Z で選挙へ改定、constraint-register 改定履歴参照)のみが対象。

## 前提(既決 — 再裁定しない)

grilling 裁定 G-1〜G-7(2026-07-19 ユーザー確定)、feasibility 制約 C-01〜C-08、decision-log D-01〜D-08、scope S-01〜S-07 / W-01〜W-05。参照は各上流成果物を正とし本書は要約再掲しない(citation-reservation-preservation)。

## 機能要件(FR)

### FR-1: ツール移設(S-01、D-02/C-02/C-03)

- 正本を `packages/framework/core/tools/amadeus-mirror.ts` へ移設し、`scripts/amadeus-mirror.ts` を**同一変更で削除**(二重実装 Forbidden)。
- 移設は**挙動不変**(W-04): 既存3 verb(create/sync/close)の CLI 契約・出力・exit code(fail=1 `fail` :231-234 / usage=2 — scan-notes (1) 転記)・`GhRunner` テストシーム・fail-closed landing check(close :339-345)を変更しない。
- 受け入れ基準: `bun run dist:check` / `bun run promote:self:check` green(全6ハーネス投影 — coreDirs `{ src: "tools", dst: "tools" }` claude manifest :43 同型)。`find dist -name 'amadeus-mirror*'` が6ハーネス面でヒット。`git grep -l amadeus-mirror scripts/` = 0件。既存 t232 unit/integration が移設後パスで green(パス参照は fixture-propagation-grep で棚卸し)。

### FR-2: status verb(S-02、D-03)

- 読取専用の乖離診断 verb `status` を追加: (a) 状態行 stale(record の節目状態 vs Issue 状態行) (b) ミラー未作成(state に Mirror Issue フィールドなし/Issue 不在) (c) Issue 手動変更(Issue 本文が直近 sync 内容と不一致)の3クラスを検出・列挙する。
- 書込ゼロ(gh は read 系のみ、state/record への書込なし)。
- exit code 契約: 【裁定待ち — Q3】
- 受け入れ基準: 乖離3クラスそれぞれの fixture で検出を実証(落ちる実証を含む)。gh 不在・未認証は loud エラー(C-01)。

### FR-3: SKILL /amadeus-mirror(S-03、D-03)

- 薄い user-invocable SKILL(session skills 様式の in-tree 配布、`classification: read-only` ではない — S-03)。入口は status 診断、結果に応じ create/sync/close へ分岐案内。
- SKILL 自身はロジックを持たず `{{HARNESS_DIR}}/tools/amadeus-mirror.ts` を叩く(既習様式 — scan-notes (3)。現行 runner に scripts/ を指す前例はなく、FR-1 の移設が本 FR の前提)。
- 6ハーネス生成様式は design 委任(U-03)。

### FR-4: 3層 config 機構(S-04、D-05/D-06/C-06)

- `GlobalConfig(amadeus/ 直下・git 共有)→ SpaceConfig → IntentConfig` の汎用階層解決を新設。**下位優先**(Intent > Space > Global — C-06 既決)。
- 初キーは `auto-mirror` のみ。既存設定(space 単層 amadeus-settings.ts — scan-notes (4))の移行はしない(W-01)。マシンローカル層なし(W-02)。
- ファイル形式・置き場の具体名は design 委任(U-03)。fail-closed パース(未知キー・型不整合を invalid 収集)は amadeus-settings.ts の既習様式に倣う(citation-semantics-check: 同ファイルの invalid 収集は「解決不能キーを無視せず列挙して落とす」意味論 — 本 FR の要求と一致)。
- 受け入れ基準: 3層の優先解決・未設定時 default(auto-mirror off)・invalid 入力の loud 拒否を unit テストで固定。

### FR-5: phase 境界ミラー ask(S-05、D-04/C-04)

- engine が phase boundary で「ミラー同期しますか?」の ask directive を発行(既存 directive 語彙のみ — 新 kind なし)。ミラー未作成時は create 選択肢を含める(S-05)。
- 発火粒度: 【裁定待ち — Q1】
- auto-mirror 有効かつミラー未作成時の挙動: 【裁定待ち — Q2】
- 受け入れ基準: 発火境界の全数を integration テストで固定(裁定確定後に導出)。next 出力の既存消費者へ影響しないこと(C-08 — stdout-directive-stderr-advisory 準拠で stderr 追記時は消費者 grep 棚卸し)。

### FR-6: auto-mirror(S-06、D-07/C-05)

- config で auto-mirror 有効時、phase 境界の ask を飛ばし sync 実行の print 指令(run-then-continue)を発行。
- auto 実行は **sync のみ**。create/close は auto 設定下でも必ず ask(W-05)。close は close-after-landing 検証維持(C-05)。
- 受け入れ基準: auto 有効/無効 × ミラー有/無の4象限を integration テストで固定(未作成×auto の期待挙動は Q2 裁定から導出)。

### FR-7: ノルム改定(S-07、D-01/C-01/P-01)

- gh を「配布物でも optional runtime 依存として可(不在・未認証は loud エラー exit 1 で当該機能のみ不可、workflow は止めない。トークン非保持・gh keyring 委譲)」へ改定する norm PR を作成(gh-scripts-boundary の更新)。
- Bolt 1 マージの前提として先行(scope-document Bolt 分割方針)。norm PR は2名レビュー+ユーザー承認マージ(P-01)。

## 非機能要件(NFR)

- **N-1 挙動不変検証**: FR-1 移設前後で t232 の全アサーション不変(テスト文言の変更はパス参照のみ)。
- **N-2 カバレッジ**: 新規行(status verb・config 機構・engine 分岐)は push 前ローカル lcov で未カバー0を実測(local-lcov-pre-push)。spawn-only 盲点は in-process seam で回避(bun-coverage-spawn-blindspot)。
- **N-3 配布同期**: 全変更で dist:check / promote:self:check green(C-03)。
- **N-4 既存 CI gate**: typecheck / lint / dist:check / promote:self:check / run-tests.sh --ci green(Testing Posture)。

## Out of Scope(scope-document W-01〜W-05 を正とする)

既存設定の3層移行 / マシンローカル層 / GitHub 以外・双方向 sync / mirror 本体の機能拡張 / auto での create・close。

## トレーサビリティ

FR-1〜7 ↔ S-01〜07(1:1)。制約は C-01〜C-08、裁定は G-1〜G-7/D-01〜D-08 へ遡る。測定 ref: 機構引用(:231-234 / :339-345 / :165-169 / manifest :43)は RE scan-notes((1)(2)(5))からの転記で、observed HEAD d96ffe3be 断面。
