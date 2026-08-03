# Domain Entities — cast-guard (#1980 / AD U4)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: **worktree HEAD `c8702be09`**(`git diff --stat 5a6f79727..HEAD -- packages/framework/core/tools/ packages/framework/core/otel/ tests/ .github/workflows/ scripts/` は出力 0 行 = 差分ゼロ)。ファイル別内訳(§5)は本ステージで実行した read-only の AST 走査(repo 外 scratch)出力からの転記。

## 1. 本 unit が所有する型の範囲

components.md `U4`(:39)が定める所在は `tests/`(新規 `tests/unchecked-cast-guard.ts` + allowlist `tests/.unchecked-cast-allowlist.json` + そのガード自身のテスト)であり、**本 unit が定義する型はすべてテスト層に閉じる**。プロダクション型(`packages/framework/core/` 配下)は1つも定義せず、1つも変更しない。unit-of-work.md :29 の共通制約が「election-readpath のみ `packages/framework/core/` を触る」と限定していることと整合する。

型の骨格は component-methods.md `U4`(:179-201)が確定したシグネチャに従う。本書はそこへ (a) スキーマの正規化・検証の所有者、(b) 台帳 JSON の実スキーマ、(c) 初期値の実測、を加えて閉じる。

## 2. 他 unit の型との関係(cross-unit 照合)

`cid:functional-design:cross-unit-type-verbatim-check` に従い、他 unit の型を参照するかを確認した結果:

- **election-readpath(AD U1)の型**(`ElectionFile` / `StoreError` / `Result`)を**参照しない**。本 unit はプロダクション源を `import` せず、テキストとして読んで AST へ解析する(business-logic-model.md §1)。したがって U1 の型進化は本 unit へ伝播しない。
- **state-pbt / mirror-property の型**(`MirrorBoundaryReceipts` 等)も参照しない。
- **依存する外部型は `typescript` の `ts.*` のみ**(`package.json:42` 実文 `    "typescript": "^6.0.3"`)。

一方、**同名別物**の関係が1件ある。兄弟ガード `tests/callsite-guard.ts:133` の実文は:

```ts
export type Census = Record<string, Record<string, number>>;
```

であり、本 unit の `Census`(component-methods.md :189 実文 `export type Census = Record<string, Record<string, number>>;`)と**構造は逐語同一**である。しかし内側キーの意味が異なる(兄弟 = `GuardedSymbol`、本 unit = `CastKind`)ため、**型を共有せず本 unit のモジュール内で独立に定義する**。共有した場合、片方の語彙拡張がもう片方の台帳意味論を暗黙に変えるため。この判断は decisions.md ADR-2 Rationale(:102)が「本 ADR は述語の中身を確定するだけで、ガードの本数や配置を棚卸しから増やさない」と述べる範囲に収まる(ガードは2本、型は各1組)。

## 3. 型定義

### 3.1 検出結果

```ts
/** 走査で見つかった無検査キャスト1件。line は人間向けの所在表示にのみ使い、
 *  台帳へは持ち込まない(BR-CG-13 / 行シフト非依存)。 */
export type CastKind = "json-parse-as";

export type UncheckedCastMatch = {
  readonly file: string;   // リポジトリルート相対パス(BR-CG-12)
  readonly line: number;   // 1 起点。as 式の開始行
  readonly kind: CastKind;
};

export function detectUncheckedCasts(file: string, source: string): UncheckedCastMatch[];
```

component-methods.md :181-186 の型定義と逐語一致する(同書は `kind: "json-parse-as"; // 将来の述語追加に備えた1語彙` とインラインで書いており、本書はそれを名前付き `CastKind` として抽出した — 語彙集合は同一で、拡張点が型名で可視になる差分のみ)。

