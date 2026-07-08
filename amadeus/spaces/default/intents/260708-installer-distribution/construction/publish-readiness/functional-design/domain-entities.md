# Domain Entities — publish-readiness

> ステージ: functional-design (3.1) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../../../inception/requirements-analysis/requirements.md`(FR-001/015/017/018)、`../../../inception/application-design/decisions.md`(ADR-002)、`../../setup-foundation/functional-design/business-rules.md`(BR-F16〜F19)、team knowledge `software-design/functional-domain-modeling-ts`
> スタイル: Rev.3 確認済みの役割分担。本 Unit の「ドメイン」はテストコード内の検証語彙であり、本番 CLI には型を追加しない

## エンティティ定義(テスト側の検証語彙 — tests/ 配下に置く)

### PackContract(同梱物契約 — FR-018 の正準定義)

```ts
export type PackContract = {
  declaredInFiles(): readonly string[];      // package.json `files` に明示宣言すべき集合: ["dist/cli.js", "LICENSE-MIT", "LICENSE-APACHE"]
                                             //   (非標準命名の LICENSE-* は自動同梱されないため明示必須 — レビュー時の実測)
  autoIncluded(): readonly string[];         // npm が files の内容にかかわらず常に同梱する集合: ["package.json", "README.md"](npm の仕様)
  requiredFiles(): readonly string[];        // 実 tarball の期待内容 = declaredInFiles ∪ autoIncluded(5項目)
  isSatisfiedBy(report: PackReport): ContractVerdict;   // 判定は契約自身が答える(Tell, Don't Ask)
};

export type ContractVerdict =
  | { readonly type: "satisfied" }
  | { readonly type: "missing"; readonly files: readonly string[] }
  | { readonly type: "unexpected"; readonly files: readonly string[] };  // 契約外ファイルの混入(ソース .ts や tests の同梱事故)

export namespace PackContract {
  export function current(): PackContract;   // 正準契約の単一定義(テストと手順書が同じ定義から導出 — 複数箇所への手書き複製禁止)
}
```

**単一ソース化の実装メカニズム(BR-P02)**: `package.json` の `files`(静的 JSON)は TS を import できないため、**ドリフトテスト**で機械的に同期を強制する:

```ts
test "package.json files は PackContract.declaredInFiles と一致する":
  filesField = readJson("packages/setup/package.json").files
  assert deepEqual(sorted(filesField), sorted(PackContract.current().declaredInFiles()))
  // 手書きの二重管理を「ドリフトしたら CI が赤くなる」形で許容する(dist:check と同じ流儀)
```

**BR-F19/ADR-002 との数の和解**: 上流の「dist/cli.js + README + LICENSE 2種**のみ**」は **`files` 宣言でコントロールする配布意思**を指す(U1 BR-F19 に注記追加済み)。npm は `package.json`(と `README.md`)を宣言に関わらず自動同梱するため、**実 tarball の検証基準(requiredFiles)は5項目**になる — この差分は npm の仕様であり契約違反ではない。

```ts
```

### PackReport(npm pack --dry-run --json の解析結果)

```ts
export type PackReport = {
  files(): readonly string[];                // tarball 相対パス一覧
  packageVersion(): string;                  // pack 対象の version(FR-017 の独立 semver)
};

export namespace PackReport {
  export function parse(npmPackJson: unknown): Result<PackReport, PackReportError>;  // 実ツール出力のパース(シミュレーション禁止 — c4)
  // Result は他ユニットと同じ正準形状 { type: "ok"; value: T } | { type: "err"; error: E }
}

export type PackReportError = { readonly type: "malformed-output"; readonly detail: string };
```

### PublishChecklist(手順書の構成 — docs 成果物の骨格)

```ts
// 型ではなく手順書(docs/guide/publishing-setup.md 予定)の章立て定義。business-logic-model 参照
```

## 本番コードへの影響

- `packages/setup/package.json` のメタデータ是正(license `(MIT OR Apache-2.0)` / repository / files フィールド)は**宣言的変更**であり新規型なし
- root `package.json` の I1/I2 是正も本 Unit で実施(公開されない private パッケージだが誤情報の温床を残さない)
