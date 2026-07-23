# Code Generation Plan — fix-1294-t241-residency

上流入力(consumes 全数): requirements.md(FR-1〜4 / NFR-1〜4)、reverse-engineering/scan-notes.md。

## 目的

`tests/e2e/t241-election-machine-executor.test.ts`(FR-0 機械実行器、ADR-6 layer (i))を、ヘッダが自称する「CI-resident / standing proof」を実行実態と一致させるため `tests/integration/` へ移設し、随伴面(ヘッダ表記・ファイル名 suffix・coverage registry pin・docs)を全数整合させる。ADR-6(decisions.md:44「integration テストで固定する」)への実装回復。

## 変更対象目録(FR 別)

| FR | 変更 | file:line |
|---|---|---|
| FR-1 | t241 を `tests/e2e/` → `tests/integration/` へ移設し `t241-election-machine-executor.integration.test.ts` へ rename(FR-2d 同時) | `mv` |
| FR-2a | ヘッダの layer/tier 表記を integration 実態一致へ更新(`// Layer: integration` 追記、兄弟 t236/t240 慣習)。CI-resident 主張は integration=--ci 実行により真になるため維持 | 移設ファイル :1-7 |
| FR-2b | coverage registry pin 更新: `EXPECTED_NONE_TO_CLI` の `e2e/t241-...test.ts` → `integration/t241-...integration.test.ts` | `tests/unit/gen-coverage-registry.test.ts:857` |
| FR-2c | runner 実行対象: `tests/integration/` 配下は `--ci` の integration スキャン(readdirSync, run-tests.ts:1007-1016)で自動発見。明示登録不要 | (配置で充足) |
| FR-2d | ファイル名 `*.integration.test.ts` suffix(integration 兄弟の全数慣習) | FR-1 rename に同梱 |
| FR-2e | docs 面棚卸し: 対象語彙(t241 / election-machine-executor / CI-resident)を docs/+knowledge/ 両域 grep。実測 0 件(下記)。generic な docs/reference/09-testing.md は t241 個別記述を持たず更新不要 | (0 件記録) |
| FR-3 | 移設後 `bash tests/run-tests.sh --ci` で t241 実行痕跡を確認し code-summary へ転記 | 検証 |
| FR-4 | `classifyTestSize` 静的判定(spawn→medium)が integration MAX=medium に適合 = ratchet/purity green を実測 | 検証 |
| NFR-1 | 再発ガード(CI-resident 表明×非 --ci 層)導入判断 → **導入**(下記) | 新規 integration test |

## パス不変の確認

`tests/integration/` と `tests/e2e/` はともに `tests/` 直下1階層。SCRIPT 解決 `join(import.meta.dir, "..", "..", "scripts", "amadeus-election.ts")` は移設後も有効(相対深さ不変)。パス書き換え不要。

## NFR-1 判断: 再発ガード導入

- **判断: 導入する**(integration 層の新規決定的テスト)。
- 根拠: size-purity guard は e2e への spawn テスト配置を許容する(e2e MAX=large)ため「CI-resident 表明を持つテストが --ci 非実行層(e2e)に置かれる」欠陥クラスを構造的に検出しない。真の gap。マーカー `CI-resident` は tests/ 全域で t241 単独(corpus sweep 実測)= 一意で greppable、write⇔check 対称の低コスト guard が成立。
- 設計: 全 `tests/**/*.test.ts` を走査し、本文に `CI-resident` を含むファイルの scope が `--ci` 実行集合(smoke/unit/integration)であること(= `e2e` でないこと)を assert。fs 走査 → medium → integration 層へ配置(fs-tests-integration-first, E-MTR-CG)。
- 完成条件(Mandated「落ちる実証」+ cid:corpus-sweep-for-new-guards): (i) 落ちる実証 = 一時的に e2e ファイルへ `CI-resident` マーカーを注入 → guard red を実測 → 除去 (ii) 既存 corpus 全数 sweep = 述語を live 全 test へ適用し、正当な既存データ(移設後 t241 のみが marker 保持・integration 在)で green を実測。

## 検証手順(同期・パイプ越し exit capture 禁止)

1. `bun run typecheck`
2. `bun run lint`
3. `bun test tests/integration/t241-election-machine-executor.integration.test.ts`(単体)
4. `bun test tests/integration/<新規guard>.integration.test.ts`(単体)
5. `bun test tests/unit/t-test-size-drift.test.ts`(purity/ratchet, FR-4)
6. `bun test tests/unit/gen-coverage-registry.test.ts`(pin 整合, FR-2b)
7. `bun tests/gen-coverage-registry.ts --check`
8. `bash tests/run-tests.sh --ci`(t241 実行痕跡確認込み, FR-3 / NFR-2)
9. `bun run dist:check` / `bun run promote:self:check`(NFR-3 非交差)

各コマンドの exit code を集計出力から転記し code-summary へ記録する。

## docs/knowledge grep 実測(FR-2e, measure ref: HEAD 78bce87)

- `grep -rn "t241" docs/` → 0 件
- `grep -rn "t241|election-machine-executor|machine-executor" docs/ amadeus/spaces/default/knowledge/ .claude/knowledge/` → 0 件
- `grep -rln "CI-resident" docs/ .claude/knowledge/` → 0 件
→ docs/knowledge 両域に t241 個別記述なし。09-testing.md の generic な level 記述は t241 非依存で更新不要。codekb(re-scan 済み記録)は RE 成果物であり本 FR の docs 対象外。

## 逸脱

現時点で要件・設計からの逸脱なし。実装中に逸脱の必要を検知したら停止して報告する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:07:40Z
- **Iteration:** 1
- **Scope decision:** none

READY(GoA 2、conductor 実測4件を条件)— 実測完了: M1 は requirements 側の引用誤り(実体 tests/unit/gen-coverage-registry.test.ts:855、実装正)、m1 マーカー機構実在、t237 復元 diff 0、Layer ヘッダ慣習一致。全条件充足を diary 固定

### Findings

- Major(解消): FR-2b の EXPECTED_NONE_TO_CLI 参照が requirements.md で誤ファイル — conductor 実測で実体 :855 を確定、実装は正、requirements 起草時の引用誤りとして PM 回付
- Minor(解消): t257 マーカーの literal/合成の2箇所は別機構と実測確認
- Minor(解消): 94 tests は cid 例示数値で閾値要求でないと確認
