# Business Logic Model — u2-residue-deletion

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

u2 は実験残骸の純削除 Unit(unit-of-work.md の u2、components.md C10 の削除面、FR-A5)。story-map の「残骸のない実行器ツリー(保守面の純減)」に対応する。新規ロジックはなく、本書は削除の**対象決定規則**と**不変条件**をモデル化する。台帳の分類 A/B/C 分 remap は u1 へ帰属改訂済み(2026-07-31 ユーザー裁定)— u2 は分類 D 分の**削除**のみを扱う。

## 対象決定規則

| # | 規則 | 導出 |
|---|---|---|
| D1 | 分類 D 30 ファイルの削除 | domain-entities.md E1 の固定目録(u1 完了後に `scripts/formal-verif/` へ残る全ファイル — 実装時に `ls scripts/formal-verif/` で 30 件と機械照合してから削除) |
| D2 | 参照テスト・fixture・support の処理 | **列挙規則+3値判定**: `grep -rl "formal-verif/<D の各ファイル名>" tests/` の和集合を対象とし、各テストを (i) **削除** — 被検対象が分類 D 自体(D 専用テスト) (ii) **import 書き換え** — 被検対象は A/B/C だが barrel `index.ts`(D 分類・A シンボルの再輸出を含む)経由で import している場合、移設後の A/B/C モジュール直 import へ書き換える(実測例: t-formal-verif-run-model-check.test.ts:2-7 の modelCheckExitCode 等は index.ts:27-36 経由の A シンボル — 削除でなく書き換え。同型 6 ファイルを reviewer が実測: tlc-public-surface / tla-skeleton-public-surface / run-model-check / fixture-scan / fixture-store / tlc-cache) (iii) **部分外科** — A/B/C と D の両方を被検する混在テスト(実測例: t-formal-verif-fixture-store.integration.test.ts:5-11)は D 被検部分のみ除去し、残部の green を個別確認。tests/formal-verif/{fixtures,support}/ も同じ3値判定(A/B/C 系 runner が使う fixture は残す) |
| D3 | complexity-baseline の分類 D エントリ削除 | `grep '"scripts/formal-verif/' tests/.complexity-baseline.json` の結果から分類 D ファイル名と intersect(起草時実測スナップショット: 22 件中 20 件が D — 実装時に再 grep) |
| D4 | coverage-patch-allowlist の分類 D エントリ削除 | 同様に intersect(起草時スナップショット: 28 件中 14 件が D。tests/formal-verif/support/ の4エントリ :303-324 も削除対象のテスト側に随伴) |
| D5 | coverage registry / EXPECTED 台帳の追従 | 削除テストが tests/gen-coverage-registry.ts の母集団に載っている場合は再生成(integration-registry-regen — 削除でもテスト宇宙が変わる) |

## 不変条件

- **I1(green 維持)**: 削除後に `bash tests/run-tests.sh --ci` 全 green — 削除対象は到達不能コード+その専用テストのみで、残存テストの依存を壊さない(D2 の除外判定が保証。判定は実装時 grep で機械化)。
- **I2(終状態)**: `test -d scripts/formal-verif` exit 1(u1/u2 帰属裁定どおり本 Unit で達成)。
- **I3(台帳 stale 0)**: baseline / allowlist に削除ファイルを指す stale エントリが残らない(stale 検査+reason 直読照合 — c1-allowlist-mechanical-remap)。
- **I4(出典の保存)**: ノルムが出典として引く成果レポート(experiment/eligibility-report.md — record 配下)はコードでないため削除対象外(RA Q2 裁定の根拠)。
- **I5(u1 前提)**: u2 は u1 の着地(24 ファイル移設済み)を前提とする(edge block の depends_on どおり)。u1 未着地での実行は D1 の 30 件照合が不一致になり停止する(fail-closed)。

## 実行順序

D1(30 件照合→削除)→ D2(参照テスト群)→ D3/D4(台帳)→ D5(registry 再生成)→ dist 再生成(dist に投影されていた場合)→ 検証一式。1 PR 想定(bolt-plan: 割ると各 PR の焦点が失われる)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T12:46:50Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 NOT-READY(Major: D2 の3値判定欠落=barrel index.ts の6テスト実測 / Major: questions・memory 不在 / Minor: 装飾ヘッダ)→ 3値判定焼き込み+0問様式整備(ユーザー一括承認)+実参照化で是正。iteration 2 READY — 30/24 分割の機械再構成一致・A/B/C→D 参照 0 件の独立裏取り付き。UTC 2026-07-31T12:46:01Z

### Findings

- iteration1 Major: D2 に import 書き換え(barrel 経由 A シンボル)の第3経路欠落 — 3値判定へ是正
- iteration1 Major: functional-design-questions.md / memory.md 不在 — 0問様式+E-OC1 証跡で整備
- iteration1 Minor: domain-entities ヘッダの装飾トークン — 実参照文追加で是正
