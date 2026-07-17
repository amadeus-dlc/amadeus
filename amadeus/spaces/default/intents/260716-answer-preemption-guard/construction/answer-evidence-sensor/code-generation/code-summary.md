# Code Summary — answer-evidence-sensor(Issue #922 / Bolt 1)

上流入力(consumes 全数): `code-generation-plan.md`、`../functional-design/business-logic-model.md`、`../functional-design/business-rules.md`(R1〜R6)、`../functional-design/domain-entities.md`、`../nfr-design/performance-design.md`、`../nfr-design/security-design.md`、`../../../inception/units-generation/unit-of-work.md`、`../../../inception/requirements-analysis/requirements.md`(FR-1〜7)。

## 作成・変更ファイル(正本面)

| 区分 | パス | 内容 |
|------|------|------|
| 新規 | `packages/framework/core/tools/amadeus-sensor-answer-evidence.ts` | 純関数 `evaluateAnswerEvidence`(3段パイプライン)+ `main` seam(いずれも export)。lcov 48/48=100% |
| 新規 | `packages/framework/core/sensors/amadeus-answer-evidence.md` | manifest(matches `**/*-questions.md` 狭 glob、timeout 5s、advisory) |
| 変更 | `packages/framework/core/tools/amadeus-lib.ts` | `export const QUESTIONS_EVIDENCE_CUTOFF_YYMMDD = 260716` を `checkQuestionsEvidence` 直上へ新設(ADR-3) |
| 変更 | `packages/framework/core/tools/amadeus-state.ts` | ローカル `GUARD_CUTOFF_YYMMDD` を削除し lib import へ置換(挙動不変・値同一) |
| 変更 | `packages/framework/core/amadeus-common/stages/**`(29ファイル) | `sensors:` へ `answer-evidence` 追加。**初期化3ステージは `sensors: []` 維持**(E-APG-AD-DEV 再裁定 (i)) |
| 新規 | `tests/integration/t-answer-evidence-sensor.test.ts` | 20テスト(R1〜R6 1:1・vacuity guard・決定性・cutoff 単一定義ピン) |
| 変更 | `tests/integration/t89.test.ts` / `t93.test.ts` / fixture 5 dir / registry / ratchet / designer-export golden | 新 sensor 追加の機械的再整合(t89 の初期化不変条件 Case 7/8 は無変更維持) |
| 生成 | `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**`+self-install(`.claude/`・`.codex/`) | `bun scripts/package.ts`+`bun run promote:self` による機械再生成(手編集なし) |

## 主要な実装判断

- 述語 `checkQuestionsEvidence` の判別ユニオンをそのまま写像(C1 遵守 — 再実装・意味論変更・existsSync 二重ゲートなし。reviewer が 1:1 写像を実測確認)
- 不変条件(pass=false ⇒ findings_count=1 ∧ skipped=null / skipped≠null ⇒ pass=true)を構成関数で強制 — 無効状態は表現不能
- cutoff の経路差(gate-start=状態解決 / sensor=outputPath 直接パース)を docstring に明記(設計 m-1 是正の履行)
- designer-export golden の再生成は **dist コピーの export** で実施 — `.claude/` 側の実行はユーザー定義 scope(amadeus 等)を含み fixture 源にならない(§13 候補)

## 逸脱と裁定

- builder が「全32 stage 宣言」(旧裁定字面)適用で t89 の初期化不変条件と衝突 → **実装せず停止**(deviation-stop-before-implement)→ E-APG-CG 照会 → E-APG-AD-DEV **再裁定 (i) = 29 stage** の既決適用(no-election-for-decided-norms)で確定。conductor が c5 手順(差分検分+検証再実行)で引き取り再整合。ADR-2 へ再裁定経緯を追記済み。
- 上記以外の逸脱なし(reviewer 実測: 要求外の後方互換レイヤー・フォールバック分岐・シム混入なし)。

## テストカバレッジ

- 新規20テスト: R1 fail 2種 / R2 pass 4 reason / R3 pre-cutoff skip / R4 not-questions skip / R5 exit code 契約 / R6 既知の限界の文書化ピン / vacuity guard / 決定性 / cutoff 単一定義
- 落ちる実証(両側): dist の failed() 反転注入 → 5テスト赤 → package.ts 再生成で復元 20 pass(注入は head 非残存)。注入面は実行時消費される fixture md(inject-runtime-consumed-lines)
- lcov: script 48/48(DA:0 なし)、state.ts :1728 hits=51、lib.ts :1176 hits=55 — patch 追加行の未カバー 0

## 検証(実測 exit code — 測定 ref: bolt head 669c82ff6(origin/main 3cefa07d2 へ rebase 済み)+ mirror 7edd8072b)

| コマンド | worktree(bolt) | 本線 mirror 後 |
|---|---|---|
| `bun run typecheck` | 0 | 0 |
| `bun run lint` | 0 | 0 |
| `bun run dist:check` | 0 | 0 |
| `bun run promote:self:check` | 0 | 0 |
| `bash tests/run-tests.sh --ci` | 0(365 files / 0 fail、rebase 後再実測) | —(単体 t89/t-ae/t66/t93 各 0) |
| `bun .claude/tools/amadeus-runner-gen.ts check` | 0 | — |
| `bun tests/gen-coverage-registry.ts --check` | 0 | 0(本線 universe で regen 後) |

センサー(手動発火・audit 機械集計): linter / type-check とも SENSOR_PASSED、code-generation 帰属の SENSOR_FAILED 0件。

## レビュー

- architecture-reviewer subagent: **READY(GoA 1)**、指摘 0件(Critical/Major/Minor なし)。29/32 宣言の独立再列挙一致(29+3=32)。
- PR: [#1123](https://github.com/amadeus-dlc/amadeus/pull/1123)(ブランチ `bolt/922-answer-evidence-sensor`、head 669c82ff6)。人間レビュアー e2 指名済み(creator-first)。マージは per-PR ユーザー承認(no-AI-merge)。

## Plan からの逸脱

Step 4 の宣言数が 32→29 に変わった(上記裁定)以外、plan の全ステップを実施。ADR-5 どおり TOOL_DESCRIPTORS 登録なし(registry --check green で整合確認)。
