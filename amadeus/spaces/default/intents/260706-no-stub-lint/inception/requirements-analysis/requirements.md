# Requirements：260706-no-stub-lint

## Intent 分析

### 目的

stub（実装 placeholder）と後方互換層の混入を、CI の決定論的 lint で禁止する（Issue #528、Maintainer P1 指定）。達成したい状態は次の 3 点である。

1. 検出対象を含む diff を意図的に作ると `npm run test:all` が fail し、`docs/backward-compatibility.md` へ宣言を追記すると pass する（2 値判定）。
2. 現在の main が検査を pass する（既存コードの棚卸しを含む）。
3. 検査が `test:all` に組み込まれ、以降の全 Intent に自動で効く。

### 上流の位置づけ

- 要求の正は Issue #528 と、実装方式の確定コメント（issuecomment-4888037961: 新機構は作らず lints/ ハーネスへの rule 追加）である。intent-statement / scope-document は scope（refactor）により SKIP のため存在せず、Issue とディスパッチ定型文（state-init 宛 DECISION_RECORDED に転記済み）が上流入力を代替する。
- 確定コメントの「eslint 設定の拡張（従）」は、実測（eslint 未導入）に基づくピア協議（4 名一致、leader が前提誤りを自認）で見送りを確定した（Q1、requirements-analysis 宛 DECISION_RECORDED に記録済み）。
- コードベース知識は `aidlc/spaces/default/codekb/amadeus/`（据え置き採用）を参照する。lints/ ハーネスの rule ディレクトリ式（自動 discovery、`--check` / `--report`、既存 rule = public-type-file / ts-complexity）は実コードで確認済み。
- チームの働き方（team-practices 相当）は `aidlc/spaces/default/memory/team.md` の質問プロトコルと `.agents/rules/backward-compatibility.md`（許可リストの現行契約）を参照した。

## 機能要求

### FR-1: lints/ ハーネスへの rule 追加（主）

- FR-1.1: `lints/` に rule ディレクトリ（`check.ts` + `eval.ts`、既存 rule の構成に準拠）を新設し、既存の自動 discovery（`lints/check.ts`）で `lint:check` → `test:all` → CI に組み込まれる。
- FR-1.2: 検出対象（後方互換層の兆候）: (a) 宣言シンボル名（function / const / let / class / interface / type / enum）が legacy / shim / compat / deprecated を含むもの（compat は Issue の 3 語への追加。互換層の命名慣行 = Compat 接尾辞クラス等を捕捉するための拡張であり、追加理由をここに記録する） (b) `export { X as Y }` 形式の旧名 alias re-export (c) コメント・文字列中の語「後方互換」。判定境界の明確化: コメント・文字列レベルで検出する keyword は「後方互換」の 1 語だけとし、legacy / shim / compat / deprecated はシンボル・alias レベル（(a)(b)）でのみ検出する。英語系の語を含む説明散文（実測 62 件の誤検知源）はコメントレベルでは検出対象にしない。
- FR-1.2b: 検査対象ディレクトリは既存 rule（public-type-file / ts-complexity）の defaultInclude（`.agents/skills`、`amadeus-contracts`、`dev-scripts`、`lints`、`skills`）に合わせる。`.agents/amadeus/`（エンジン）は上流適応コードで parity が乖離を管理するため対象外とする。
- FR-1.2c: Issue の検出対象「旧 path へのフォールバック分岐」は、分岐構造そのものの決定論的検出が定義できない（構文上は正当な条件分岐と区別不能）ため、本 Intent ではその表出（(a) の legacy 系命名と (c) の「後方互換」コメント）で捕捉する範囲に留め、意味的検出は #529 の検討対象へ明示的に委ねる。
- FR-1.3: 検出対象(stub の兆候): (a) `not implemented` 系 throw (b) 空関数 + TODO コメント (c) 常時成功テスト（`assert(true)` / `expect(true).toBe(true)` 型）。
- FR-1.4: 参照台帳 stub（#501 の正式契約 = codekb 採用方式の record 文書）は対象外である。検出対象はコード（*.ts）に限る。
- FR-1.5: 検出パターンの具体（正規表現・構造判定の詳細と検査対象ディレクトリ）は functional-design で確定する。

### FR-2: docs/backward-compatibility.md の機械可読許可リスト昇格

- FR-2.1: rule は検出時に `docs/backward-compatibility.md` の宣言と照合し、「宣言なき検出 = fail、宣言あり = pass」の 2 値で判定する。
- FR-2.2: 宣言エントリは対象（path または symbol/パターン）・維持理由・終了条件の 3 要素を必須とし、既存文書の見出し構造（## 対象 / ## 維持理由 など）を保ったまま機械可読にする。形式の詳細は functional-design で確定する。
- FR-2.3: 宣言の追加手順（何を書けば pass に転じるか）が rule の fail メッセージから分かること。

