# Code Generation Plan — U7 conformance-suite

> 上流入力(consumes 全数): business-logic-model、business-rules、domain-entities、logical-components、performance-design、reliability-design、scalability-design、security-design、unit-of-work、requirements
>
> - business-logic-model.md フロー 1-4(追跡表 → 層別テスト → CI 編入 → レポート拡張)を実装順の骨格とする。
> - business-rules.md BR-U7-1〜8 を各成果物・テストの合否条件に写像する。
> - domain-entities.md の TraceabilityRow / ConformanceReportSection の型を `scripts/conformance-report.ts` の型に落とす。
> - logical-components.md の実装モジュール構成表(追跡表 `tests/conformance/t188-trace.md`、機械検査 integration、compose-semantics/per-harness 層、レポート拡張)を成果物の配置根拠とする。
> - reliability-design.md の追跡表様式(pin ヘッダ・機械検査 4 項)と exit code 導出設計を `t188-trace.md` と `conformance-report.ts` に反映。
> - security-design.md SEC-U7-1(scratch 隔離)は既存 in-process 様式(t252/t299 の tempdir + injected recompile)を継承し新設しない。
> - performance-design.md PERF-U7-1/2 の計測手順(層別・範囲宣言)を CI 増分計測に反映。
> - scalability-design.md SCALE-U7-1(compose-semantics 1 回実行・per-harness 共有)を disposition 設計に反映。
> - unit-of-work.md U7 行(C7、FR-8・FR-10)と requirements.md FR-8/FR-10 を範囲の権威とする。

## 上流 t188 の実測(記憶で書かない)

上流 `awslabs/aidlc-workflows` commit `29a31f78`(v2.3.0)の
`tests/integration/t188-plugin-compose.test.ts` を read-only 取得(外部参照リポジトリ、
amadeus worktree 外)し、`test(` を機械集計して **32 ケース**を確定(`grep -cE '^\s*test\('` = 32)。
各ケースのタイトルを verbatim 転記して追跡表を作成した。既存 U2-U6 テスト・engine ソースの
上流ケース引用(`t188 #21-22`・`#27-32`・`amadeus-plugin-compose.ts:192` の `t188 #24`)が、
1 始まりのテスト順の番号付けと全数一致することを実測確認した。

## disposition 判定(BR-U7-1、フロー 1 を先に確定)

Amadeus と上流のアーキテクチャ相違が disposition の根拠:

- **構造化 seam エントリ vs 本文ブロックパーサ**: Amadeus の fragment は JSON manifest 宣言の
  `{ file, anchor, id, text }`。上流の `## fragment:` 本文ブロックパーサを持たないため、fence /
  BOM / leftover / close-marker / nested-fence の本文パースハザードは構造的に不在 → n-a。
- **fail-closed 事前拒否 vs fail-open drop-with-log**: Amadeus は未解決 anchor / slug 衝突を
  mutation 前に unknown-seam / same-name-stage エラーで拒否(`amadeus-plugin-compose.ts:194`
  「rejects a missing anchor rather than dropping it」)→ 該当ケースは既存拒否テストで被覆
  (covered-existing、rationale に強契約を明記)。
- **同期インライン recompile vs 非同期 retry marker**: per-plugin 隔離は plugin-separated
  DropsRecord(`:192` が upstream #24 を明示引用)が担う → #13 retry marker は n-a。
- **`bundle` フィールド不在** → #26 は n-a。

集計(機械再計算): **adopted 2 / covered-existing 22 / n-a 8 = 32**。

## 成果物と実装

1. **`tests/conformance/t188-trace.md`**(追跡表、フロー 1 / BR-U7-1/2/7/8)
   - pin ヘッダ(`upstream-pin: 29a31f78`)+ `ci-measurement-scope` 宣言 + 32 行の表。
   - 各行: `# | upstream case(verbatim) | disposition | target | rationale`。
   - covered-existing / adopted の target はテストのフルパス + シンボル(tNNN 短形禁止 — BR-U7-7)。
   - n-a の target は `—`、rationale 1 文必須。

2. **`scripts/conformance-report.ts`**(FR-10 / BR-U7-5、フロー 4)
   - 追跡表の単一 parser(`parseTraceTable`)を機械検査テストと共有(パーサ二重実装しない)。
   - `suiteResultFromExitCode`: 0 → green / 非 0 → red。default-pass 経路なし、非整数は throw
     (fail-closed — status ハードコード・自己参照比較を構造的に排除)。
   - `parseTraceCoverage`: 追跡表の disposition 列を機械再計算(header の記載数を読まない —
     ledger-count-mechanical-recalc)。
   - `buildConformanceReportSection` / `renderConformanceReportSection`: exit code + 追跡表 +
     measuredAt から `## Conformance` 節を導出・描画。

3. **`tests/integration/t335-conformance-trace-machine-check.integration.test.ts`**(機械検査、REL-U7-1/4)
   - 実 `t188-trace.md` を parse: 32 行 / 1..32 連番 / disposition 3 値 / n-a rationale 非空 +
     test 参照ゼロ / adopted・covered-existing の target ファイル実在 / pin=29a31f78 /
     coverage 再計算 = {2,22,8}。

4. **`tests/unit/t336-conformance-report-section.test.ts`**(FR-10 純関数、落ちる実証 / REL-U7-2 / SEC-U7-2)
   - exit code 写像(0→green / 非 0→red / 非整数 throw)、parser、coverage 再計算、render。
   - 落ちる実証(両側): 非 0 exit code で section が red を描画(exit code = runtime 消費入力 —
     inject-runtime-consumed-lines)。0 で green。

5. **`tests/unit/t337-conformance-fragment-order.test.ts`**(adopted #9、compose-semantics 層)
   - 複数 fragment を宣言 anchor 位置へ host 順で splice・marker 付与・決定性(pure in-memory)。

6. **`tests/integration/t338-conformance-recompile-selfheal.integration.test.ts`**(adopted #12)
   - 素の `compose` は適用 0 件でも無条件 recompile(self-heal trigger)、`--if-stale` は
     record-keyed で recompile しない degrade を期待値固定(in-process、recompile counter 注入)。

7. **`contrib/skills/amadeus-upstream-sync/references/artifact-contracts.md`**(FR-10 レポート契約)
   - report template に `## Conformance` 節を追加。verdict は `scripts/conformance-report.ts` から
     導出しハードコード禁止と明記。`promote:self` で `.claude/` `.agents/` へ同期。

## 二重実装の回避(BR-U7-3、SCALE-U7-1)

compose-semantics・per-harness の既存挙動は追跡表の covered-existing 参照で共有し、新規テストは
真の gap(#9 fragment 順序、#12 self-heal trigger)+ FR-10 レポート導出 + 追跡表機械検査のみ。
per-harness / doctor / outdir 系は U2-U6 の既存テストへフルパス参照する。

## 隔離・境界(SEC-U7-1/3)

新規テストは in-memory(t336/t337)または tempdir + injected recompile(t338)で実行し、実 record ツリー・
audit・composition record を汚染しない。変更面はテスト・追跡表・`scripts/conformance-report.ts`・
report 契約の 4 箇所に閉じる(`scripts/` は配布対象外の dev tooling — dist / self-install に投影しない)。

## 実行順(Bolt 内リスク制御)

追跡表(+機械検査)→ 層別テスト(adopted)→ レポート拡張(FR-10)→ CI 編入・時間計測 の順で実装した
(逆順は暗黙成功・仕様先取りを生む — BR-U7-2)。