**`line` の情報落ちは意図的**である。`buildCensus` は `line` を捨てる。decisions.md ADR-2 Decision (b)(:94)の「file:line ピンは使わない」と、兄弟 `tests/callsite-guard.ts:21-25` の理由記述(実文 `// WHY COUNTS AND NOT LINE PINS. An allowlist of file:line identifiers goes` / `// stale the moment an unrelated edit shifts a file, and every later PR then` / `// fails on a pin that moved rather than on a real regression` / `// (cid:code-generation:allowlist-line-pin-stale). Per-(file, symbol) counts` / `// keep the monotone-decrease property BR-12 needs without that failure mode.`)が根拠。`line` を残すのは違反時の人間向け出力と、デバッグ時の所在特定のためだけである。

### 3.2 台帳(census と allowlist)

```ts
/** (file, kind) → count。ドメイン上の「負債の分布」。 */
export type Census = Record<string, Record<string, number>>;

export function buildCensus(matches: readonly UncheckedCastMatch[]): Census;
export function totalSites(census: Census): number;

/** コミットされる台帳ドキュメント。 */
export type AllowlistDoc = {
  readonly description: string;
  readonly direction: "shrink-only";
  readonly total: number;
  readonly sites: Census;
};

export type LoadedAllowlist =
  | { kind: "loaded"; doc: AllowlistDoc }
  | { kind: "failed"; detail: string };

export function parseAllowlist(body: string): LoadedAllowlist;
export function renderAllowlist(census: Census): string;
```

`AllowlistDoc` / `LoadedAllowlist` は兄弟 `tests/callsite-guard.ts:135-140` / `:246` と同形である(components.md Reuse inventory :93 が `parseAllowlist`(`:248`)を再利用対象に挙げる)。`direction` はリテラル型 `"shrink-only"` であり、**この文字列が一致しない台帳は読めない台帳として扱う**(BR-CG-18)。これは台帳の意味(縮小方向のみ)を型と実行時検証の両方で固定するためで、兄弟 `:259-261` 実文 `  if (doc.direction !== "shrink-only") {` / `    return { kind: "failed", detail: \`allowlist direction must be "shrink-only", got ${String(doc.direction)}\` };` / `  }` と同一方針を採る。

`total` は冗長フィールド(`sites` から機械計算できる)だが、台帳を人間が読むときの要約として保持する。**判定には使わない** — 判定は `sites` の (file, kind) ごとの比較のみで行う(BR-CG-14〜17)。`total` を判定に使うと、あるファイルで増え別のファイルで減った場合に合計が変わらず違反を見逃す。

### 3.3 判定結果

```ts
export type GuardVerdict =
  | { readonly kind: "ok"; readonly total: number; readonly removed: readonly string[] }
  | { readonly kind: "violations"; readonly total: number; readonly added: readonly string[] };

export function diffAgainstAllowlist(census: Census, allowlist: AllowlistDoc): GuardVerdict;
```

判別ユニオンの**両アームが `total` を持つ**のは、報告する数値を必ず走査から導出させるためである(BR-CG-30)。兄弟 `tests/callsite-guard.ts:160-163` 実文 `// The ratchet verdict. Both arms carry the measured total, so the caller never` / `// reports a count it did not derive from the scan.` が同じ設計意図を明記する。

`removed`(縮小検知)は OK アームに載る。すなわち**縮小は違反ではない**(BR-CG-16)。`added` は違反アームにのみ載る。この非対称は ratchet の定義そのものである。

### 3.4 残存レポート

```ts
export type ResidualReport = {
  readonly generatedAt: string;   // ISO 8601
  readonly total: number;
  readonly byFile: Record<string, number>;
};

export function buildResidualReport(census: Census, now: string): ResidualReport;
```

`now` を引数で受けるのは純関数性の維持のため(時計を関数内で読まない)。兄弟 `:287` と同形で、CLI 側が `new Date().toISOString()` を渡す(兄弟 `:337`)。このレポートは verdict によらず毎回 stdout に出力され、`--report` 指定時は JSON としても書かれる(BR-CG-28 / BR-CG-29)。

