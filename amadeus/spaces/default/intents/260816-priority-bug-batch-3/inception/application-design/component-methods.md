# Component Methods — intent 260816-priority-bug-batch-3

components.md の C1〜C5 について、修正対象メソッドの現行シグネチャと、decisions.md(ADR-1〜5)の裁定に基づく変更方針を示す。詳細な業務規則・分岐仕様は Functional Design の担当(本書は public interface 水準)。requirements.md の各 FR 受け入れ条件が各メソッドの検証面。

## C1: ゲート presence 解決(ADR-1)

| メソッド | 現行シグネチャ(observed 89053172e) | 変更方針 |
|---|---|---|
| `assertHumanPresentForGateResolution(pd, content, slug, verb, intent?, space?)` → `string \| null`(amadeus-state.ts:3721-3728) | autoApprove 偽のとき authorizationReason を読まず素通り | `ProductionAutonomyContext` の human-required 宣言 + interactionKind(1定義供給)を読み、milestone なら厳格境界の presence 判定へ分岐。シグネチャ不変 |
| `humanActedSinceGate(projectDir, verb?, intent?, space?)` → `boolean`(amadeus-lib.ts:3926-3931) | prior-resolution 境界のみ | 無改変(一般ゲートの非退行)。厳格境界は `scanPresenceLedger` + `resolveGatePresence` への PresenceSlot 追加で実現し、milestone 用の入口(引数拡張 or 姉妹関数)は FD で確定 |
| `scanPresenceLedger` / `resolveGatePresence`(amadeus-lib.ts:3787-3882) | `STAGE_AWAITING_APPROVAL` を境界に含まない | Stage 付き境界イベントとして追加(1分岐)。同秒タイの fail-closed 規則は既存を再利用 |
| `GATE_APPROVED` emit(amadeus-state.ts approve 経路) | 任意フィールド: User Input / Grant Id / Swarm batch / Transaction Id | 承認根拠フィールドを追加(gate-open-turn / delegated / intent-grant / guard-disabled — 実行分岐から導出)。event-registry + audit-format.md 同一変更同期 |

- エラー処理: 拒否は既存の `error()` fail-closed 様式。backfill(Recovered=true)のみのゲートは拒否 + gate-start 再提示の指示メッセージ(ADR-1 契約3)

## C2: Intent autonomy production(ADR-2)

| メソッド | 現行 | 変更方針 |
|---|---|---|
| `productionStageAutonomy(input)` → `ProductionAutonomyContext`(amadeus-intent-autonomy-production.ts:295-328) | 読取のたび `emitAuthorizationRefusal` を副作用実行 | emit を除去し純粋読取化。戻り値に human-required 宣言と interactionKind を載せ、C1 が消費(ADR-1 契約2と同一供給点) |
| `emitAuthorizationRefusal(projectDir, payload)`(同 :354-370) | 無条件 append、鍵なし | 呼出点を gate-start(STAGE_AWAITING_APPROVAL と同一 operationWithLock 内)へ移設。occurrence 恒等式由来の冪等鍵で shard 内 dedup(鍵生成は1関数へ集約)。fail-open 維持 |

- 入出力: 監査行スキーマへ Idempotency Key を required 追加(audit-format.md 同期)

## C3: pr-convergence report lifecycle(ADR-3 / ADR-4)

| メソッド | 現行 | 変更方針 |
|---|---|---|
| `transitionAllowed(current, next)`(pr-convergence-cli.ts:610-617) | converged からの遷移なし(final) | **無改変**(ADR-3 契約 — 既決ノルム維持) |
| CLI `report` merged arm(:907-924) | converged への merge facts 供給経路なし | in-place finalisation を追加: attested prHead == merged headRefOid または ancestry proof 成立時に merge facts を実測して attest し直し、kind: converged のまま record 更新 + canonical audit 行 append。祖先不成立は ADR-4 の override 経路へ |
| `checkAttestationEnvironment` / `checkCheckoutBinding` / `checkMergeBinding`(sensor :285-335) | `kind === "landed" ? merge : checkout` | 束縛選択を attestation ベース(receipt が merge facts を attest しているか)へ置換、kind 分岐を削除。無ネットワーク維持 |
| `verifyMergedEpochAncestry(...)`(git-runner :213-243) | 祖先不成立は拒否のみ | 無改変(測定はそのまま)。override 提示時に測定結果の逐語を人間へ表示する消費点を追加(ADR-4 契約2) |
| override 系最終化(merged arm) | 存在しない | human-presence(HUMAN_TURN 由来)必須の override 最終化を追加。既存 kind を使用、新 kind なし。live checkout 前提は `verifyLandedPrerequisites` 同等の緩和 |

- エラー処理: presence 不在の override は拒否(fail-closed)。攻撃面: attestation を伴わない手書き merge facts は FAIL 維持(ADR-3 契約4 の負例)

## C4: workspace source-work ガード(FR-4 — 方式裁定なし、Issue 完了条件が実装形を規定)

| メソッド | 現行 | 変更方針 |
|---|---|---|
| `intentScopedSourceWork(...)`(amadeus-state.ts:2622-2632) | 3プローブ(起点 = intentBirthCommit)の短絡合成 | 第4プローブを追加: マージ済み Bolt PR のコードコミットが record ブランチ履歴(birth より前を含む)に包含されることの検出。sibling 誤帰属防止の attribution 原則(intent 宣言 issue / bolt slug への帰属)を維持 |
| `gitHasSourceWork` / `workspaceHasWork` | 現行 | 合成順のみ追従(シグネチャ不変)。t206 が dist 経由 import のため `bun run build` 前提 |

- 具体プローブ述語(PR head の同定方法)は FD で確定。両側テスト(受理/拒否)は FR-4 受け入れ条件どおり

## C5: 選挙 store append(ADR-5)

| メソッド | 現行 | 変更方針 |
|---|---|---|
| `appendPending(root, electionId, ballot)` → `{idempotent, arrivalSequence}`(amadeus-election-store.ts:1032-1092) | 全体読み(:1042)→全体 max+1(:1063)→per-voter 書込(:1088) | 採番読取を `readPendingVoter`(自 voter ファイル)に閉じ、voter ローカル max+1 へ。シグネチャ不変 |
| `readAllPending(dir, definition)`(:527-549) | arrivalSequence の全体一意性検査 | (voter, arrivalSequence) 複合一意へ変更。全体順序は (arrivalSequence, voter) 辞書式の比較関数1定義に集約 |

- エラー処理: fail-closed 強度は現行同一(同一 voter ファイル内の重複は corrupt のまま)。同一 voter 並行二重投稿は last-write-wins(store 非破壊)を明文化

## 横断事項

- 型・エラーは既存様式(Result 判別ユニオン / error() fail-closed)を踏襲。新規公開 API なし
- `amadeus-orchestrate.ts` / `amadeus-state.ts` を触る unit は model-map ハッシュピン + allowlist セレクタ resync(NFR-3)
