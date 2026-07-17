# Code Summary — standing-grant(Issue #1125 / Bolt 1)

上流入力(consumes 全数): `code-generation-plan.md`、`../functional-design/business-logic-model.md`、`../functional-design/business-rules.md`(R-1〜R-8)、`../functional-design/domain-entities.md`、`../nfr-design/security-design.md`、`../nfr-design/logical-components.md`、`../../../inception/units-generation/unit-of-work.md`、`../../../inception/requirements-analysis/requirements.md`(FR-1〜8)

## 作成・変更ファイル(正本面 — 全55ファイルの内訳)

| 区分 | パス | 内容 |
|------|------|------|
| 変更 | `packages/framework/core/tools/amadeus-audit.ts` | GRANT_ISSUED/GRANT_REVOKED を VALID_EVENT_TYPES+EVENT_HEADINGS+PRESENCE_PROTECTED_EVENTS へ(CLI mint 拒否) |
| 変更 | `packages/framework/core/tools/amadeus-lib.ts` | DEFAULT_STANDING_GRANT_TTL_MS(4h・env override なし)+StandingGrant(type+companion parse+isExpired)+findActiveStandingGrant+standingGrantSatisfiesGate(分類内包)+補助2関数(複雑度分割) |
| 変更 | `packages/framework/core/tools/amadeus-state.ts` | grant/revoke verb(接地→team→scope→TTL→emit、stderr にフラグ名+既定=除外の明文)+approve 側受理分岐+handleDelegateApproval の targetRecord 前置+Grant Id 監査記録。**handleDelegateRejection は diff ゼロ**(E-SDG-AD2=X) |
| 変更 | `packages/framework/core/tools/amadeus-utility.ts` | doctor に Standing delegation grant 行 |
| 変更 | `packages/framework/core/knowledge/amadeus-shared/audit-format.md`+`docs/reference/12-state-machine.md`/`.ja.md` | taxonomy 2行+narrative 節(en/ja 同期) |
| 新規 | `tests/integration/t-standing-grant.test.ts` | 43テスト(赤側6種+mint 拒否+一時状態 fixture+決定性+白側) |
| 変更 | tests ピン5点+allowlist+registry+complexity-baseline | 件数 73→75 同期・理由付き allowlist 3エントリ8行 |
| 生成 | dist×6+self-install ツリー | 機械再生成(手編集なし) |

## 主要な実装判断

- 全条件 AND は qualifiedStandingGrant で順次判定(いずれか false → null → 従来経路フォールバック — 検証欠陥がゲートを止めない)
- fail-open 分岐(lib:2484)とは挿入位置で排他(humanActedSinceGate false 後のみ到達 — reviewer が実読確認)
- spawn-only の CLI dispatch 2 case+usage+防御 catch の8行のみ理由付き allowlist(spawn-blindspot-two-step (ii))

## 逸脱

なし(E-SDG-AD2 裁定 X 遵守 — reject 側 diff ゼロを reviewer が対称関数抽出 diff で確認)。

## テスト・検証(実測、測定 ref: bolt head fcb9c1ac6 = origin/main 8051dc733 rebase 済み+mirror bab0fc511)

- 検証列: typecheck/lint/dist:check/promote:self:check/runner-gen/registry/complexity/project-gate 全 exit 0、フル CI **372 files / 0 fail**(#1139 再接地後の再実測)
- patch gate: 246行中 covered 238+allowlist 8・**uncovered 0** / project gate 68.12%(+27.18pp)
- 落ちる実証: revoke 判定無効化注入 → 1テスト赤 → 復元 green(dist 注入面 — injection-surface-verify)
- レビュー: architecture-reviewer READY(GoA 2、Critical/Major 0・Minor 1 = scope 二重チェックの簡素化候補は非ブロッキング)
- PR: [#1147](https://github.com/amadeus-dlc/amadeus/pull/1147)(e3 レビュー中、マージはユーザー承認 — no-AI-merge)

## Plan からの逸脱

なし — Step 1〜9 全実施(Step 6 のテスト数は plan 見積り超の43件)。#1139 前進への base-advance-regrounding(rebase→regen 無変更→全検証再実行)を追加実施。

## レビュー是正(e3 PR #1147 REVISE Major-1、測定 ref: bolt head 186593e62)

- 指摘: standingGrantSatisfiesGate の skeleton 除外が literal "on" のみ照合 — stance は生値 persist のため raw "scope-dependent" × greenfield スコープが「skeleton 決して自動被覆せず」契約を素通り
- 是正: SKELETON_ON_SCOPES を amadeus-lib.ts へ export const 化(orchestrate は import 切替)+除外条件を `stance === "on" || (stance !== "off" && SKELETON_ON_SCOPES.has(scope))` へ拡張。RED 2本(scope-dependent 生値/不在 stance → false)+WHITE 2本(明示 off → true、bugfix 非 greenfield → true)追加(t-standing-grant 43→47件)
- 落ちる実証: pre-fix dist へ checkout → 当該テスト 1 fail 実測 → regen 後 47/47 green(注入面 = dist、injection-surface-verify)
- 検証列(再実行): typecheck/lint/dist:check/promote:self:check 全 exit 0、フル CI PASS(coverage registry regen 込み)、patch gate 243行/covered 235/allowlist 8/**uncovered 0**、project gate 68.13%(+27.19pp)
- mirror: 186593e62 を mainline へ --3way 適用、fidelity cmp 全一致(registry 衝突は bolt 実ファイル採用で解消・マーカー grep 0)
