# Business Logic Model — U7 conformance-suite

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> unit-of-work.md U7 行(C7 = components.md の適合テスト+追跡表)。story-map ジャーニー 2「上流に追従する」「退行を検出する」の実体。services.md どおりテスト実行は既存ランナーの単発実行。
> component-methods.md の消費: C7 の専用節は component-methods.md に存在しない(C1-C6 のみ — N/A の根拠)。U7 のテストが検証する**対象契約**として C1 verb 表(未知フラグ拒否含む)・C3 投影生成物・C4 フック契約・C5 doctor 行・C6 activation 面を参照し、per-harness 層のテスト期待値はこれら component-methods.md の契約文からの転記とする。

## フロー 1: 追跡表の作成(実装より先 — bolt-plan Bolt 7 の Bolt 内順序)

```
上流 t188(commit 29a31f78)の 32 ケースを verbatim 転記
  → 各ケースへ disposition を判定:
      adopted          … Amadeus 側に対応挙動があり新規テストを書く
      covered-existing … 既存テスト(t252-254・U2-U6 で新設済みのテスト)が同一意味を既に検査 — フルパス引用+意味被覆の確認
      n-a              … Amadeus に対応面がない(根拠 1 文 — 例: 上流固有のディレクトリ慣行)
  → 表を確定してからテスト実装へ(先にテストを書くと未対応ケースが暗黙成功扱いになる — requirements FR-8 合否)
```

## フロー 2: 層別テストの実装

```
compose-semantics 層(ハーネス非依存 — 1 回だけ実行):
  合成意味論(set-union / fragment 順序 / 冪等 / 衝突拒否 / BOM / fence 境界 / drops 分離 …)
  → 既存 t252/t253 の in-process 様式を踏襲(fixture ベース)
per-harness 層(対応面別):
  投影(期待位置・トークン置換・outDir 拒否)+trigger(native hook 実起動 or 手動 fallback E2E)
  → U3/U4 の BR 検証と共有(二重実装しない — 同一挙動のテストは 1 本に集約し追跡表から参照)
```

## フロー 3: CI 編入と時間計測

既存 `tests/run-tests.sh` の 4 層(smoke/unit/integration/e2e)へ編入(新規 workflow を作らない — ci-pipeline:c2)。編入前後の CI 実行時間をコマンド出力で計測し、増分を成果物に転記(requirements FR-8 合否の「CI 時間の増分が計測される」)。

## フロー 4: upstream sync レポート拡張(FR-10)

```
upstream-sync レポート生成時:
  ConformanceReportSection を追加
    suiteResult ← 適合テスト実行の exit code(検証劇場禁止 — 実行結果からの導出のみ)
    traceCoverage ← 追跡表の機械集計
  → 「ファイル差分+適合テスト結果」の 2 根拠で追従状態を判定する様式へ
```

## 実行順(Bolt 内リスク制御 — bolt-plan 再掲)

追跡表(フロー 1)→ テスト(フロー 2)→ CI 編入(フロー 3)→ レポート拡張(フロー 4)。逆順は暗黙成功・仕様先取りを生む。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:23:38Z
- **Iteration:** 1
- **Scope decision:** none

FR-8/FR-10 被覆・順序・検証劇場禁止は整合。Major 1: component-methods が 3 成果物とも装飾トークン(本文実参照 0 件、C7 節の不在の N/A 明示もなし)。Minor 2: business-rules の services 未参照、BR-U4-3 参照の統合段再検証留意。

### Findings

- [Major] component-methods の装飾トークン化(3 成果物)— 実参照 or N/A 根拠文が必要
- [Minor] business-rules.md の services 実参照欠落
- [Minor] BR-U4-3 引用の統合段再検証留意(scope 外引用)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:24:54Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Major(component-methods 装飾トークン)は N/A 根拠+C1-C5 消費注記で解消、Minor 2 件も是正方針どおり反映。

### Findings

- None
