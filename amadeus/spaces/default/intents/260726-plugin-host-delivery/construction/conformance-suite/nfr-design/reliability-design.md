# 信頼性設計 — U7 conformance-suite

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## REL-U7-1/4 への設計: 追跡表の置き場所と様式

`reliability-requirements.md` REL-U7-1(32/32 被覆)と REL-U7-4(表が先・pin 固定)を満たす追跡表を次のとおり設計する:

- **置き場所**: `tests/conformance/t188-trace.md` — テストと同じツリーに置き版管理する。理由: (a) 機械検査(下記)がテスト実行と同一チェックアウトで表を読める (b) BR-U7-2「表のコミットがテスト追加コミットに先行」を同一リポの履歴で監査できる (c) intent record(裁定の場)でなくリポ側(実装の場)に置くことで、後続 intent の上流再同期時も表が実装と同居し陳腐化しない
- **様式**(1 ケース 1 行の Markdown 表):

```
# t188 conformance trace
upstream-pin: 29a31f78          ← BR-U7-8(A-4)。ヘッダ必須
ci-measurement-scope: smoke/unit/integration(e2e は --ci 非対象 — PERF-U7-2 の範囲宣言)

| # | upstream case(verbatim) | disposition | target | rationale |
   disposition … adopted | covered-existing | n-a の 3 値 literal
   target      … adopted/covered-existing はテストのフルパス+シンボル(tNNN 短形禁止 — BR-U7-7)
   rationale   … n-a は根拠 1 文必須。他は空可
```

- **機械検査**: 表を parse して (a) 行数 === 32 (b) disposition 空欄 0・3 値以外 0 (c) n-a 行の rationale 非空 (d) adopted/covered-existing の target ファイル実在、を assert する integration テストを表と同時に追加する(count=32 の機械検査 — REL-U7-1 合否)。covered-existing の**意味被覆**は機械化せずレビュー観点として残す(BR-U7-3/7)

## REL-U7-2 への設計: レポート欄の exit code 導出

`reliability-requirements.md` REL-U7-2(BR-U7-5、検証劇場禁止)の ConformanceReportSection を次のとおり設計する:

```
suiteResult    ← 適合テスト実行プロセスの実 exit code からの写像のみ(0 → pass / 非 0 → fail)
traceCoverage  ← 追跡表の機械集計(上記 parse の再利用 — adopted/covered-existing/n-a の件数)
```

- suiteResult の値域に「実行せず pass」を表現する経路を作らない: レポート生成は exit code を引数に受ける純関数とし、既定値・フォールバック pass を持たない(exit code 未提供は fail でなく**レポート生成自体のエラー** — fail-closed)。status のハードコード・自己参照比較は構造的に不能
- 落ちる実証: 意図的 red(runtime 消費行への注入 — `security-requirements.md` SEC-U7-2 と共有)でレポートが red を示すことを fixture で固定

## REL-U7-3 への設計: 実起動検証

`reliability-requirements.md` REL-U7-3 の per-harness trigger 検証は U4 の実起動テスト(U4 reliability-design 参照)と共有し、追跡表から covered-existing でフルパス参照する(二重実装しない — `performance-requirements.md` PERF-U7-1 / `scalability-requirements.md` SCALE-U7-1 と同一の共有構造)。未対応・degrade 面は「degrade されること」自体を期待値として固定する(暗黙成功禁止)。scratch 隔離は `security-requirements.md` SEC-U7-1 に従う。

## 実行順(Bolt 内リスク制御)

`business-logic-model.md` 実行順のとおり、表(+機械検査)→ テスト → CI 編入 → レポート拡張の順でコミットする。逆順は暗黙成功・仕様先取りを生む(BR-U7-2)。

## 非該当カテゴリ

N/A — `reliability-requirements.md` 非該当カテゴリ(可用性 SLO / リトライ)の N/A を参照継承。
