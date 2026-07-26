# Business Logic Model — U5 doctor-observability

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> story-map ジャーニー 1「確かめる」の実体。unit-of-work.md U5 行(C5 の doctor 統合)を `amadeus-utility.ts` の既存 doctor 経路へ編入する。services.md どおり単発 CLI 実行・読み取り専用。

## フロー: doctor plugin 節の構築

```
/amadeus --doctor(既存 utility 経路)
  → diagnosePlugins(host snapshot)          … 既存 engine(判定はここが正)
  → composition record 読取(revision)       … 既存 record 機構
  → U6 ActivationJudgment(compose 済み formal-model-check がある場合のみ)… U6 の判定関数を呼ぶ(表示のみ)
  → DoctorPluginSection へ射影 → 行整形 → 既存 doctor 出力へ節追加
  → exitContribution を既存 doctor 集約 exit へ合流([degraded] は FAIL)
```

## 分岐(全列挙)

| 状態 | 表示 | exit 寄与 |
|---|---|---|
| 0-plugin | `Plugins: 0 installed` 1 行 | pass |
| composed・健全 | `- <name> composed@<rev> [ok]` | pass |
| drift 検出 | `[drift: <detail>]` | pass(既存 drift ガードの責務と重複させない — 表示のみ) |
| **recovery-pending**(journal 残存) | `[recovery-pending: run compose to recover]` | **fail**(中断状態の放置は FR-6/NFR-1 の安全パス — 必ず可視) |
| degraded drop あり(DropsRecord) | `[degraded: <surface>]` | **fail** |
| advisory drop あり(DropsRecord) | `[advisory: <surface>]` | pass(PASS(advisory)) |
| activation changed | `(activation) formal-model-check: spec-hash CHANGED` | pass(advisory 扱い) |

分岐は diagnosePlugins の実戻り値(`composed | drift | recovery-pending` — scripts/plugin-composition.ts:224 実測)+DropsRecord(domain-entities 新設 — 書き手は compose 経路)+U6 判定からの機械写像であり、doctor 側での再判定・推測を禁止する。

## 実装位置

- 節構築の純関数(`buildDoctorPluginSection(diag, record, judgment): DoctorPluginSection`)を export し in-process テスト(seam-export-handler-amend)
- `amadeus-utility.ts` の doctor ハンドラへの編入は「Adding a Utility Handler」チェックリスト対象外(既存 --doctor の節追加であり新 verb ではない)だが、既存 doctor テスト(t-print-*-doctor 系)の期待出力更新を同一変更で行う

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:04:41Z
- **Iteration:** 1
- **Scope decision:** none

Critical 1: diagnosePlugins の実戻り値(composed|drift|recovery-pending)に対し recovery-pending が分岐表・DoctorLine.state から欠落。Major 1: degraded/advisory/droppedSurfaces の投影元が現行型に存在せず、書き手 Unit が未申告のまま「射影のみ」と断定。Minor 1: silent drop 可視性の直接 assert が検証節に欠落。

### Findings

- [Critical] recovery-pending 状態の構造的欠落(PluginDiagnostic.status 実測 3 値 vs FD 列挙)— FR-6/NFR-1 の安全パスが可観測性から漏れる
- [Major] degraded/advisory/droppedSurfaces の投影元(drops 記録)の書き手 Unit 未申告 — cross-unit 依存の未定義
- [Minor] BR-U5-2 検証節に可視性(行出現)の直接 assert 欠落

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:06:40Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の 3 指摘は全て閉包。recovery-pending の分岐・型追加(U2 正本へ申告付き反映)、DropsRecord の新設定義と書き手申告(U2 骨格/U4 エントリ/U5 読取のみ)、可視性の直接 assert 明記。

### Findings

- None
