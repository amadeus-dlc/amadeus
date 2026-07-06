# Business Logic Model — no-stub-lint

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## rule の構成（O-1 の確定）

単一 rule `lints/no-stub-compat/`（`check.ts` + `eval.ts`）とする。stub 兆候と互換層兆候は検出カテゴリとして分けるが、許可リスト照合・報告形式・scan scope を共有するため rule は 1 個にする（既存 rule = public-type-file / ts-complexity と同じディレクトリ式で自動 discovery に乗る）。

処理の流れ:

1. scan scope（既存 rule の defaultInclude と同一 = `.agents/skills`、`amadeus-contracts`、`dev-scripts`、`lints`、`skills`）の `*.ts` を列挙する。
2. 各ファイルへ検出器（domain-entities.md の 6 カテゴリ）を適用し、finding（path、行、カテゴリ、一致文字列）を得る。
3. 各 finding を許可リスト（docs/backward-compatibility.md の Lint 許可リスト表）と照合する。対象 glob + カテゴリが一致すれば宣言あり = pass、なければ fail。
4. fail 時の出力は、finding の一覧（path:line、カテゴリ、一致内容）と、pass に転じる手順（許可リスト表への行追加の書式）を含む（FR-2.3）。
5. `--check` は fail で非ゼロ終了、`--report` は一覧表示のみ（既存 rule の 2 モードに準拠）。

## 許可リストの機械可読形式（O-2 の確定）

`docs/backward-compatibility.md` の既存節（## 対象 / ## 維持理由 / ## 終了条件 = record 互換の台帳）は変更しない。新しい H2 節「## Lint 許可リスト（no-stub-compat）」を追加し、次の表を置く。

| 対象（glob） | カテゴリ | 維持理由 | 終了条件 |
|---|---|---|---|

- rule はこの表だけを機械可読エントリとして解析する（既存節の散文は解析対象外 = 既存構造との両立）。
- 1 行 = 対象 glob × カテゴリの組。維持理由・終了条件が空の行は無効（宣言として認めず fail のまま）とする（.agents/rules/backward-compatibility.md の「対象、維持理由、終了条件を明記する」契約の機械化）。
- glob は `Bun.Glob` で照合する（新規依存なし）。

## 二重コピーの宣言方式（O-3 の確定）

対象 glob で `{skills,.agents/skills}/...` 形の brace 展開（Bun.Glob の対応は reviewer が実行確認済み）を許可し、source と昇格先の同一ロジックを 1 行で宣言する。棚卸し 23 件は 4 行（validator 系 2 行 + eval 系 2 行 = domain-entities.md の宣言計画表）に圧縮する。rule 自身の自己ヒットが実装後に発生した場合の追加行は BR-8 の手順で扱う（実行形は code-generation で確定）。

## code-generation 向け実行方針

1. TDD: `lints/no-stub-compat/eval.ts` に意図的違反 fixture（一時ディレクトリ内に生成し scan scope へ差し込む方式は既存 eval を踏襲）で RED → 実装 → GREEN。宣言による pass 転化、無効宣言（理由・終了条件欠落）の fail 維持も検査する。あわせて、実ツリーへの `--check` 実行が宣言込みで pass することを eval の回帰 assertion として組み込む（BR-8。FR-3.3 の main pass を手動確認でなく自動で固定する）。
2. 実装後、実ツリーで `--check` を実行し、棚卸し 23 件が fail として列挙されることを確認 → 許可リスト表に宣言を追記 → pass を確認（FR-3 の実施証跡として code-summary.md に記録）。
3. package.json の変更要否（reviewer の実測確認で確定）: 検出ゲート（`lint:check` = lints/check.ts の readdirSync 自動 discovery → test:ci:mock → test:all）は変更不要。ただし eval 実行系統は自動 discovery ではない（lints/eval.ts は既存 2 rule 名の出力 assert のみで per-rule eval.ts を走査しない）ため、既存 rule の precedent（public-type-file / ts-complexity の eval.ts が package.json 配線を自己 assert する形）に従い、`lint:no-stub-compat:report` / `lint:no-stub-compat:check` / `test:it:no-stub-compat` を package.json へ追加し、`test:it:all` の連鎖へ組み込む。これをしないと TDD の eval が CI から一度も実行されない死んだテストになる。