### 3.5 CLI オプション

```ts
export type CheckOptions = {
  readonly allowlistPath?: string;
  readonly reportPath?: string;
  readonly census?: Census;   // テスト専用 seam。argv からは到達できない(BR-CG-34)
};

export function runCheck(options?: CheckOptions): number;
export function runUpdate(path?: string): number;
export function main(args: string[]): number;
```

component-methods.md :193-199 と逐語一致。`census` seam の存在理由は同書 :204 が兄弟 `tests/callsite-guard.ts:321-322` の前例を引いて説明している(実文 `  // The census to judge, for tests. It defaults to a live scan, and argv has no` / `  // way to set it — \`main\` only ever measures. The seam exists because the`)。本 unit では**初期母集団が 33 件と非ゼロ**であるため、兄弟が直面した「実コーパスが空で違反アームが到達不能」という事情とは異なるが、seam が必要な理由は別にある — 実コーパスから NEW_CAST を作るには実ファイルへ違反を書き込むしかなく、それは requirements.md `NFR-2`(:56)の in-process 計測要件と `cid:code-generation:falling-proof-injection-one-set` の revert 規律の両方を毎回のテスト実行に持ち込むことになる。seam はそれを不要にする(business-logic-model.md §8 面 A)。

## 4. 正規化と検証の所有

「誰がどの正規化・検証を所有するか」を1点に決める(重複所有は同じ規則の二重実装 = ずれの温床)。

| 対象 | 所有者 | 内容 | 重複させない理由 |
| --- | --- | --- | --- |
| ファイルパス | 走査層(`scanRepository` 相当) | リポジトリルート相対の1形へ正規化(BR-CG-12、兄弟 `:239` `      const rel = relative(REPO_ROOT, path);`) | 台帳キーが絶対パスと相対パスで割れると、同一ファイルが2エントリになり ratchet が壊れる |
| 走査対象の選別 | ファイル列挙層 | `.ts` のみ、`vendor` / `node_modules` 除外(BR-CG-10 / 11、兄弟 `:213` `:224`) | 述語側で再フィルタすると、どちらが真の母集団か不明になる |
| 「無検査キャストか」の判定 | `detectUncheckedCasts` **のみ** | AST 述語(BR-CG-1〜4) | テスト側で棄却規則を再実装すると、ガードの欠陥がテストで相殺される(`cid:build-and-test:pbt-oracle-cancellation` と同型の相殺) |
| `kind` の付与 | `detectUncheckedCasts` のみ | 現状 `"json-parse-as"` 固定 | 語彙の単一定義(construction ガードレール「canonical な1定義から導出」) |
| 台帳スキーマの検証 | `parseAllowlist` **のみ** | JSON 構文 / オブジェクト性 / `direction` / `sites` の4点(BR-CG-18) | 読み口が2つ以上になると片方だけ検証が緩む(`cid:requirements-analysis:symmetric-pair-review`) |
| 台帳の不在検査 | CLI 層(`runCheck` 冒頭のロード) | 不在は `failed` として `parseAllowlist` の失敗と同じ扱い | 不在と不正を別 exit にすると fail-closed の意味が割れる |
| 件数の算出 | `totalSites` / `buildResidualReport` のみ | census からの機械計算 | 出力文字列側で数え直すと BR-CG-30 を破る |
| 時刻 | CLI 層 | `buildResidualReport` へ引数で渡す | 純関数層に時計を持ち込まない |

## 5. 台帳 JSON のスキーマと初期値

### 5.1 スキーマ

`tests/.unchecked-cast-allowlist.json`(パスは components.md :39 が指定)。形は兄弟 `tests/.callsite-allowlist.json` と同一で、内側キーの語彙のみ異なる。兄弟の HEAD 実文(migration 完了後のためゼロ件):

