# Code Generation Plan — no-stub-lint（Issue #528）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)

## 計画（TDD）

- [x] 1. RED: `lints/no-stub-compat/eval.ts` を先に書く。一時ディレクトリへ 6 カテゴリ（compat-symbol / compat-alias / compat-comment / stub-throw / stub-empty-todo / stub-always-pass）を含む fixture を書き、`check.ts` 不在（import 解決失敗）で RED を確認した。（FR-1.1、NFR-1）
- [x] 2. GREEN: `lints/no-stub-compat/check.ts` を最小実装。scan scope は既存 rule と同一の defaultInclude（FR-1.2b）。6 検出器を TypeScript AST（`typescript` package）と生テキスト検索（compat-comment のみ）で実装し、`docs/backward-compatibility.md` の新設 H2 節を照合する 2 値判定（FR-2.1）を実装した。fixture 上で 6 カテゴリ全件が RED → GREEN に転じることを確認した。
- [x] 3. 許可リスト機械可読化: `docs/backward-compatibility.md` に「## Lint 許可リスト（no-stub-compat）」節を新設（既存節は変更なし、BR-7）。維持理由・終了条件が空の行は無効として照合対象から除外する（BR-2）。
- [x] 4. 実ツリー再実測: `checkBannedMarkers({})`（root 既定 = cwd）を実ツリーに対して実行し、23 件（compat-symbol 9、compat-comment 14、他 0 件）を確認（FR-3.1 の値と一致）。
- [x] 5. 二重コピー圧縮宣言: `Bun.Glob` の brace 展開を実コードで確認した上で、4 行（validator 系 2 行 + eval 系 2 行）に圧縮して宣言し、実ツリー `--check` が pass することを確認（O-3、FR-3.2）。
- [x] 6. 自己参照（BR-8）: scan 対象からの除外を追加せず、(1) 実装識別子は legacy/shim/compat/deprecated を含まない語彙（`BannedMarkerFinding` 等）にする、(2) compat-comment の検出キーワード（「後方互換」）は `"後方" + "互換"` の分割表記にする、(3) 残存する自己ヒットは許可リストへ宣言する、の優先順で対応した。結果として自己ヒットは 0 件（許可リストへの追加行は不要）。
- [x] 7. package.json 配線: `lint:no-stub-compat:report` / `lint:no-stub-compat:check` / `test:it:no-stub-compat` を追加し、`test:it:all` の連鎖へ組み込んだ（既存 `lint:check` は `lints/check.ts` の自動 discovery に乗るため変更不要）。
- [x] 8. 最終検証: `npm run test:it:no-stub-compat`、`npm run lint:check`、`npm run typecheck`、`npm run test:it:lints`、`npm run test:all` を実行し、すべて exit 0 を確認した。

## 検出器の実装形（functional-design からの具体化）

| カテゴリ ID | 実装方式 |
|---|---|
| compat-symbol | AST 走査。`FunctionDeclaration` / `ClassDeclaration` / `InterfaceDeclaration` / `TypeAliasDeclaration` / `EnumDeclaration` の宣言名、および `const`/`let`（`var` は対象外）の `VariableDeclaration` 名が `/(legacy|shim|compat|deprecated)/i` に一致するものを検出する。 |
| compat-alias | AST 走査。`ExportDeclaration` の `NamedExports` 要素で `propertyName` が存在し `propertyName.text !== name.text` のものを検出する。 |
| compat-comment | ファイル生テキストの部分文字列検索。「後方互換」の 1 語のみ（BR-4）。 |
| stub-throw | AST 走査。`ThrowStatement` の生テキストが `/not\s*implemented/i` に一致するものを検出する。 |
| stub-empty-todo | AST 走査。本体が空（`statements.length === 0`）の関数・メソッド・コンストラクタ・アクセサで、本体内テキストまたは宣言開始行の直前 3 行以内に `TODO`/`FIXME` を含むものを検出する。 |
| stub-always-pass | AST 走査。`assert(true)`（単一引数の `true` リテラル）、または `expect(true).toBe(true)` 形の `CallExpression` を検出する。 |

## 許可リスト照合

- `docs/backward-compatibility.md` の「## Lint 許可リスト（no-stub-compat）」節の表だけを解析する（他節は非対象、BR-7）。
- 1 行 = 対象 glob（`Bun.Glob` 照合、brace 展開対応）× カテゴリの組。維持理由・終了条件が空の行は無効（BR-2）。
- fail 出力には、finding の `path:line [category] 一致内容` と、pass に転じるための宣言行フォーマット例を含める（FR-2.3、BR-3）。
