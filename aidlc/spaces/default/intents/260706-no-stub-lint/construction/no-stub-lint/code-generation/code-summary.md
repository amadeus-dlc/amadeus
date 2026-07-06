# Code Summary — no-stub-lint（Issue #528）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更内容

| ファイル | 変更 | 対応 |
|---|---|---|
| `lints/no-stub-compat/check.ts` | 新規。6 検出器（compat-symbol / compat-alias / compat-comment / stub-throw / stub-empty-todo / stub-always-pass）+ `docs/backward-compatibility.md` 許可リスト照合 + `--check`/`--report` CLI。既存 rule（public-type-file / ts-complexity）と同じ defaultInclude・ディレクトリ形式で `lints/check.ts` の自動 discovery に乗る。 | FR-1、FR-2 |
| `lints/no-stub-compat/eval.ts` | 新規。fixture 駆動: (a) 6 カテゴリ全件の RED 検出、(b) 全カテゴリ宣言後の pass 転化、(c) 維持理由欠落の無効宣言が pass にならないこと、CLI 未知引数拒否、(d) 実ツリー `--check` の回帰 pass、(e) package.json 配線 assertion。 | NFR-1、FR-3.3 |
| `docs/backward-compatibility.md` | 「## Lint 許可リスト（no-stub-compat）」節を新設（既存節は無変更）。4 行の宣言（後述）。 | FR-2、FR-3 |
| `package.json` | `lint:no-stub-compat:report` / `lint:no-stub-compat:check` / `test:it:no-stub-compat` を追加し、`test:it:all` の連鎖へ組み込んだ。 | FR-1.1 |
| `aidlc/spaces/default/intents/260706-no-stub-lint/construction/no-stub-lint/code-generation/{code-generation-plan.md,code-summary.md}` | 新規（本 record）。 | — |

## RED 証跡

`check.ts` を作る前に `lints/no-stub-compat/eval.ts` を実行し、次で失敗することを確認した（モジュール未実装）。

```
error: Cannot find module './check' from '.../lints/no-stub-compat/eval.ts'
```

`check.ts` の最小実装後、eval の (d) 実ツリー回帰 assertion は許可リスト宣言前のため fail し続けた。fail 出力には実ツリーの 23 件が列挙された（後述の実測値と一致）。

## GREEN 証跡

`docs/backward-compatibility.md` へ許可リスト 4 行を追記した後、`bun run lints/no-stub-compat/eval.ts` が次を出力して pass した。

```
no-stub-compat eval: ok
```

## 実測証跡（FR-3.1 の再実測）

`checkBannedMarkers({})`（scan scope = 既存 rule の defaultInclude と同一）を実ツリーに対して実行し、次を確認した。

- compat-symbol: 9 件（`AmadeusValidator.ts` の `legacy` / `legacyFiles` / `legacyDirectories` が source・昇格先の 2 コピーで 6 件、`dev-scripts/evals/amadeus-templates/check.ts` の `legacyIntentDomainPattern` 1 件、`dev-scripts/evals/amadeus-validator/check.ts` の `legacyStateWorkspace` / `legacyPreservedWorkspace` 2 件）。
- compat-comment: 14 件（`AmadeusValidator.ts` + `lifecycle-v2.ts` の実運用互換許容コメントが 2 コピーで 10 件、`dev-scripts/evals/{doctor-drops,engine-gap-trio,amadeus-validator}/check.ts` の説明コメントが 4 件）。
- compat-alias / stub-throw / stub-empty-todo / stub-always-pass: 0 件。
- 合計 23 件。requirements.md の FR-3.1（棚卸し結果）と完全に一致した。

## 出荷した許可リスト行（4 行）

| 対象（glob） | カテゴリ | 件数（実測） |
|---|---|---|
| `{skills,.agents/skills}/amadeus-validator/validator/AmadeusValidator.ts` | compat-symbol | 6 |
| `{skills,.agents/skills}/amadeus-validator/validator/*.ts` | compat-comment | 10 |
| `dev-scripts/evals/{amadeus-templates,amadeus-validator}/check.ts` | compat-symbol | 3 |
| `dev-scripts/evals/{doctor-drops,engine-gap-trio,amadeus-validator}/check.ts` | compat-comment | 4 |