```json
{
  "description": "Legacy audit/telemetry call sites still awaiting migration onto the canonical emit path (VER-4). Shrink-only: adding a site fails CI. Regenerate with: bun tests/callsite-guard.ts --update",
  "direction": "shrink-only",
  "total": 0,
  "sites": {}
}
```

本 unit の台帳も同4キー(`description` / `direction` / `total` / `sites`)を持つ。`description` には**再生成コマンドを含める**(兄弟が `Regenerate with: …` を含めているのと同じ理由 — 台帳を見た人が更新手段に辿り着ける)。`description` の文字列は module scope の定数として定義する(兄弟 `:268-272` が実文 `// Module scope, not inline: a \`+\`-concatenated value inside a multi-line call` / `// argument leaves its continuation lines at DA:0 in bun's lcov, which reads as` / `// uncovered patch lines (cid:code-generation:bun-multiline-arg-da0).` と理由を明記している lcov 上の既知事情に従う)。

### 5.2 初期値(実測)

business-logic-model.md §3 の走査結果のファイル別内訳。`kind` はすべて `"json-parse-as"`。

| ファイル | count |
| --- | --- |
| `packages/framework/core/otel/relay.ts` | 3 |
| `packages/framework/core/tools/amadeus-election-store.ts` | 1 |
| `packages/framework/core/tools/amadeus-execution-projection.ts` | 1 |
| `packages/framework/core/tools/amadeus-graph.ts` | 3 |
| `packages/framework/core/tools/amadeus-harness.ts` | 2 |
| `packages/framework/core/tools/amadeus-includes.ts` | 1 |
| `packages/framework/core/tools/amadeus-lib.ts` | 2 |
| `packages/framework/core/tools/amadeus-migrate.ts` | 1 |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | 2 |
| `packages/framework/core/tools/amadeus-plugin-activation.ts` | 2 |
| `packages/framework/core/tools/amadeus-plugin-compose.ts` | 4 |
| `packages/framework/core/tools/amadeus-plugin-selection.ts` | 1 |
| `packages/framework/core/tools/amadeus-sensor-self-scope-consistency.ts` | 1 |
| `scripts/amadeus-election-migrate.ts` | 2 |
| `scripts/distribution-transaction.ts` | 2 |
| `scripts/metrics-snapshot.ts` | 1 |
| `scripts/plugin-projection.ts` | 1 |
| `scripts/promote-self.ts` | 3 |
| **合計** | **33**(18 ファイル) |

合計は列挙からの機械再計算(`cid:requirements-analysis:ledger-count-mechanical-recalc`): 3+1+1+3+2+1+2+1+2+2+4+1+1+2+2+1+1+3 = **33**、ファイル数 = **18**。components.md 初期母集団表(:110-116)の「33 サイト / 18 ファイル(うち多行 5)」と一致する。

この表は**見積りであって台帳そのものではない**。BR-CG-22 のとおり、コミットする初期台帳は U1(election-readpath)着地後に `--update` の実出力から確定する — unit-of-work-dependency.md の YAML edge block(:16 `depends_on: [election-readpath]`)と batch 編成(:41「cast-guard(election-readpath 着地後の allowlist 初期採取)」)が、その採取タイミングを本 unit の順序制約として確定している。`amadeus-election-store.ts` の 1 件は `readJson<T>` 本体(`:80` 実文 `    return ok(JSON.parse(text) as T);`)であり、decisions.md `ADR-4` Decision(:217)が「`readJson<T>` の汎用形は変更しない」と裁定しているため **U1 後も残る**(components.md U4 依存 :43 が同じことを確定している)。

### 5.3 台帳エントリの意味論

