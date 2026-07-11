# RE スキャン記録 — 260711-docs-repair-batch9

## 実行メタデータ

- Intent: `260711-docs-repair-batch9`(scope `bugfix`)
- Stage: `reverse-engineering`(2.1)、Developer スキャン → Architect 合成の2サブエージェント直列(cid:reverse-engineering:c3)
- 手法: 既存 codekb への diff-refresh(フルスキャン禁止、cid:reverse-engineering:c1)
- **Base commit**: `b845478bbf25a534a59f97f18e5a4a2a5a4e239c`(前回 intent 260710-bughunt-fix-batch の observed。全 re-scan observed 候補の HEAD 祖先性を判定し最短距離59の最新祖先を採用。batch7/batch8 は RE 未実行で re-scan 記録なし)
- **Observed commit**: `13598b752b656cc9bbf5d931f8e3a6c34881fd1c`(現 HEAD = origin/main)
- **base..observed コミット数**: 59(`git rev-list --count b845478bb..HEAD`)
- Date: 2026-07-11
- Focus: #812 #824 #680 #885 #886

## base 決定の実測根拠

`re-scans/*.md` の全 observed SHA 候補について `git merge-base --is-ancestor <sha> HEAD` + `git rev-list --count <sha>..HEAD` で判定:

| observed 候補 | 出所 re-scan | HEAD 祖先? | HEAD までの距離 |
|---|---|---|---|
| `b845478bb…` | 260710-bughunt-fix-batch | YES | **59**(最小=採用) |
| `11c52f153f…` | 260710-swarm-worktree-batch | NO(squash 別 SHA) | — |
| `fc5a34cf19…` | 260710-mint-presence-vectors | YES | 100 |
| `e1a07fada3…` | 260710-kiro-stale-hooks | YES | 190 |
| `98089faf17…` | 260710-codecov-project-gate | YES | 403 |

## diff 実測(フォーカス面)

`git diff --name-status b845478bb..HEAD -- <focus paths>`:

| ファイル | 区間内変更 | 関連 Issue |
|---|---|---|
| `harness/kiro-ide/skills/amadeus/SKILL.md` | **なし** | #812(区間外の既存欠陥) |
| `harness/kiro-ide/onboarding.fills.ts` | **なし** | #824(区間外の既存欠陥) |
| `core/tools/amadeus-sensor-type-check.ts` | **なし** | #680(区間外の既存欠陥) |
| `core/tools/amadeus-lib.ts` | M | #885(slug 正規化面) |
| `core/tools/amadeus-worktree.ts` | M | #885 |
| `core/tools/amadeus-state.ts` | M | #885 / #886(#880 flip 配線・行番号シフト) |

**帰結**: #812/#824/#680 の欠陥3ファイルは区間内で一切変更されず欠陥が区間を貫通して現存。#885/#886 の lib/worktree/state は区間内で #880(`c4304edf4` flip 配線)・#869(`aac1869e4` jump per-phase)の変更を受けたが、欠陥自体(normalizeWorktreeSlug 喪失 / phase-check ゲート喪失)は現行コードに未修復のまま残存。Always-rerun-for-freshness は差分実測で満たした。

## フォーカス5欠陥の現存確認(observed HEAD 直読)

