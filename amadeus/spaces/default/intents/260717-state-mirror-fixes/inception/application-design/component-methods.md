# Component Methods — 260717-state-mirror-fixes

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## C1: retreat-guard

設置位置 = handleSetStatus 内(amadeus-utility.ts — E-SMF-AD Q1=A 裁定、2026-07-17T23:45:12Z 開票 3/3)。契約(FR-1a/1c/1d の写像):

```
// handleSetStatus を export し argv パラメータ化(NFR-4 / seam-export-handler-amend — reviewer M-2 是正):
export function handleSetStatus(projectDir: string, flags: Record<string, string>): void
  // 中核ロジック(lock→read→compare→write の分岐)を in-process unit テストで直接駆動し
  // lcov 計測可能にする。t145 様式の統合テストは並行競合の実証に限定する

// 後退判定(既存 parseCheckboxes :3750 の再利用 — reviewer M-1 是正、新設関数なし):
const cb = parseCheckboxes(content).find((c) => c.slug === stage);
const isRetreat = cb?.state === "completed" || cb?.state === "awaiting-approval";
  // FR-1a 単一述語。nextInScopeStage(:5292)内の checkboxStates.find イディオムに倣う(旧記載の関数名誤引用を FD reviewer 実測で是正)
```

- 呼び出し順序(FR-1d 必須): `withAuditLock(projectDir, () => { content = readStateFile(...); if (isRetreat) { stderr advisory; return; } ...setField×6/setCheckbox; writeStateFile(...); }, intent, space)` — lock→read→compare→write
- 後退時(FR-1c): 書き込みゼロ・stderr へ advisory 1行(書式: `set-status: retreat write suppressed for "<stage>" (checkbox=<state>)` 相当)・exit 0
- 前進時(FR-1b): 従来の 6 setField+setCheckbox+writeStateFile を不変に実行
- エンジン RMW ハンドラは呼ばない・変えない(FR-1e)

## C2: checkbox-state 判定(既存 parseCheckboxes の再利用 — 新設なし)

- `parseCheckboxes(content): CheckboxLine[]`(amadeus-lib.ts:3750、export 済み)が `{slug, state, suffix}` を返す — 読み側は既に存在(reviewer M-1 実測)。ADR-4 旧案の readCheckboxState 新設は撤回
- 判定は `.find(c => c.slug === stage)?.state` の既習イディオム(:5322)1行 — 新規コード 0 行・新規 lcov 計測面 0
- 純関数(fs 非依存)のため C1 の in-process unit テスト内で自然に駆動される(NFR-4/T4)

## C3: skip-denominator-fix(scripts/amadeus-mirror.ts countStageProgress)

```
// 変更前(:98-100): m = /^- \[(x|X| |-|\?|R|S)\] / のみで判定、[S] だけ分母除外
// 変更後: 上記に加えて、行末サフィックス — SKIP を分母除外
if (m[1] === "S") continue;            // jump-skip(既存維持 — FR-2a)
if (/ — SKIP\s*$/.test(line)) continue; // scope-skip(追加 — FR-2a)
```

- 期待値(FR-2b): mirror-issue-tool 相当 fixture で `{approved: 18, total: 18}`
- fixture(FR-2c): 「`[S]` + `— EXECUTE`」と「`[ ]` + `— SKIP`」の両様式を含む(t232 の捏造様式は実様式へ是正)

## C4: state-repair(データ操作 — コード無し)

- 対象: `amadeus/spaces/default/intents/260717-mirror-issue-tool/amadeus-state.md`
- 復元値の導出(FR-3a): 当該 record の audit シャードの GATE_APPROVED / STAGE_COMPLETED 行から `nfr-requirements=[x]`・`In Progress`・`Active Agent` の正値を実測転記
- 手段: `bun .claude/tools/amadeus-state.ts checkbox` / `set`(既存 CLI、fail-closed 実装 #1057 済み)
- 実施単位 = 実装 PR と別の record チェックポイントコミット(E-SMF-AD Q2=A 裁定)
