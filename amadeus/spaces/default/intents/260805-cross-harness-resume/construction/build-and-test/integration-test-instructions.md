# Integration Test Instructions — 260805-cross-harness-resume

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象(新規3+既存4、すべてフルパス)

| ファイル | 固定する契約(requirements FR 対応) |
|---|---|
| `tests/integration/t460-caller-denial-reason.integration.test.ts`(新規) | FR-1: 拒否4原因値の判別(C1/C2/C3/C5 相異、C6=C1 同一の (b))+ FR-2: 原因別メッセージの復旧コマンド名 |
| `tests/integration/t461-kimi-session-start-recovery.integration.test.ts`(新規) | FR-3: C1/C2/C3 合成 → SessionStart 相当 → authorized の閉包(`.lock` 残存の解除含む) |
| `tests/integration/t462-session-takeover.integration.test.ts`(新規) | FR-4 (a)〜(f)(人間確認 fail-closed / 再バインド / role 明示 / audit / --project-dir / unpark 疎通) |
| `tests/integration/t365-kimi-reviewer-boundary.integration.test.ts` | NFR-2: 認可既定の不変(substring assert 全6件の無改訂 green) |
| `tests/integration/t-kimi-adapter.test.ts` | kimi adapter 契約の非退行(raw-cwd pin :413 は CON-3 でスコープ外のため無改訂) |
| `tests/integration/t416-registry-drift-guard.integration.test.ts` | verb registry の drift 不在(session-takeover の dispatch/Valid 同期) |
| `tests/integration/t-coverage-mechanism-ratchet.test.ts` | mechanism 台帳(EXPECTED_NONE_TO_CLI への t452/t453 登録) |

## 実行

```
bun test <上記7ファイルのフルパス> --timeout=60000
```

fixture は repo 外 tmp に carrier 状態を合成する(NFR-3)。実行前 `ls` で全パス実在確認、実行後 `across 7 files` 照合。

## 合否

全 pass / `across 7 files`。t365 の6 assert(拒否側 :504/:536/:573/:646、許可側 :669/:689)が無改訂で green であること。
