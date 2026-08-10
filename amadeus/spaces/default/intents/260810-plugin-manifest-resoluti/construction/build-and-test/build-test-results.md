# Build & Test Results — 260810-plugin-manifest-resoluti

Upstream: `construction/fix-2823-plugin-manifest-resolution/code-generation/code-generation-plan.md` / `code-summary.md`
観測: branch `issue-2823-self-fix`、fix 適用後の working tree。全コマンド repo root で実行(FR-8 のみ /tmp scratch)

## Build

| コマンド | exit | 結果 |
|---|---|---|
| `bun run build` | 0 | dist 全面再生成 + self-install 更新 |
| `bun run lint` | 0 | 既存 baseline の complexity warning のみ。touch 6 ファイルの新規診断 0(HEAD 版との新旧比較で実測: amadeus-advisory-choice.ts の complexity warning は HEAD 時点でも 6 件で不変) |
| `bun run typecheck` | 0 | — |

## Focused tests(修正の直接検証面)

| コマンド | exit | 結果 |
|---|---|---|
| `bun test tests/unit/t444-advisory-declaration.test.ts tests/integration/t445-advisory-declaration-supply.integration.test.ts tests/integration/t353-plugin-install-verb.integration.test.ts tests/integration/t532-plugin-manifest-argv-guard.integration.test.ts tests/integration/t526-* tests/integration/t528-* tests/integration/t529-*` | 0 | 87 pass / 0 fail(code-generation 時) |
| 追加回帰(t458 / t527 / t445-tla-applicability-cli / t-advisory-human-choice-boundaries / t203 / t113) | 0 | 136 pass / 0 fail(同上) |
| 上記 focused 7 ファイルの B&T 再実行 | 0 | 全 pass(下記「B&T 再確認」) |

## Failing-first 証跡(FR-7 受入の赤 half、reviewer FOLLOW-UP 対応)

HEAD(`7b9391be2db4fad791d637293ea442d5a1462bac`、fix 未適用)の `git worktree`(/tmp/xrev2823-head-wt)に新規・変更テスト4ファイルのみをコピーして実行:

| テスト | HEAD での結果 | 判定 |
|---|---|---|
| t532(drift guard) | FAIL(assertion: plugin.json:61 の root-relative 文字列を検出) | 赤 ✓ |
| t353(install verb join) | FAIL(assertion) | 赤 ✓ |
| t444(resolver 単体) | module load error(`Export named 'resolvePluginManifest' not found`) | 赤 ✓ |
| t445(consumer-layout describe) | 同 export 不存在により fail | 赤 ✓ |

(環境注記: worktree は dist 未 build のため `tests/harness/v1-audit-fixture.ts` 由来の unhandled error が 2 件出るが、本測定の対象外)

## FR-8 consumer 実測(Issue 完了条件1)

実測ログ全文: `/tmp/xrev2823-fr8-results.md`(raw log: `/tmp/xrev2823-arm{1,2}-*.{out,err}`)。scratch: `/tmp/xrev2823-consumer-fd` / `-verb`(repo 外)

| Arm | Manifest 発見 | Evaluator 実行 | 無音でないこと |
|---|---|---|---|
| 1 folder-drop(consumer 形、repo-root `plugins/` なし) | YES(staging 面。不在時のみ FR-4 warning が両候補パスを名指しで出る対照実測つき) | YES(`bun tools/tla-authoring.ts advisory hold` が staging 面から実行、typed `no-hold` exit 0。argv 破損対照で fail-closed `authoring-hold` advisory 発火) | YES(無音経路は消滅) |
| 2 install verb | YES(authoring 面優先の実測つき) | YES(同対照) | YES |

結論: FR-8(a)(b) ともに **PASS**。修正前の単一面 probe(main:261 の `return []`)は consumer では無音不発火だったが、修正後は両文書化腕で advisory 供給が到達する

## 副次的発見(本 fix の範囲外・main で既存)

1. **宣言 advisory の directive 同梱が emit guard に拒否される**: fired した宣言 advisory(code が `not-ready|changed|never-run` 以外)を載せた directive は `amadeus-directive.ts` の `ADVISORY_CODES` validator に拒否され exit 1。wire 型は宣言 code を許容するよう一般化済みだが validator が未追随。`git show main:...` で既存確認済み(本 fix の regression ではない)。フォローアップ起票候補
2. `install <path>` は basename を plugin 名にするため bundle ルートを渡すと `claude` 名で install される。INSTALL.md が正確なパス(inner `plugins/formal-model-check`)を明記していない(usability note)

## 全体回帰

- `bun run test:ci`(全件並列): **FAIL**(exit 3)。失敗は 3 群で、いずれも本変更と無交差であることを HEAD 対照で実測:
  1. `t-team-up-run-lifecycle.serial` / `t-team-up-codex-safety-wait(-ready-evidence)` / `t-team-up-msg-backend`: プロセス・herdr バイナリ依存。HEAD worktree(fix 未適用)で**同一シグネチャ**(run-lifecycle: 22 pass/16 fail、3 ファイル群: 35 pass/2 fail)を再現 — 既存の環境起因失敗。これらのテストは advisory 系モジュールを一切 import しない(grep 実測)
  2. `t-test-size-drift`(layer × size purity): 壁時計ベースの size 判定で、並列負荷下の環境起因
- focused 7 ファイル + 回帰 6 ファイルは全緑(上表)。本変更面の回帰は 0 件

## B&T 再確認

- focused 4 ファイル(t444/t445/t353/t532)の B&T 再実行: exit 0、74 pass / 0 fail / 205 assertions
