# Code Summary — issue-2974-error-arm-boundary

Unit: Issue #2974(FR-ERR-1 / FR-BND-1 / FR-BND-2)。Bolt branch `bolt-2974-error-arm-boundary`(base = origin/main `a92c3c2b3a`)、conductor ツリーへ取込済み・`bun run build` 済み。user-stories は scope SKIP のため各変更は FR へ直接トレース(plan の traceability list 参照)。

## 変更ファイル(コミット SHA 付き)

- `0d4c50c8d` fix(protocol): canonicalize the error-directive receipt clause across harnesses
  - `packages/framework/core/amadeus-common/protocols/stage-protocol.md` — §11b「Error Directive Receipt」新設(正本1定義)
  - `packages/framework/harness/{claude,codex,cursor,kimi,kiro,kiro-ide,opencode}/…` の error アーム行 + `packages/framework/harness/pi/skills/amadeus/SKILL.md` — 正本文へ同期(旧文言置換、シムなし)
  - `tests/unit/t2974-error-arm-boundary.test.ts` 新設(後に integration へ移設)
- `677affbc3` docs(autonomy): define the approval boundary for remote writes
  - `docs/reference/24-intent-autonomy.md` + `.ja.md` — 「Approval boundary for remote writes」節を対訳同期で新設
  - `stage-protocol.md` — §11c「Approval boundary for remote writes」新設(decide-question 梯子経由・human-required のみ人間へ・merge は経路外)
  - `plugins/pr-convergence/stages/pr-convergence.md` — Guardrail「Ask before writing to the remote」→「Route every remote write through the boundary」へ改訂、`never merge` 保持
- `6b1a46b2d` test(t2974): move the error-arm/boundary guard to the integration tier
  - `tests/integration/t2974-error-arm-boundary.integration.test.ts`(`// size: medium`)

## 実装決定(bullet)

- 正本文(条項①逐語出力 ②STOP ③回復・リトライ・取り繕い禁止 ④新規質問・新規ゲート発明の禁止): `Print `directive.message` verbatim and STOP. Do not recover, retry, or smooth it over, and do not invent a new question or a new gate — the message is the user-facing error.`(`git grep 'do not invent a new question' -- packages/framework/` = 9 hit)
- Q4=C ユーザー裁定どおり、boundary は「remote write を毎回 decide-question 梯子で裁定・監査記録・human-required のみ人間へ」。grant の effect 5分類は不変更(NFR-1: `irreversible`/`new-permission` は human-required で返ると明記)
- `stage-protocol.md` の Bolt code-generation 失敗 halt には未接触

## テスト(TDD 実測)

- S2 RED: 正本不在で 2 fail 実測 → 中間断面で cursor/opencode/pi の 3 面 drift を逐語で赤実測(RE 記録と一致)→ S3 GREEN(3 pass)
- 落ちる実証(1セット・残渣ゼロ): cursor へ旧短縮形を注入 → 1 fail 実測 → revert → `git status --short` 残渣なし → 6 pass
- S4 RED: boundary 3 テスト赤実測(en/ja 節不在・stage-protocol scope 空・Guardrail 旧文)→ S5 GREEN(6 pass)

## 検証(exit code)

- `bun run build` 0 / `bun run typecheck` 0 / `bun run lint` 0 / `bun run source-only:check` 0 / `bun run distribution:check` 0
- `bash tests/run-tests.sh --ci`: 1回目 exit 1(`t-test-size-drift` — 新テストが unit tier の size 上限超過)→ integration へ移設後 2回目 exit 0(RESULT: PASS)
- `coverage-patch-quick --check` exit 0(advisory PASS、production 追加行 0)
- conductor ツリー取込後の再実測(build 後): `do not invent a new question or a new gate` = dist 16 面 / `11c. Approval boundary` = dist 8 面 / `Route every remote write through the boundary` = 10 面(plugin 正本 + dist 投影 + core 投影)。`git status --short` 空(追跡ファイル不変)

## プランからの逸脱

- テスト配置のみ: plan は `tests/unit/` 指定だったが、repo ファイルを読む guard は size classifier が medium 判定 → 既決ノルム(medium test は integration へ、unit allowlist 不増)の機械的執行として `tests/integration/` へ移設。設計逸脱なし。

## 未検証面(申し送り)

- conductor の実行時挙動(error 受領時の実遵守・remote write の梯子実経由)は LLM 挙動でありテスト対象外。契約文面 + drift ガードで固定(requirements の Assumptions と整合、受け入れ基準の外)
- CI 正本の Patch/Project Coverage Gate は PR CI で実測する
- pr-convergence-report.md は PR 作成後に plugin CLI `create` で生成する(本 summary 起草時点では未生成)