- キーは**リポジトリルート相対のパス文字列**。行番号を含まない(§3.1)。
- 値は**その (file, kind) で許容されるサイト数**。0 は「1件も許容しない」を意味し、エントリの不在と同値に扱う(BR-CG-17、兄弟 `:170` 実文 `  return allowlist.sites[file]?.[symbol] ?? 0;`)。
- ファイルが削除・リネームされた場合、旧キーは実測 0 に対して台帳値 > 0 となり **OK(縮小検知)** として prune 案内が出る(BR-CG-16)。ratchet は壊れない。
- ファイルが移動した場合は「旧キーの縮小 + 新キーの新規」となり、新キー側が **NEW_CAST** で赤くなる。これは意図した挙動である — 移動を機に是正するか、`--update` で台帳を更新するかの判断を人間に強制する(BR-CG-21 のレビュー規律が働く場面)。

## 6. AST 側で扱うノード種(所有しないが依存する型)

本 unit は `typescript` の型を消費するのみで再定義しない。依存する API 面を明示する(`cid:application-design:external-seam-vocab-measurement` の語彙実測):

| API | 用途 | 実測での既存利用 |
| --- | --- | --- |
| `ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true)` | 1ファイル1パスの構文解析 | `tests/lib/guard-corpus-ast.ts:26` 実文 `  const file = ts.createSourceFile("source.ts", source, ts.ScriptTarget.Latest, true);` |
| `ts.isAsExpression(node)` | 述語の第1条件 | `tests/lib/typescript-source.ts:21` 実文 `    ts.isAsExpression(expression) ||` |
| `unwrapExpression(expression)` | `as` / `!` / `()` / `satisfies` / 旧形アサーションを剥ぐ | `tests/lib/typescript-source.ts:19` 実文 `export function unwrapExpression(expression: ts.Expression): ts.Expression {` |
| `ts.isCallExpression` / `ts.isPropertyAccessExpression` | 被アサーション式が `JSON.parse(...)` か | `tests/lib/guard-corpus-ast.ts:29-31` の callee 判別(`:29` 実文 `    if (ts.isCallExpression(node)) {`、`:31` 実文 `      else if (ts.isPropertyAccessExpression(node.expression)) {`) |
| `node.type.kind !== ts.SyntaxKind.UnknownKeyword` | `as unknown` の除外 | 本 unit で新規(decisions.md ADR-2 Decision (a) :92) |
| `sourceFile.getLineAndCharacterOfPosition(pos)` | `line` の算出 | 本 unit で新規 |
| ノード走査 | `visitNodes`(`tests/lib/typescript-source.ts:54`)または `forEachChild` の再帰 | 既存2形あり。どちらを使うかは実装段で決める(どちらも repo 内の既習様式) |

**型チェッカ(`ts.TypeChecker`)は使わない**。decisions.md ADR-2 の代替 B 却下理由(:135-137)が「プログラム全体の型解決は 236 ファイルに対して構文解析より桁違いに重く lint-budget を実際に脅かす」「得られる追加精度は実測 8 件の `as unknown` がすべて構文上 `unknown` キーワードである現状ではゼロ」と確定している。したがって本 unit の型依存は**構文レベルに閉じる**。

## 7. 型に関する非目標

- ドメイン型のブランド化(`FilePath` / `SiteCount` 等のスマートコンストラクタ)は導入しない。本 unit の型はテスト層のツール内部に閉じ、外部から不正値が入る経路は台帳 JSON の1点のみで、そこは `parseAllowlist` が検証する。プリミティブを包む判断は「ラッパー型が正しさを変えるときだけ」であり(construction ガードレール)、ここでは変えない。
- `Result` 型は導入しない。兄弟様式は判別ユニオン(`LoadedAllowlist` / `GuardVerdict`)と数値 exit code で表現しており、そこへ別のエラー表現を混ぜない(component-methods.md :205 が引用元との「相違なし」を確認済み)。
- election / state / mirror の各ドメイン型は本 unit の語彙に入らない(§2)。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段3(バリデータ非経由の読み戻し経路新設の CI 機械ブロック)に対応する。
- services.md との関係: 本 unit の CLI 出力契約(verdict×exit code)と CI 実行位置は services.md S1 節が正本であり、本書の該当表は S1 からの転記である。