### FR-3: 既存コードの棚卸し（main の pass）

- FR-3.1: 棚卸しの実測結果（FR-1.2b の scan scope = 既存 rule の defaultInclude で再実測。reviewer 指摘による初回計測の scope 誤り = skills/ と昇格先の見落とし = を訂正済み）: 宣言シンボル 9 件（AmadeusValidator.ts の legacy / legacyFiles / legacyDirectories が source と昇格先の 2 コピーで 6 件 = 本番 validator コード、dev-scripts/evals の fixture 3 件）、「後方互換」コメント 14 件（validator 本体 + lifecycle-v2.ts の実運用互換許容ロジック説明が 2 コピーで 10 件、evals 4 件）、not implemented / 空関数 TODO / 常時成功テスト / as-alias re-export は 0 件。合計 23 件。
- FR-3.2: 既存ヒット 23 件の性質: いずれも docs/backward-compatibility.md に宣言済みの互換対象（旧形式 record 3 件の検査、registry status の互換許容 = Issue #455）を実装または検査するコードであり、新規混入ではない。修正ではなく許可リストへの宣言で pass にし、内訳と判断を decision に記録する。
- FR-3.3: 受け入れ時に現在の main（分岐点 7829d99a）相当のツリーで検査が pass すること。棚卸しの最終確定は functional-design で検出パターン実装形に対して再実測して行う。

## 非機能要求

- NFR-1: TDD で進める。意図的な違反 fixture（互換シンボル・stub throw・常時成功テスト・宣言済みパターン）で rule の fail / pass が転じることを eval（`lints/<rule>/eval.ts`、`test:it:lints` が自動 discovery）で先に RED から固定する。
- NFR-2: 新規依存を追加しない（Bun + TypeScript のみ。eslint は導入しない = Q1）。
- NFR-3: 誤検知の運用摩擦は許可リストで吸収する設計とし、検出パターンは「新規混入の防止」に必要な最小に留める（62 件ヒットの素朴検出は採らない = Q2）。

## 制約

- C-1: PR の merge は人間が行う。PR 説明に eslint 見送りの経緯（前提誤りの自認を含む）を記録する（leader 条件 1）。
- C-2: PR 作成前に対象 Intent の validator と `npm run test:all` を実行し、結果を記録する。
- C-3: eslint 設定に触れないため、engineer1 の #428 との接触面は発生しない（lints/ と package.json は追記型。ピア協議で engineer1 も A に賛成済み）。
- C-4: linter sensor の実質 no-op 問題はスコープ外とし、後続 Issue 起案内容を leader へ送付済み（leader 条件 2、実施済み）。

## 前提

- A-1: lints/ ハーネスの自動 discovery（rule ディレクトリの check.ts を検出）は実コードで確認済み。
- A-2: 棚卸しの実測は本ステージで grep により 2 回実施した。初回は scan scope を誤り（skills/ と昇格先の見落とし）、reviewer 指摘後に既存 rule の defaultInclude scope で再実測した。現在の正は FR-3.1 の値（宣言シンボル 9 件 / 「後方互換」コメント 14 件 / stub 兆候・alias 0 件、合計 23 件）である。検出パターン確定後に functional-design で再実測する。
- A-3: 第 2 層（gate sensor）・第 3 層（reviewer blocking 項目）は別 Issue の検討対象（Issue #528 参照節）。

## スコープ外

- eslint の導入・設定（Q1 で見送り確定）。
- linter sensor（amadeus-linter.md）の no-op 解消（後続 Issue 起案を leader へ送付済み）。
- 意味的な互換層（挙動フラグでの旧動作温存等）の決定論的検出（#529 の検討対象）。
- gate sensor 層・reviewer blocking 層（別 Issue）。

## 未解決事項

- O-1: rule 名（ディレクトリ名）と、検出カテゴリを 1 rule に統合するか no-stub / no-compat の 2 rule に分けるかは functional-design で確定する。
- O-2: 許可リストの機械可読形式（既存見出し構造との両立方法）は functional-design で確定する。
- O-3: `skills/` と `.agents/skills/` の二重コピー（promote-skill による複製で同一ロジックが 2 path に現れる）に対する宣言方式（path 個別宣言か、glob / パターンによる一括宣言か）は functional-design で確定する。二重コピーで宣言が 2 倍になる運用摩擦を避ける方向を優先する。
