上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, unit-of-work.md, requirements.md, decisions.md, technology-stack.md

本 NFR は既存技術スタック(codekb `technology-stack.md`: TypeScript/ESM・Bun ランタイム・Biome・bun test)を前提とし、新規ランタイム依存を追加しない(project.md Forbidden: Bun-only 前提維持)。

# スケーラビリティ要件 — U1 サイズ分類台帳(SizeLedger)

本書は U1(台帳生成)の**スケーラビリティ非機能特性**を、将来条件チェックリスト(requirements-analysis:c4、requirements.md:45-50)の「規模増」「別 OS」項から規定する。テストスイート全体のスケーリング・移設 intent のスケールは Out。本 intent は**設計・台帳 materialize まで**(実コード・CI 配線 Out)。

実測 ref: measurement ref `3917a283a953165866170d235d3dc25ad2fd3643`(tests/ 全域再帰、E-TPR-NR1)、テストファイル数 442(`find tests -name '*.test.ts' | wc -l` 実測 — 既存 `test_pyramid` コレクタ `scripts/metrics-snapshot.ts:34-40` walk / `:99` と同型の無制限再帰列挙。4 named subdir 限定の `find tests/{unit,integration,e2e,smoke}` はコレクタと母集団が一致せず、全域再帰へ修正)。

## SCAL-1: テスト数増加への追随(将来条件 c4「規模増」)

将来条件「テストは今後も増える」(requirements.md:47)に対する台帳の追随特性を規定する。

- **線形スケール O(ファイル数)**: `classifyTestSize` は regex 純関数であり(business-rules.md:15、`test-size.ts:49`)、台帳生成は各ファイルに対し1回の分類を行うスイープ(O(N)、performance-requirements.md PERF-1)。テスト数が 442 から M へ増えても、処理は M に線形で、超線形の劣化要因(全ペア比較・再帰的再スキャン等)を持たない。
- **強制メカニズム = スイープ再実行による機械追随**: 規模増への追随は**新規機構を要さず**、`classifyTestSize` スイープの**再実行**で機械的に達成される(requirements.md:47「分類台帳の再生成は classifyTestSize スイープの再実行で機械追随」)。size 判定は単一真実源 `classifyTestSize` に一本化されているため(business-rules.md:44-49、ADR-04)、SIGNAL_PATTERNS が変わっても台帳側のロジック変更は不要で、`test-size.ts` の1箇所が変わり台帳は自動追随する(business-rules.md:49)。
- **生成スクリプト化は将来 intent**: 再実行を CI 恒常生成として自動化する生成スクリプト化は本 intent Out(FR-1 将来条件、requirements.md:47、unit-of-work.md:68)。本ユニットは「スイープ再実行で機械追随できる形の台帳を materialize する」設計までであり、母数 442 を下回る欠落が検出可能な形(business-logic-model.md:48)を持つことで、規模変化時の再計測乖離を無音化しない。
- **数値上限は設けない**: ファイル数の上限・スケール閾値は**発明しない**(強制メカニズムが O(N) 純関数スイープであり、導出元となる上限 constant が存在しないため — constants-from-code)。tier 値域は tests/ 直下サブディレクトリ由来の**開いた集合**(既知4 named tier `unit/integration/e2e/smoke` + harness/lib 等の補助 tier、domain-entities.md:20-25)であり、新しいサブディレクトリ(新 tier)は型変更なしに台帳へ現れる(全域再帰で自動追随)。size ピラミッド規約(U2)の網羅対象は `NamedTier` に限定し、補助 tier は規約対象外で可視化のみ(E-TPR-NR1、domain-entities.md:26-27)。

## SCAL-2: 実行環境非依存(将来条件 c4「別 OS」)

将来条件「別 OS」(requirements.md:49)に対する台帳の可搬性を規定する。

- **OS 非依存 = regex 純関数**: `classifyTestSize` は regex による静的テキスト分類の純関数で、OS 固有 API・プラットフォーム分岐・ファイルシステム挙動差に依存しない(requirements.md:49「classifyTestSize は regex 純関数で OS 非依存」、ADR-04 Consequences decisions.md:96)。size 判定結果は macOS / Linux / Windows いずれでも同一ソースに対し同一(決定性、business-logic-model.md:47)。
- **パス区切りの吸収**: tier 導出はパス第1階層抽出で、区切り文字の OS 差を `split(/[\\/]/)[0]`(business-rules.md:34、`scripts/metrics-snapshot.ts:100` verbatim)が `/` と `\` の両方を吸収する。台帳の `file` は repo 相対パスに正規化される(`relative(...)`、security-requirements.md SEC-2)ため、絶対パス・ドライブレターの OS 差が台帳キーに漏れない。
- **プラットフォーム実装差への注意(実装 intent への申し送り)**: FS 読取は Bun の実装差(`readFileSync(dir)` の macOS EISDIR / Linux 空文字、team.md bun-readfilesync-dir-platform-divergence)を持つが、U1 の `buildLedgerRow` / `buildSizeLedger` は FS を触らない純関数(domain-entities.md:64-73)であり読取は駆動側所有のため、本ユニットの設計面ではプラットフォーム差の影響を受けない。実 FS 読取を伴う生成スクリプト実装(Out)での考慮事項として申し送る。

**実装スコープ境界(Out 明記)**: 生成スクリプトのスケール実測・大規模スイープのベンチ・並列化は本 intent Out(別 intent)。本書はスケーラビリティ特性の設計・宣言までである。新規スケール機構(キャッシュ・シャーディング・並列ワーカ)は要求根拠がないため追加しない(Forbidden P5、既存 O(N) 純関数で充足)。
