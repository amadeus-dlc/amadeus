# Requirements — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): `intent-statement.md`、`scope-document.md`、`business-overview.md`、`architecture.md`、`code-structure.md`、`team-practices.md`。

## Intent 分析

`intent-statement.md` の中心課題は、`AMADEUS_USE_SWARM` の三つの入力状態(unset / `claude-ultra` / `codex-ultra`)をハーネス相対で決定的に解釈し、Claude と Codex の通常経路を同一セッション内 native subagent 並列 fan-out に揃えることである。利用者は指定値から実行方式を予測でき、旧値・未知値は副作用前に失敗し、降格は利用者表示と監査の双方から再現できる。多数 driver の一般化は目的ではない(旧 PR #982 の 25 ファイル dormant driver stack を対照証拠とし、`scope-document.md` の Won't で再発を禁じる)。

現行実装の事実(RE `re-scans/260717-swarm-dispatch-enum.md`、`architecture.md` / `code-structure.md` の関心 seam は区間 128 コミットで不変):
- `AMADEUS_USE_SWARM` の実コード読み取り(`process.env.AMADEUS_USE_SWARM`)は repo 全域でゼロ。読みは conductor prose(harness 別 SKILL.md)の二値判定(`== "1"`)のみ
- driver 型は `amadeus-swarm.ts:88-89` の `DriverName = "subagent" | "ultracode"` に閉じ、`--degraded-from` は `:402-407` で検証、`SWARM_DEGRADED` の Fallback driver は `:293` で `"subagent"` ハードコード
- Codex の通常 floor は headless `codex exec` per-unit workers(`harness/codex/skills/amadeus/SKILL.md:57,171`、`emit.ts:81`、`onboarding.fills.ts:42,55`)

## 機能要件

### FR-1: 三値 enum の決定的解釈(C-01, C-04)

`AMADEUS_USE_SWARM` の許可状態は unset / `claude-ultra` / `codex-ultra` の三つだけとする。選択結果は次の harness 別 decision table と全ケース一致する(受け入れ = 全組み合わせの自動テスト)。

| 入力状態 | Claude | Codex | Kiro / Kiro IDE |
|---|---|---|---|
| unset | native floor(セッション内 N 並列 subagent) | native floor(セッション内 native subagent fan-out) | native floor(既存維持) |
| `claude-ultra` | Dynamic Workflow(Workflow tool 実在時)/ 不在時は loud-degrade → native floor | loud-degrade → native floor | loud-degrade → native floor |
| `codex-ultra` | loud-degrade → native floor | ultra request(native subagent + reasoning effort 指定) | loud-degrade → native floor |
| `1`(旧値)・その他未知値 | fail-closed | fail-closed | fail-closed |

### FR-2: 旧値・未知値の fail-closed(C-02, C-03)

旧値 `1` を含む未知値は、dispatch 開始・worktree 作成・worker/subagent 起動・`SWARM_STARTED` emit のいずれよりも前に明示エラーで停止する。後方互換シム・deprecation 期間・二重読みは設けない。受け入れ = 全未知値ケースで副作用ゼロ(worktree 差分ゼロ・audit に SWARM_ 行ゼロ・プロセス起動ゼロ)を確認する negative test。

### FR-3: 他ハーネス専用値の loud-degrade(C-05)

Claude での `codex-ultra`、Codex での `claude-ultra`、Kiro 系での両 ultra 値は、同一セッション内 native subagent floor へ降格し、(a) 利用者向け表示と (b) `SWARM_DEGRADED` audit(Requested driver = 指定値そのまま、Fallback driver = `subagent`)の双方に同じ requested driver を残す。受け入れ = 全 mismatch ケースで表示と audit の一致 test。

### FR-4: 語彙の一対一性(C-06)

env 値・コード上の driver 型・audit の driver 値は `subagent` / `claude-ultra` / `codex-ultra` で一致させ、追加の写像層を持たない。既存の `ultracode` 語彙(`DriverName`、`--degraded-from` 検証、SKILL prose、docs)は `claude-ultra` へ置換し、旧語彙を残さない。受け入れ = type・CLI validation・audit fixture の同値検査+repo 全域 grep で旧語彙ゼロ。

### FR-5: Codex 通常経路の native 化(C-07)【PENDING: C-13/C-14 live evidence】

Codex の通常 floor は同一セッション内の native subagent 並列 fan-out とし、headless `codex exec` per-unit worker 経路を撤去する(fallback としても残さない — scope Won't)。spawn・結果回収・失敗 Unit の retry を含む。本 FR の確約は C-13(prepared unit worktree への隔離書き込み)/ C-14(writable-root 境界)の live evidence 添付が前提であり、evidence 未達の場合は本 intent を No-Go とする(fallback 追加は Change Control 対象)。受け入れ = live spawn/collection/worktree evidence+source/dist scan で `codex exec` floor 記述ゼロ。

### FR-6: 機械検証可能な選択境界(C-16)

raw env 値と実行 harness から selected driver / degraded-from / error を決定する境界は、prose だけに依存せず機械検証可能とする(最小境界の実現形 — 関数・ツールサブコマンド等 — は application-design で確定する。これは pre-approved な設計委任であり実装時の無申告判断を許可しない)。受け入れ = decision table の全セルを機械検証する test の実在。

### FR-7: referee 意味論の維持(C-08)

`prepare` / `check` / `finalize` の既存意味論(ステートレス 3 サブコマンド、`--claimed` の lying-conductor guard、typed failure attribution、HOLD-MERGE)は変更しない。変更は driver 語彙(`DriverName` 値集合、`--degraded-from` 検証、`SWARM_DEGRADED` fields)の必要最小限に留める。受け入れ = t134 / t135 系回帰 green。

### FR-8: Kiro 系 consumer の同期(C-19, scope S-05)

Kiro / Kiro IDE は unset の既存 native floor を維持し、両 ultra 値を loud-degrade、`1`・未知値を fail-closed とする。新 driver は追加しない。旧 `1` no-op の記述を SKILL / onboarding から除去する。受け入れ = Kiro 系 SKILL の decision 記述が FR-1 の表と一致+旧 `1` 記述ゼロ。

### FR-9: dispatch 指示を持たないハーネス(opencode / cursor)の扱い【PENDING: Q1 選挙裁定】

RE 実測により opencode / cursor は invoke-swarm dispatch 指示(SKILL.md)を持たない。三値契約における扱いは Q1 の裁定に従い確定する(A: 契約対象外+S-09 生成物同期のみ / B: consumer 同期追加 = scope change / C: A+docs 1 行言及)。

### FR-10: 文書・生成物の同期(C-12, scope S-08/S-09)

新しい値集合、breaking removal(旧 `1`)、harness 相対 semantics、Codex floor 変更、effort evidence 制約(C-15)を正規契約文書(`docs/harness-engineering/08-construction-and-swarm.md` の driver seam 表、`docs/reference/17-skill-system.md` §6)と各 harness ガイド(`.md`/`.ja.md` 対)へ反映する。dist / self-promoted skill / root onboarding は source から既存生成経路(`bun scripts/package.ts`、`bun run promote:self`)で同期し drift ゼロ。受け入れ = `dist:check` / `promote:self:check` green+docs の decision 表が FR-1 と一致。

## 非機能要件

- **NFR-1(監査整合)**: `SWARM_DEGRADED` を含む SWARM_ 6 イベントの enum(`amadeus-audit.ts:147-152`)と emit 面(`amadeus-swarm.ts`)・同期テスト(t28)を三値語彙で一致させる。append-only audit を維持(C-23)
- **NFR-2(証拠限界の開示)**: `reasoning_effort=ultra` は「API 受理+child 完了」を現在の証拠限界とし、actual honor telemetry が存在しないことを docs と acceptance evidence に明記する。実測済みと誤表現しない(C-15)
- **NFR-3(並行性)**: session slot が batch より少ない場合は wave / 逐次回収を許容し、正しさを concurrency 数に依存させない(C-17)
- **NFR-4(retry identity)**: retry は失敗 Unit と native agent/result を取り違えない。session-local identity の制約は Functional Design 前に契約化する(C-18 — FD への pre-approved 委任)
- **NFR-5(secrets)**: probe・error・audit・docs に token / credential を出力しない(C-24)
- **NFR-6(テスト姿勢)**: `team-practices.md` の Testing Posture に従い、コードと並行してテストを作成し、typecheck / lint / complexity / drift / test / coverage(patch gate 含む)の既存 CI gate を green に保つ

## 制約

- C-01〜C-12(constraint-register Hard Constraints)を全承継。特に: 固定行数上限を合否基準にしない(C-10、Units Generation で概算行数レンジ必須)/ 汎用 driver stack・外部 messaging・referee 再設計の禁止(C-11)/ adapter・契約だけの先行着地禁止(C-09)
- Codex CLI は project minimum `0.139.0` 以上(C-20)
- AWS / データ規制への影響なし(C-21, C-22)

## 前提

- RE 実測(observed `e9a001105`)時点で swarm 正本・SKILL・テストへの区間変更ゼロ — 本要件は既存契約への加算として成立する(`business-overview.md` / `architecture.md` の全体像に構造変更なし)
- feasibility 実測済み: Codex native subagent の並列 spawn・結果回収・`ultra` 指定の API 受理(cid:feasibility:c1-2)。未実測は C-13/C-14 のみ

## Out of scope

`scope-document.md` の Won't Have を全承継: effort telemetry 新設 / 汎用 subagent observability / driver registry・adapter hierarchy / 旧値 `1` 互換シム / headless `codex exec` fallback 残置 / Herdr 統合 / Kiro 系新 driver / referee 意味論変更 / upstream v2.3.0 referee 設計変更 / AWS 変更 / 固定 LOC・費用・納期 budget。(FR-9 が A/C 裁定の場合、opencode / cursor の consumer 同期もここに明記する)

## Open questions

- Q1(FR-9): opencode / cursor の扱い — 選挙裁定待ち
- C-13/C-14 live evidence — Codex セッションでの probe 実施をルーティング中(結果は本書 FR-5 と evidence 添付で閉じる)
