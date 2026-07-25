# Security Test Instructions — 260725-solo-standing-grants

上流入力（consumes 全数）: `construction/grant-authorization-domain/code-generation/code-generation-plan.md`、`construction/grant-authorization-domain/code-generation/code-summary.md`、`construction/solo-gate-transaction/code-generation/code-generation-plan.md`、`construction/solo-gate-transaction/code-generation/code-summary.md`、`construction/harness-contract-and-regression/code-generation/code-generation-plan.md`、`construction/harness-contract-and-regression/code-generation/code-summary.md`

- U1 の `code-summary.md` — HUMAN_TURN provenance 検証と取消投影、未登録・archived directory の corpus 排除を引き、認可境界の攻撃面を確定した。
- U2 の `code-summary.md` — lock 内・mutation 前の commit 再検証と Grant Id 差替え拒否を引き、TOCTOU 攻撃 fixture の対象とした。
- U3 の `code-summary.md` — 全 harness 投影の同義性と supply-chain 面を引き、harness 間で認可意味論が緩む経路がないことの検証対象とした。
- 各 unit の `code-generation-plan.md` — 変更 file 一覧を引き、攻撃面の走査範囲を確定した。

## 選定根拠（比例選定）

本ファイルは、承認済み NFR に実在するセキュリティ目標があるために生成する。

- **NFR-03**（requirements.md）: Grant Id substitution、cross-intent use、forged provenance を fail-closed にする。合否は「全 attack fixture で自動 approval 0 件」。
- 各 unit の `nfr-requirements/security-requirements.md` § Authorization Controls / § Inputs and Threat Boundary。

DAST、network scanning、認証基盤テストは適用対象なし（外部公開エンドポイント・ネットワークサービスを持たないローカル CLI）。

## 攻撃面と対応 fixture

| 攻撃 | 期待挙動 | 検証 |
|---|---|---|
| Grant Id substitution（route 後に後発の長寿命 grant へ差替え） | route で選択した ID のみを検証し差替えない | `t-solo-gate-transaction.test.ts` — `commits the routed Grant Id and never substitutes a later-expiring grant` |
| route 後の revocation（TOCTOU） | mutation せず typed fallback | 同 — `falls back when the routed grant is revoked before the commit` |
| cross-intent 利用 | 候補にならず human gate | `t-solo-standing-grant-domain.test.ts` — `excludes expired, revoked, cross-intent, malformed, and ambiguous issue ids` |
| receipt owner のすり替え / cursor 切替 | receipt owner に pin、不一致で fallback | `t-solo-gate-transaction.test.ts` — `pins a valid grant commit to the receipt owner after a cursor switch`、`falls back when the routed grant no longer belongs to the receipt owner` |
| forged / 破損 provenance、ambiguous ID | `invalid-provenance` / `ambiguous-id` として判別し不採用 | `t-solo-standing-grant-domain.test.ts` — `exact lookup distinguishes not-found, ambiguous, and expected invalidity` |
| 未登録・archived directory からの取消・receipt 混入 | corpus へ混入しない | 同 — `ignores revocations from unregistered and archived intent directories`、`does not mix receipts from unregistered or archived directories` |
| 偽造 / 重複 receipt | absent・malformed・duplicated は null、duplicate owner は fatal | `t-solo-gate-transaction-seam.test.ts`、`t-solo-gate-transaction.test.ts` — `treats duplicate receipt owners as fatal without choosing either owner` |
| team mode への carrier 注入 | mutation 前に拒否 | `t-solo-gate-transaction.test.ts` — `rejects the carrier in team mode before any mutation` |
| 他 session からの presence mint / consume | 拒否 | `t-solo-gate-transaction-seam.test.ts` — `does not mint or consume from another session` |
| 非 run-stage directive への carrier 混入、未知 field | strict wire で fail-closed | `t-solo-gate-transaction.test.ts`（unit）— `rejects carrier fields on non-run-stage directives` |

## 実行方法

```
bun test tests/unit/t-solo-gate-transaction.test.ts \
         tests/integration/t-solo-standing-grant-domain.test.ts \
         tests/integration/t-solo-gate-transaction.test.ts \
         tests/integration/t-solo-gate-transaction-seam.test.ts
```

SAST は canonical lint（`bun run lint`）が担う。依存脆弱性は下記のとおり**別判定**として `bun audit` で扱う。

## 判定（2軸を分離する）

`project.md` の `cid:build-and-test:c1-doctor-seam` に従い、**対象変更の security regression** と **リポジトリ全体の dependency audit** を別判定にする。

### 1. 対象変更の security regression — PASS

上表の全 attack fixture が pass し、自動 approval は 0 件。NFR-03 の合否目標を満たす。

### 2. リポジトリ全体の dependency audit — CONDITIONAL（範囲外）

`bun audit` → **exit 1**、`12 vulnerabilities (3 high, 8 moderate, 1 low)`。

- 全件が `@anthropic-ai/claude-agent-sdk`（`package.json` § devDependencies）の推移依存（`fast-uri` ×2 high、`hono` ×1 high ほか）。
- 本 intent は依存グラフを変更していない（`git diff --name-only c4c9531ee HEAD -- package.json bun.lock` が空）。したがって本変更による退行ではなく既存 advisory である。
- `project.md` Forbidden（既存の赤を無視しない）に従い隠さず conditional readiness として明示し、範囲外の依存更新は別作業へ送る。配布フレームワーク自体は Bun-only で、これらは配布物に含まれない dev-only 依存である。

この 2 判定は相互に代替しない。dependency audit の CONDITIONAL は security regression の PASS を取り消さず、逆に regression の PASS は advisory の存在を打ち消さない。