- **#812**(byte-copy localize 漏れ): `diff harness/kiro/skills/amadeus/SKILL.md harness/kiro-ide/skills/amadeus/SKILL.md` = IDENTICAL。kiro-ide 側 `:14` `Kiro CLI harness` 見出し・`:84` `kiro-cli chat` CLI 固有 caveat 残存。references/ サブディレクトリ不在で対照面は SKILL.md 本体に限定。
- **#824**(localize 部分漏れ): kiro-ide onboarding.fills.ts は `:13`/`:37` の2箇所のみ localize 済、7箇所に kiro CLI 表記残存(`:1` ヘッダ / `:15` / `:17`×2 / `:26` / `:30`)。`:26` guide_pointer が `kiro-cli.md` を誤指し(差し替え先 `kiro-ide.md` 実在)。`manifest.ts:93` 経由で `dist/kiro-ide/AGENTS.md` に伝播済み。
- **#812 未カバー候補**(新発見): `harness/kiro-ide/skills/amadeus/question-rendering.md` が kiro と byte-identical で `Kiro CLI` 表記2箇所(`:1` `Kiro CLI harness annex` / `:11` `Kiro CLI has no structured-question tool`)= SKILL.md と同根の localize 漏れクラスタ。#812 起票が SKILL.md のみ対象なら申し送り候補。agents/*.json(5)・settings/cli.json は byte-identical だが CLI 表記 0 = 中立共有妥当。
- **#680**(ヘッダ契約乖離): `amadeus-sensor-type-check.ts:4-5` self-contained 主張 vs `:89` `import { sensorsDir } from "./amadeus-lib.ts"` 矛盾。全 sensor 5件棚卸しで self-contained 明言は type-check と linter の2件のみ、linter は主張 TRUE、矛盾は type-check 単独。
- **#885**(restart-loss、E-L53 3点法): `normalizeWorktreeSlug` grep 0件。旧 `63314bc82`(#478 gap2)が lib/worktree/state の slug 境界を一本化し大文字混じり slug を寛容受理+小文字正規化していたが、現行 `amadeus-lib.ts:2099`(worktreePath 無正規化)/`:2430`(BOLT_SLUG_REGEX)/`:2580`(validateBoltSlug reject)・`amadeus-worktree.ts:39/195`・`amadeus-state.ts:248/250` が各所で個別 reject。`63314bc82` は HEAD 非祖先・区間外(restart 前系譜)。batch8 #850 gap2 と同一 archive の分割で lib.ts 交差。
- **#886**(restart-loss、E-L56 交差検証): `phase-check|PHASE_CHECK|verifyPhaseCheck|PHASE_CHECK_REQUIRED` core 全域 0件。旧 `8cf816138` の `PHASE_CHECK_REQUIRED_PHASES`(`:135`)+ `verifyPhaseCheckArtifact`(`:145`、境界完了3経路 :1003/:1215/:1454 から呼び出し)が現行 state.ts 4経路(advance :1104 / finalize :1333 / complete-workflow :1428 / approve :1670)+ jump のいずれからも呼ばれない。区間内 #880(`c4304edf4` flip 本体 setPhaseProgress :101 / markPhaseVerified :114)・#869(`aac1869e4` jump per-phase)は flip のみ再構築し phase-check precondition 未復元。`8cf816138` は HEAD 非祖先(restart 前系譜)。

## batch8 交差面

batch8(`origin/intent/p3-cleanup-batch8`)は現時点コード未着地(record/docs のみ)。交差は将来直列化懸念: (1) lib.ts slug 正規化(batch8 U6 #850 gap2 ⇔ 本 U3 #885、同一 archive `63314bc82` の分割)、(2) kiro-ide SKILL.md(batch8 U7 #851 ⇔ 本 U1 #812)。どちらが先着でも後発は実 diff で再接地(cid:code-generation:base-advance-regrounding / c6 / shared-ledger-insert-collision)。

## 温存判断(churn 回避)

- 更新: `code-quality-assessment.md`(フォーカス5欠陥現存確認節を先頭新設 + #812 未カバー候補記録 + 先頭バナー/batch5 節「本 intent」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`architecture.md`(restart-loss 系統節「docs-repair-batch9 の観測面」新設 + core-repair-batch3 バナー「最新」降格・「本 intent」ラベル化)、`code-structure.md`(#880/#869 の区間構造変化節新設)、`component-inventory.md`(docs/harness 修理コンポーネント節新設)、本ファイル + `reverse-engineering-timestamp.md`(鮮度ポインタ)。
- 温存: `business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md` は本 intent 観測面(harness localize / sensor ヘッダ / slug 正規化 / phase-check ゲート)と無関係のため base→observed 温存。
- **c3-relabel の適用範囲**: 更新対象ファイルの直近「最新」ポインタ + displaced-latest 節の「本 intent」のみリラベル(code-quality-assessment 先頭バナー + batch5 節、architecture core-repair-batch3 バナー + 501行「本 intent」)。触らないファイル・深部の残余マーカーは E-L61 バランス(触る面は全数・触らない面は既知債維持)で温存。