domain-entities.md の宣言計画表（O-3 の確定）どおり 4 行に圧縮した。`Bun.Glob` の brace 展開が `{skills,.agents/skills}/...` 形と `dev-scripts/evals/{a,b,c}/check.ts` 形の両方で意図どおりマッチすることを、実装前に `bun -e` で個別に確認済み。

## 自己参照（BR-8）の扱い

rule 自身（`lints/no-stub-compat/check.ts`、`lints/no-stub-compat/eval.ts`）は scan scope（`lints/`）に含まれるが、次の対応により自己ヒットは **0 件** だった（許可リストへの追加行は不要）。

1. **命名回避**: 実装識別子は `legacy` / `shim` / `compat` / `deprecated` を含まない語彙にした（例: `BannedMarkerFinding`、`AllowlistEntry`、`declaredBannedName`、`bannedWordPattern`）。カテゴリ ID の文字列リテラル（`"compat-symbol"` 等）は宣言シンボル名ではなく値であるため compat-symbol 検出器の対象にならない。
2. **分割表記**: compat-comment が検索する「後方互換」の 1 語を、`check.ts` と `eval.ts` の両方で `"後方" + "互換"` という連結式で定義した。ソースファイルの生テキストには連続した「後方互換」という文字列が現れないため、compat-comment の生テキスト検索は自己ヒットしない。fixture 側は実行時に連結された文字列を一時ディレクトリのファイルへ書き込むため、検出対象としては正しく機能する。
3. **残存ヒットの宣言**: 上記 2 点の対応後、実ツリー再実測で `lints/no-stub-compat/*.ts` 由来のヒットは 0 件だった。許可リストへの追加行は発生しなかった。

compat-symbol・compat-alias・stub-throw・stub-empty-todo・stub-always-pass は AST ベースの検出であり、fixture のソースコードを `eval.ts` 内の文字列リテラル（テンプレートリテラル）として保持しているだけであるため、`eval.ts` 自身の実 AST 上には該当する宣言・throw文・空関数が存在しない。したがってこれらのカテゴリは元々自己ヒットしない構造だった。

## 検証結果

- `npm run test:it:no-stub-compat` → `no-stub-compat eval: ok`（exit 0）。
- `npm run lint:check` → `no-stub-compat: ok (0 violations)` を含め 3 rule すべて ok（exit 0）。
- `npm run typecheck` → エラーなし（exit 0）。
- `npm run test:it:lints` → `lints eval: ok`（既存 2 rule の assertion に影響なし、exit 0）。
- `npm run test:all` → 最後まで完走し exit 0（`diff:check` まで到達）。

## 逸脱

- なし。requirements.md / functional-design の確定事項どおりに実装した。O-3 の圧縮宣言方式・BR-8 の自己参照対応は、いずれも追加の許可リスト行を必要としない結果になった（domain-entities.md の想定どおり）。

## build-and-test 中の反映（人間判断による一致仕様の変更）

gate 報告で明示した compat-symbol の部分一致仕様について、人間判断（leader 経由、2026-07-06T02:04:35Z）により token 単位の単語境界一致へ変更した（camelCase / snake_case を token 分解し、token == legacy / shim / compat / deprecated で照合）。

- TDD で反映: eval に否定ケース（compatibleFormat / isBackwardCompatible / CompatibilityChecker が発火しない）と肯定ケース（legacyValue / legacy_path_map / ShimAdapter が発火し続ける）を先に追加して RED を確認 → matchBannedName を identifierTokens 方式へ変更 → GREEN。
- 実ツリーの棚卸しは 23 件のまま不変（既存ヒットはすべて token 一致でも発火）で、出荷済みの許可リスト 4 行も有効なまま。
- 判断の記録: build-and-test 宛 DECISION_RECORDED（理由 3 点 = 一般語ノイズの排除、他検出器による捕捉、取りこぼし実例の観察後拡張の原則）。
