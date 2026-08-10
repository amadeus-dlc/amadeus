# フェーズ境界検証 — Construction → Operation

Intent: `260810-plugin-harness-dir-token` / Scope: `self-fix` / Depth: Minimal
実施日: 2026-08-10 / 対象: PR [#2811](https://github.com/amadeus-dlc/amadeus/pull/2811) head
方法論: `.claude/knowledge/amadeus-shared/verification.md`（Construction → Operation =
アーキテクチャ → コード → テストの整合、全 unit のビルド・テスト、CI 構成）

## スコープ由来の適用範囲

`self-fix` は Construction フェーズで `code-generation`（3.5）と `build-and-test`（3.6）のみを
EXECUTE する。`functional-design`（3.1）・`nfr-requirements`（3.2）・`nfr-design`（3.3）・
`infrastructure-design`（3.4）・`ci-pipeline`（3.7）は**スコープ設計により SKIP**（欠落ではない）。

Operation フェーズは全ステージ SKIP のため、本境界は実質的にワークフロー終端の直前にあたる。
したがって標準の「アーキテクチャ → コード → テスト」連鎖のうちアーキテクチャ層は
requirements.md（FR-1〜FR-9）が代替する。

## 追跡性マトリクス（Requirement → コード → テスト）

| Requirement | コード | テスト | 実測結果 |
|---|---|---|---|
| FR-1 | `plugins/pr-convergence/stages/pr-convergence.md` | `t146`（stray literal） | `.claude/tools` 0 件 / トークン 1 件 |
| FR-2 | `scripts/plugin-projection.ts` `seedPluginsTransformed()` | `t416 > plugin prose resolves to each self-install face's own harness dir` | 5 面すべて own=1 / raw=0 |
| FR-3 | `packages/framework/core/tools/amadeus-plugin.ts` `seedBytesForHarness()` / `stagingHarnessDirOf()` / `copyRealFiles` / `stagingEntryState` | `t2790` 4 テスト | codex 面 (i)=1 (ii)=0 (iii)=0、再 compose バイト一致 |
| FR-4 | （FR-1 と同じソース。経路A の既存 transform が解決） | `t-plugin-projection-packaging > all eight package faces …` | 8 面すべて自面解決 / raw=0 |
| FR-5 | — | 上記 3 テストの修正前断面 | consumer 8 面 RED → Step 4 で緑、self-install 5 面は失敗面が codex→claude へ移動して RED のまま → Step 5 で緑 |
| FR-6 | `tests/unit/t146-core-hygiene.test.ts`（走査根） | 同ファイル | 患部復元で赤（報告 1 件）、修正で緑 |
| FR-7 | 同上（`HARNESS_PATH_RE` を `allHarnessDirs()` 由来へ） | 同ファイル + `tests/helpers/harness-dir-fixture.ts` | 新規 4 dir それぞれで赤を実測（4/4）、既存 corpus 緑、carve-out 2 件維持 |
| FR-8 | 同上（walk scope 分離） | 同ファイル | core 78 件（> 50）/ plugins 1 件 |
| FR-9 | — | — | [#2810](https://github.com/amadeus-dlc/amadeus/issues/2810) 起票。PR 本文の `2810` 出現数 = 3 |

**孤児（要件を持たないコード変更）**: 1 件のみで、記録済み。
`packages/framework/core/tools/amadeus-harness.ts` の `rulesSubdirFor()` export は
どの FR にも直接紐づかないが、FR-3 の実装に必要な補助であり code-summary の逸脱 6 に記載済み。

**未実装の要件**: 0 件。FR-1〜FR-9 すべてに対応するコードまたは外形的成果がある。

## ビルド・テストの完了

| 項目 | 結果 |
|---|---|
| `bun run typecheck` / `lint` / `build` | すべて exit 0 |
| `bun run test:ci` | 933 ファイル PASS / 0 FAIL / exit 0 |
| CI（PR #2811） | 13 pass / 3 skipping / 0 fail |
| 収束 | `converged: true` / `CLEAN` / violating threads 0 |
| センサー | `pr-convergence-report-format` SENSOR_PASSED（監査行から） |

## 整合性チェック

- **人間裁定との整合**: Q1-A（seeding 側へ寄せる / compose 本体への置換器導入は却下）が実装で守られている。
  レビュアーが独立に確認済み（「置換は seeding 2 点に限定され、`amadeus-plugin-compose.ts` への
  置換器導入は summary 上どこにも現れない」）
- **成果物内の自己矛盾**: code-generation レビュー iteration 1 で 2 件（FR-3 の証跡欠落、FR-9 の
  PASS と未了の併記）を検出し、iteration 2 で CLOSED を確認済み
- **PROVEN / DEDUCED / UNMEASURED の分離**: 保持。DEDUCED は 3 件（兄弟 11 行の解決不能性、
  `stagingEntryState` を入れない場合の 2 退行、テスト失敗の負荷起因という原因帰属）で、いずれも明示ラベル付き
- **テスト種別の非該当判定**: 性能・セキュリティは「適用可能な NFR が存在しない」という判定であり、
  黙示の省略ではない。将来書き換えるべき条件も各文書に明記

## 持ち越し（すべて追跡可能な形にした）

1. [#2810](https://github.com/amadeus-dlc/amadeus/issues/2810) — 兄弟 11 行（P2、判定は DEDUCED）
2. [#2812](https://github.com/amadeus-dlc/amadeus/issues/2812) — 二実装の乖離ガード不在（P3）
3. formal-model-check の verdict 未記録 — 本 intent では `defer-with-risk` を 2 回記録（
   requirements-analysis と build-and-test の各チェックポイント）

黙って落としたものはない。

## 判定

**PASS** — 未実装要件 0 件、記録外の孤児 0 件、ビルド・テスト・CI・収束すべて緑。
Construction フェーズ完了。

## 人間承認

- [ ] 上記のフェーズ境界検証を確認した
