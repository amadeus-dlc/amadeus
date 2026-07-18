上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, unit-of-work.md, requirements.md, decisions.md, technology-stack.md

本 NFR は既存技術スタック(codekb `technology-stack.md`: TypeScript/ESM・Bun ランタイム・Biome・bun test)を前提とし、新規ランタイム依存を追加しない(project.md Forbidden: Bun-only 前提維持)。

# セキュリティ要件 — U1 サイズ分類台帳(SizeLedger)

本書は U1(台帳生成)の**セキュリティ非機能特性**を、本ユニットの信頼境界と入出力の実態から規定する。テストスイート全体・移設 intent・#683 カバレッジゲートのセキュリティは本ユニット Out。本 intent は**設計・台帳 materialize まで**(実コード・CI 配線 Out、business-logic-model.md:53)。

実測 ref: 検証 HEAD `6c0faab6adf89a461aa5b3467b3f29d595ae6d60`(`git rev-parse HEAD` 実測)。

## SEC-1: 信頼境界とデータ分類(機微データなし)

U1 の入出力を信頼境界の観点で分類する。

- **入力 = リポジトリ内テストファイルのソーステキスト(信頼境界内)**: 台帳生成の入力は `tests/` 全域再帰の `*.test.ts`(442ファイル、既存コレクタと同型の無制限再帰列挙)のソーステキストのみ(business-logic-model.md:17)。これらは同一リポジトリ・同一バージョン管理下のファーストパーティコードであり、外部・ユーザー起源の untrusted 入力ではない。ネットワーク入力・標準入力・環境変数からの動的入力を受け取らない。
- **シークレット・認証情報なし**: U1 は認証情報・API キー・トークン・シークレットを一切扱わない。外部サービス呼び出し・認証境界・認可チェックを持たない(construction.md「Security」の該当機構が **N/A**、反証可能根拠: 台帳生成は純粋な静的テキスト分類であり外部システム境界を持たない)。ハードコードされた資格情報の混入リスクは構造的に存在しない。
- **出力に機微を書かない**: 台帳の各行は `{ file, tier, measured, declared, signals }`(domain-entities.md:32-38)に限る。`file` は repo 相対パス、`measured`/`declared` は `TestSize`(small/medium/large 列挙)、`signals` は検出 signal 名(network/spawn/filesystem/timer)のみ。**テストソース本文・prompt body・任意のソース断片を台帳に転記しない** — `classifyTestSize` / `parseSizeAnnotation` の**分類結果のみ**を載せる転記設計(business-rules.md:11、AC-1b numbers-from-command-output-only)であり、生ソースが台帳へ漏出しない。台帳出力の機微露出は N/A(反証可能根拠: 出力スキーマが分類ラベルに閉じ生テキストを含まない)。

## SEC-2: 境界での入力検証(ファイルパスと分類対象)

システム境界(FS 読取)での入力検証を規定する(construction.md「システム境界ではすべての入力を検証・サニタイズする」)。

- **ファイルパスの境界検証**: 列挙対象は `env.repoRoot` 配下の `tests/` サブツリーに限定し、拡張子 `.test.ts` でフィルタする(既存コレクタ `scripts/metrics-snapshot.ts:99` verbatim: `.filter((path) => path.endsWith(".test.ts"))`、`:100` の `relative(join(env.repoRoot, "tests"), file)` で repo 相対に正規化)。列挙・読取は駆動側(既存コレクタ同型の `env.listFiles` / `env.readFile` seam、business-logic-model.md:17)が所有し、`buildLedgerRow` / `buildSizeLedger` は純関数で FS を触らない(domain-entities.md:64-66)。tier 導出はディレクトリ第1階層への `split(/[\\/]/)[0]`(business-rules.md:34)で、パス外への escape を持たない。
- **入力テキストの安全な取り扱い**: `classifyTestSize` は入力ソースに対し regex マッチのみを行い、`eval`・動的 import・子プロセス起動などソースを**実行**する処理を持たない(`test-size.ts:52` のコメント除去 + `:35-40` の SIGNAL_PATTERN 照合は純粋な文字列走査、business-rules.md:15,30)。悪意あるテストソースが分類器経由でコード実行に至る経路は存在しない(静的テキスト分類のため)。
- **読取失敗の安全な縮退**: ファイル読取失敗は該当行を欠落として記録し全体を停止しない(business-logic-model.md:46)。失敗を握りつぶさず可視化する(サイレント失敗の禁止、business-logic-model.md:48)ため、部分読取による**無音のデータ欠落で誤った台帳を confident に出す**フェイルオープンを防ぐ。reliability-requirements.md 参照。

**実装スコープ境界(Out 明記)**: 生成スクリプトの実装・FS アクセス制御の実配線・CI 実行環境のセキュリティは本 intent Out(別 intent)。本書はセキュリティ特性の設計・宣言までである。後方互換シム・二重実装は追加しない(Forbidden P5)。
