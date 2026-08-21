# Unit of Work — 260821-fmc-retirement

上流入力: `application-design/components.md`・`component-methods.md`・`component-dependency.md`・`decisions.md`(ADR-6 = 単一 Bolt)・`services.md`、`requirements-analysis/requirements.md`。

## U1: fmc-retirement(単一 unit)

- **kind**: `packaging`(canonical kind — プラグイン構成・投影・conformance fixture・CI 配線というパッケージング面の変更が中心。単一宣言)
- **相対複雑度**: **XL**(168 ファイル削除 + 約 85 ファイル部分編集 + 新設 2 面)
- **Deployment model**: `shared`(フレームワーク共有面 — CI・config・docs・投影を横断)
- **目的**: FMC プラグイン完全退役の全量(FR-DEL-1〜4 / FR-TEST-1〜6 / FR-CI-1〜3 / FR-DOC-1〜3)。FR-NORM-1 / FR-ISS-1 は着地後アクション(unit の write scope 外 — pr-convergence 後段で conductor が実行)
- **独立実装可能性**: 本 intent の全実装が 1 unit — 分割すると中間赤が構造的に生じる(ADR-6、component-dependency の禁止逆順 4 種)ため、単一 unit が「独立に価値を出荷できる最小境界」
- **規模見積(数値)**: 削除 −44,000 行超(168 ファイル)/ 新設 +240〜380 行(合成 fixture 120〜180 + O-5 代替テスト 2 本 120〜200)/ 編集 B1 16 + B2 44 + docs 20 + CI/config/mise/RE 本文 = 約 85 ファイルの部分編集(各 1〜30 行)
- **テスト計画**: 差し替え後の t341(protected spec — 改変検知対象)・B1 16 件・A2 温存 4 件・O-5 代替 2 本の green + フル blocking 集合はリモート CI 正本

### write scope(ソース面 — 全数)

| 面 | 内容 |
|---|---|
| 削除 | `plugins/formal-model-check/**`(43)、`amadeus/spaces/default/specs/tla/**`(14)、`specs/tla-evidence/**`(7)、テスト A1 92 + A2 再分類 4、**docs 全面削除 4**(`docs/reference/21-formal-model-following{,.ja}.md`・`docs/reference/22-formal-model-supply{,.ja}.md`)— 削除合計 43+21+92+4+4 = **164 ファイル + A2 温存改修対象を除く**(requirements の 168 = 上記 164 + A2 温存改修 4 を含む class A 全数計上の差。実装時は本表が正) |
| 新設 | `tests/fixtures/conformance-fixture-plugin/**`、O-5 代替テスト 2 本、docs 休眠明記 1 文 |
| 編集 | テスト B1 16・A2 温存 4(うち `tests/harness/formal-model-fixture.ts` は改名改修)・B2 44、`amadeus/config.json`、`.github/workflows/ci.yml`、`scripts/detect-ci-changes.sh`、`mise.toml`、`packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md`、`packages/framework/core/tools/amadeus-lib.ts`(コメント 1 行)、**t2415 ×2(`tests/integration/t2415-re-scan-exclusion-contract.integration.test.ts` / `t2415-re-scan-exclusion.integration.test.ts` — RE 本文と同一コミットで更新、ADR-5)**、docs 20 面(部分除去 16 + 索引 4) |

### write scope(生成台帳面 — ソース面と書き分けて宣言、cid:units-generation:c4)

| 台帳 | 解決手順 |
|---|---|
| `tests/.coverage-registry.json` | `bun run build` 後に `bun tests/gen-coverage-registry.ts` regen |
| `tests/.coverage-patch-allowlist.json` | FMC 該当エントリの除去(regen 形では閉じない — 手動除去 + gate の semantic selector 整合) |
| 生成 runner(`.claude/skills/amadeus-*` ほか投影) | `bun run build` + `amadeus-runner-gen.ts write` で再生成(未追跡投影) |
| `tests/fixtures/formal-verif-ci-baseline.sha256` ほか台帳 5 件(166−161 の差分 — §12a FOLLOW-UP の照合対象) | code-generation 着手時に 5 件を実名列挙し各の削除/更新を確定 |

単一 unit のため unit 間の write scope 交差は構造的に不存在。

## 着地後アクション(unit 外 — conductor 所有)

- FR-NORM-1: 失効 cid 整理の単独ノルム PR(所有: conductor、時期: Bolt 着地後、成果物: team.md/project.md 改訂 PR — §12a FOLLOW-UP の閉包点)
- FR-ISS-1: FMC 系 open Issue のクローズ(services.md の手順)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-21T04:18:46Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY: 契約必須の yaml edge block・canonical kind・S/M/L/XL・deployment model が不在、write scope に docs 全面削除 4 件欠落

### Findings

- BLOCKER | unit-of-work-dependency.md に契約 REQUIRED の fenced yaml edge block(units/name/kind/depends_on)不在 — 単一 unit でも省略不可
- BLOCKER | unit-of-work.md に U1 の canonical kind 宣言なし(service/spec/ui/packaging/library)
- BLOCKER | unit-of-work.md に S/M/L/XL 相対複雑度と deployment model(standalone/shared/embedded)不在 — 数値見積は代替にならない
- BLOCKER | write scope 削除行に docs 全面削除 4 件(reference/21・22 対訳ペア)欠落 — 削除合計 160≠168
- FOLLOW-UP | t2415×2 の同時更新対象としての明示列挙を write scope へ(B2 暗黙包含では不確定)
- FOLLOW-UP | story-map の着地後アクション行に unit 外 N/A ラベル明示
- NIT | dependency に Parallel/spanning の N/A 一言

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-21T04:23:02Z
- **Iteration:** 2
- **Scope decision:** none

READY: iteration 1 の BLOCKER 4 件全解消・新規矛盾なし。B2 44 vs 45 の数値ドリフトは既存 reconciliation FOLLOW-UP へ吸収

### Findings

- FOLLOW-UP | B2 44 vs 45 の数値ドリフト — code-generation 着手時の 166 パス reconciliation で同時確定
- NIT | 削除合計注記(164/168)の一文要約を実装者向けに添えると明快
