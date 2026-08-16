# Code Summary — unit docs-norms(FR-14 / Q16 / U12)

## Commits(worktree `bolt-docs-norms`、base `swarm-int-rfc0001@040196a11`)

| sha | subject |
|---|---|
| `e95015933` | docs(autonomy): derive the mode x checkpoint matrix and guard it mechanically |
| `a510af4bb` | docs(protocol): sync the autonomy semantics with what the modes now decide |
| `216c1ac6a` | docs(reference): bring the autonomy chapters and the RFC frontmatter up to date |
| `2149d92b4` | docs(guide): restate the mode menu and the skeleton condition for users |

## 実装 summary

- `construction/docs-norms/mode-matrix.md`(新規、113行) + `tests/unit/t3116-docs-mode-matrix.test.ts`(新規、184行): none/semi/full(interactive)/full(non-interactive) × 20確認点のマトリクス。全セルにそれを決める file:line を併記。テストは機械面(fenced YAML `checks:`、`SEMI_ROUTINE_INTERACTIONS`経由の`nonAutoDecidedKinds`と`projectConstructionAutonomy`に対する照合)と散文表セルの2重クロスチェックを行う — どちらか一方だけの編集でテストが赤くなる。
- `packages/framework/core/amadeus-common/protocols/stage-protocol.md` / `conductor.md`: 裁定順序(reserved → derivation → not-unique → defect)、2つの人間終端のセッション対話性への束縛(対話は質問、非対話はwaiting)、fullが「止まらない」という記述の撤回、`human-required`終端の文書化、WS儀式のSkeleton Stance従属、Construction投影の乖離loud fail化、solo-election triggerのIntent mode由来化、finding設定の新consentパスとmode独立性明記、waiting directiveのreceipt節、標準マージ委任の記録(自動化ではない)を反映。glossary行は正本(canonical source)で編集し再投影。t369は導出済みtrigger文言、t367は改名後findingキーへピン更新。
- SKILL群(`skills/amadeus-election/SKILL.md`ほかharness別6ファイル)・`04-stage-protocol.{md,ja.md}`・`glossary.{md,ja.md}`: 同上の同期。
- `docs/reference/24-intent-autonomy.{md,ja.md}`(+97/+110行): 4種interaction kindとsemiの補集合、reserved-pointステップ、3way outcome語彙、モードが決定できない場合の新規セクション(対話ask vs waiting、interactivity judgmentとそのfail-closedな縁、4つの異なるstop理由、mode非依存のpark)、advisory-deferral効果分類、記録済みmerge委任、completion-boundary auto-decision要約(fullのreview pointとしてphase boundaryを置換)を追加。
- `docs/reference/03-orchestrator.{md,ja.md}` / `04-stages/construction.{md,ja.md}` / `08-construction-and-swarm.{md,ja.md}`: mode定義、Skeleton Stance条件、semiのswarm無人スケジューリングを反映。
- `amadeus/spaces/default/specs/rfc/0001-intent-autonomy-modes.md`: frontmatter tracking-issueへ#3116を記入(1行)。
- `construction/docs-norms/norm-revision-drafts.md`(新規、126行): RFC-0001が含意するノルム改定案をrecord内に起草(ノルムファイル自体は変更しない、R-2)。
- `docs/guide/02-your-first-workflow.{md,ja.md}` / `04-phases-and-stages.{md,ja.md}`: mode menuの並び(full→semi=full-2milestones)とwalking-skeleton儀式の発火条件(Skeleton Stance従属)をユーザー向けに書き直し。

## 検証(実測)

| コマンド | 結果 |
|---|---|
| `bun install` / `bun run build`(実装前) | exit 0 |
| `bun test tests/unit/t3116-docs-mode-matrix.test.ts`(ベースライン、無改変) | 19 pass / 0 fail / 66 expect() calls |

## Red 逐語(R-1、実測 2026-08-16)

対象: `tests/unit/t3116-docs-mode-matrix.test.ts`(19 tests)。ベースライン(無改変): 19 pass / 0 fail / 66 expect() calls。

### 注入1 — 機械照合面(YAML `checks:`)の1セル反転

`semi-phase-gate`の`behaviour: human` → `auto`に改変。
```
error: expect(received).toBe(expected)

Expected: "human"
Received: "auto"

      at <anonymous> (.../tests/unit/t3116-docs-mode-matrix.test.ts:167:31)
(fail) t3116 mode-matrix — FR-14/R-1 documentation-to-implementation cross-check > semi-phase-gate: the declared behaviour is what the implementation decides [0.15ms]
...
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (.../tests/unit/t3116-docs-mode-matrix.test.ts:179:40)
(fail) t3116 mode-matrix — FR-14/R-1 documentation-to-implementation cross-check > semi-phase-gate: the prose table cell agrees with the declared behaviour [0.03ms]

 17 pass
 2 fail
 66 expect() calls
```

### 注入2 — 散文表の1セル反転(鏡像方向)

表 行2のsemi列「人間が承認(milestone)」→「自動(milestone)」に改変(YAMLは無改変)。
```
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (.../tests/unit/t3116-docs-mode-matrix.test.ts:179:40)
(fail) t3116 mode-matrix — FR-14/R-1 documentation-to-implementation cross-check > semi-phase-gate: the prose table cell agrees with the declared behaviour [0.12ms]

 18 pass
 1 fail
 66 expect() calls
```

revert後: 19 pass / 0 fail。`git status --short`の残渣は本unitが新規追加した2パス(`construction/docs-norms/`、`tests/unit/t3116-docs-mode-matrix.test.ts`)+元から未追跡だった`amadeus-state.md`/`audit/`のみ — 改変の残渣ゼロを機械確認済み。

## 申し送り

- **継承済みの赤(自変更由来ではない、2件)**: `bun test tests/unit`の完走で以下2件がfail。統合base(`swarm-int-rfc0001@040196a11`)から継承した台帳resync漏れであり、本unitの変更由来ではない。
  1. `tests/unit/t-formal-verif-tlc-toolchain.test.ts` — `TlaModelHarnessError: SOURCE_DRIFT: packages/framework/core/tools/amadeus-orchestrate.ts: implementation entry hash differs from model map; when the model and configuration are unchanged, refresh implementation hashes with 'updateModelMap --impl-only'`
  2. `tests/unit/complexity-gate.test.ts` — `default env seams: the real repo measurement checks green against the committed baseline`(`runCheck()`が0でなく1)

  帰属の根拠(実測): `git diff --name-only 040196a11..HEAD` — 変更35ファイルはすべて`.md`と`tests/**/*.test.ts` 4本のみ、実装`.ts`は0件。台帳と被ピン実装のblob同一性を`git rev-parse <ref>:<path>`で照合し、`tests/.complexity-baseline.json`/`amadeus/spaces/default/specs/tla/model-map.json`/`packages/framework/core/tools/amadeus-orchestrate.ts`はいずれもbaseとHEADでIDENTICAL。complexity gateの`MEASUREMENT_ROOTS`(`tests/complexity-gate.ts:43-51`)はcore/setup/src/scripts/pluginsのコードのみで`.md`は測定対象外。

  是正はproject.md `cid:build-and-test:bt-ledger-resync`の既知クラス(model-mapの`--impl-only`再同期 + complexity baselineの更新)であり、統合断面を所有するconductor側の作業。本unitの書き込みスコープ外なので触っていない。
- 逸脱: none。
