# Components — intent 260815-rfc-autonomy-modes(RFC-0001 実装)

> 既存モジュール境界(`packages/framework/core/`)を維持し、新規パッケージは作らない。各コンポーネントは「所有する裁定面」で切る。裁定出典: E-260815-RFC0001-DESIGN(11 問)+ 人間裁定(Q6/Q9)。

## C1: recommendation-outcome(新規型モジュール、見積 ~120 行)

- **場所**: `packages/framework/core/tools/amadeus-recommendation.ts`(新設、小モジュール — coverage 母集団膨張回避のため単独ファイル)
- **責務**: 判別ユニオン `RecommendationOutcome = unique(optionId, basis) | contested(candidates[], reason) | none(reason)` の型定義・スマートコンストラクタ・提示ペイロード(候補+根拠+非一意事由+推奨順)の直列化/復元
- **公開面**: 型、`RecommendationOutcome.unique/contested/none`、`presentationOf(outcome)`、`parseOutcome(json)`(parse-don't-validate)
- **境界**: 導出ロジックは持たない(導出は各裁定点の所有者 — C2/C4/C5)

## C2: ladder-ruling(既存改修、見積 ~250 行差分)

- **場所**: `amadeus-bolt.ts`(decide-question 梯子)+ `amadeus-intent-autonomy.ts` / `-production.ts`(導出各段)
- **責務**: 梯子全段の戻り型を RecommendationOutcome 化。選挙 hold → contested/none 写像。梯子⑤(エージェント推奨)に contested を返す自由。終端 unique 以外は裁定順序 3 へ(D4 の縮退進行除去)
- **ゲート(Q2=B + 留保)**: stage-gate の導出も RecommendationOutcome を**実配線**で返すが常に unique(approve) — 選択肢を持たないことを型で表現。red(blocking sensor 未解決・NORM_CONFLICT)は既存 fail-closed 経路のまま(導出器の contested で表現しない)。semi の phase-boundary/WS は裁定順序 1(人間専権)側で表現

## C3: session-presence(既存再利用、見積 ~60 行差分)

- **場所**: `amadeus-presence-reservation.ts`(mintHumanPresence — 一次信号)+ 実効判定の読み口を `amadeus-intent-autonomy.ts` に新設
- **責務**: セッション単位の対話/非対話判定(Q3=A′)。判定関数は単一(`isInteractiveSession()` 相当)で、Stop hook・FR-4 分岐・`--status` 表示の**全消費者が同一ソース**から読む(Q11 留保・UI 真実性)
- **fail-closed**: 信号不明・読取不能は非対話

## C4: waiting-state(新設状態、見積 ~350 行差分)

- **場所**: `amadeus-state.ts`(状態機械)+ `amadeus-orchestrate.ts`(directive)+ 監査イベント新設
- **責務**: 非対話中断の一級 waiting 状態(Q7=B)。engine 発行専用(AI/利用者向け CLI verb なし — Q7 留保 v2)。contested ペイロード(C1 の直列化)を格納し、resume 時に同内容で再提示。park の HUMAN_TURN 会計(1 turn = 1 park、state.ts:1574-1605)は**無改変**
- **3 終端の分離(Q14=A)**: park(人間都合)/ waiting(裁定待ち)/ REPAIR_STALLED(欠陥)— 状態・監査イベント・resume 経路を分け、resume 入口は 1 つで記録種別により内部 dispatch。REPAIR resume は是正証跡を要求(fail-closed)
- **自己 park 脅威(Q8=B)**: waiting への admission は事由オブジェクト(裁定点 occurrenceId・候補・導出過程)へ束縛。レート制約の鍵 = occurrenceId + basis fingerprint(production.ts:805 の既存重複判定を再利用)。根拠が実質変化した再到達は正当。超過はエスカレーション(人間/REPAIR)のみ — 自動続行分岐を作らない
- **park guard 廃棄(D1/D5)**: state.ts:1599 の「autonomous ∧ HUMAN_TURN 0 → park 拒否」を除去(FR-3。FR-5 の先行依存)

## C5: mode-authority(既存改修、見積 ~200 行差分)

- **場所**: `amadeus-intent-autonomy.ts`(SEMI_ROUTINE_INTERACTIONS :581、allowsOccurrence :636-640、効果認可)+ `amadeus-advisory-choice.ts`
- **責務**: semi = full − 人間ゲート 2 種の権限表現。`SEMI_ROUTINE_INTERACTIONS` へ milestone 系を追加し、第 2 ガードの phase-boundary 一律拒否を「phase-boundary と WS のみ人間」へ改修。効果認可に新分類 `advisory-deferral`(Q4=A)— plugin.json advisories 宣言由来の defer-with-risk のみ。blocking sensor verdict・ノルム・カバレッジ系へは不適用(落ちる実証 2 本: 自動裁定 Green + blocking 系拒否 Red — Q4 留保 v2)
- **WS の Stance 従属(Q9=A)**: WS ゲート発火判定に Skeleton Stance を配線(degrade スコープ不発火、greenfield 無退行)

## C6: projection-truthfulness(既存改修、見積 ~80 行差分)

- **場所**: `amadeus-intent-autonomy-production.ts:713`(書込)+ `amadeus-orchestrate.ts:2046`(読取)+ 乖離判定
- **責務**: 宣言(Intent Autonomy Mode)と投影(Construction Autonomy Mode)の乖離 loud fail を全 mode 化(D3/D9)。semi の投影は autonomous へ(Bolt 自律化 — C4 の park guard 廃棄が先行)

## C7: config-axis(既存改修、見積 ~120 行差分)

- **場所**: `amadeus-config.ts`(LEGACY_KEY_REPLACEMENTS :706-716 再利用)+ 消費面
- **責務**: `solo-election.trigger.mode` 廃止(mode 導出: none→manual 相当 / semi・full→auto 相当)+ consent 軸キー改名 `intent-mirror.github.issue.consent` / `finding.github.issue.creation.consent`(Q18=A — 語彙 manual/auto は不変)。旧キーは loud fail(新キー名をエラーへ明示)。**同一 PR で全面同期**(config registry :585/:615・docs・tests・投影)

## C8: visibility(既存改修、見積 ~80 行差分)

- **場所**: `--status` ハンドラ + statusline hook
- **責務**: 実効 autonomy mode・対話性判定・consent 軸実効値の常時可視(FR-8)。表示値は C3/C5/C7 の実効判定関数と同一ソースから導出(UI 真実性)

## C9: completion-report(新設・小、見積 ~120 行)

- **場所**: 完了境界(complete-workflow 経路)+ `amadeus-bolt.ts list-auto-decisions`(dispatch 登録 :1334、本起草時実測)
- **責務**: auto-decision 要約レポート(Q5=B)— AUTO_DECIDED 監査レコードのみからの機械生成(LLM 計数・散文の混入禁止)、record へ書き完了メッセージに提示。**非 blocking**(full の無人完走性を壊さない)

## C10: s13-zero(既存改修、見積 ~100 行差分)

- **場所**: `amadeus-learnings.ts`
- **責務**: §13 の 0 件確定を surface 出力 digest のみで機械判定(Q10=B)。conductor 追加候補は「増やす」方向のみ・disk 再導出可能な記録必須・監査へ surface digest + 追加候補集合を記録

## C11: merge-delegation-provenance(既存改修・小、見積 ~60 行差分)

- **場所**: pr-convergence 収束実務は plugin 側だが、記録面は record/audit(本 intent は core 側の provenance 記録形式のみ — Q6=A)
- **責務**: 委任条件(team.md 常任承認ノルムが唯一の正本)成立時のマージ記録に委任根拠 HUMAN_TURN 参照 + 実測値(CI conclusion / converged)を残す機械化。新設 config なし

## C12: grant-ceremony(既存改修・最小、見積 ~30 行差分)

- **場所**: `amadeus-bolt.ts` preview-autonomy
- **責務**: 2 段維持(Q15=B)。preview 出力を 1 画面化し、貼り付け可能な `set-autonomy --mode <m> --confirmed-display-digest <digest>` 完全形を印字。相互必須不変量(preview なし発効拒否・digest 不一致拒否)の落ちる実証を追加

## C13: presence-closure(既存改修、見積 ~100 行差分)— FR-12(D7/D8)

- **場所**: `amadeus-bolt.ts` approve-batch(:1197-1260 — 現状 presence 無検証で承認を記録)+ `amadeus-lib.ts` presence ledger 走査(scanPresenceLedger :3768〜 — 「empty buffer means no ledger → no presence tracking → fail open」の明示 fail-open)+ 対応する state 側ゲート presence ガード(component-inventory の G25-G27 系)
- **責務**: (D7) `approve-batch` に人間実在検証(未消費 HUMAN_TURN provenance)を追加 — semi のバッチ境界ゲートは人間ゲートであり、presence なしの承認記録を拒否する。(D8) ゲート presence 検査の active-scope fail-open を fail-closed 化 — ledger 不在・読取不能は「presence なし」と判定する(「追跡なし=素通り」を廃止)
- **境界**: C4 の waiting とは独立(こちらは既存人間ゲートの検証強化)。C5 の semi 権限差し替えと同一面(allowsOccurrence 系)に触れるため実装順は C5 と同じ段
- **受け入れ(FR-12)**: 落ちる実証 — 現行の素通り Red を D7/D8 各 1 件実測(presence なし approve-batch が通る / ledger 不在で gate presence が pass する)→ fail-closed 化の pin

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T16:22:26Z
- **Iteration:** 1
- **Scope decision:** none

Ruling fidelity, FR coverage (1-11,15), acyclicity, effect-ceiling all check out, but FR-12 (presence closure, D7/D8) is absent from all five artifacts — no owner for an approved in-scope requirement.

### Findings

- BLOCKER | 5 artifacts | FR-12(approve-batch presence 無検証 + gate presence fail-open の封鎖)が全成果物で無被覆 — 所有コンポーネント・シグネチャ・ADR・実装順いずれにも不在
- FOLLOW-UP | component-dependency.md | FR-13/FR-14 の ADR レベル追跡の明示
- FOLLOW-UP | components.md C9 | amadeus-bolt.ts:1317 引用の currency 未確認(歴史断面では範囲外)
- FOLLOW-UP | components.md | コンポーネント規模が定性のみ(inception ガードレールの数値見積り要求)
- NIT | component-methods.md C4 | basisFingerprint の算出法未規定(自明摂動耐性)— 後段への明示申し送りが必要

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T16:22:26Z
- **Iteration:** 2
- **Scope decision:** none

C13/FR-12 (D7/D8 presence closure) fully specified across artifacts (ADR-11), stale :1317 corrected to :1334 everywhere, sizes quantified, basisFingerprint handed off in ADR-11 — no regressions in spot-checked lenses.

### Findings

- FOLLOW-UP | services.md | C13/FR-12 がサービス記述に不在(components/methods/decisions が所有 — units-generation で補記可)
- FOLLOW-UP | component-dependency.md | C13 が行列本体に行/列を持たず prose のみ — 行列へ追加すると機械照合可能
- NIT | components.md C13 | component-inventory の G25-G27 参照はスコープ外につき本パス未検証 — code-generation 前に照合
