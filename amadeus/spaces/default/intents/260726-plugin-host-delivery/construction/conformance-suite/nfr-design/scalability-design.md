# スケーラビリティ設計 — U7 conformance-suite

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## SCALE-U7-1 への設計: ケース数固定と層別による組合せ抑制

`scalability-requirements.md` SCALE-U7-1 のとおり、テスト総数の構造を「32(固定)= compose-semantics 層(面数非依存・1 回実行)+ per-harness 層(面数線形)」へ層別で分解する:

- 追跡表(reliability-design.md の様式)は上流 pin `29a31f78` の 32 行で固定され、本 intent 内で増えない(`reliability-requirements.md` REL-U7-4 の pin 固定)
- compose-semantics 層(合成意味論: set-union / fragment 順序 / 冪等 / 衝突拒否 / BOM / fence 境界 / drops 分離 — `business-logic-model.md` フロー 2)はハーネス非依存の fixture テストで 1 回だけ実行し、面数に対して定数
- per-harness 層は U2-U6 の BR 検証テストとの共有(covered-existing 参照)を既定とし、新規追加は adopted 分のみ — ケース数×面数の直積を作らない(`performance-requirements.md` PERF-U7-1 の CI 増分抑制と同一構造)

## SCALE-U7-2 への設計: 面追加時の線形拡張

`scalability-requirements.md` SCALE-U7-2 のとおり、対応面の追加時は per-harness 層の該当面テストのみが増え、compose-semantics 層・追跡表構造(列様式)は不変とする。追跡表の disposition 列は面別サブ列を持たない設計(per-harness の面別期待値はテスト側に置き、表はテストへのフルパス参照のみ)にすることで、面追加が表の様式変更を要求しない。

## 非該当カテゴリ

N/A — `scalability-requirements.md` 非該当カテゴリ(水平スケーリング / 上流ケース数の無制限追従)の N/A を参照継承。`security-requirements.md` SEC-U7-1 の scratch 分離はテスト数へ比例するが tempdir の使い捨てで完結し、スケーリング機構を要しない。
