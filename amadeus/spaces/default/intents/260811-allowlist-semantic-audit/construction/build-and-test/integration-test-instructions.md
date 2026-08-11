上流入力(consumes 全数): code-generation-plan.md / code-summary.md

# Integration Test Instructions — 260811-allowlist-semantic-audit

`code-summary.md` が記すとおり、blocking ガードの適用点は `tests/coverage-patch-gate.ts` の
`runCheck` 1 箇所である。したがって integration 層の責務は「CLI 境界を通したときに
その 1 箇所が期待どおり赤/緑になること」と「実台帳 616 件への全数スイープ」の 2 つに絞る。

## 対象と配置

| ファイル | 対象 |
|---|---|
| `tests/integration/t537-allowlist-declared-class.integration.test.ts` | `runCheck` 経由の 4 面 + 実台帳スイープ + 宣言の実在固定 |
| `tests/integration/t535-allowlist-semantic-audit.integration.test.ts` | advisory な三値監査の実台帳スイープ(FR-1 の記録面) |

## 実行

```bash
bun test ./tests/integration/t537-allowlist-declared-class.integration.test.ts ./tests/integration/t535-allowlist-semantic-audit.integration.test.ts
```

`t537` は fixture の git リポジトリと `AMADEUS_PATCH_*` シームを使い、本番と同じ経路を通す。

## 検査面

| 検査 | 期待 |
|---|---|
| 宣言と実コードが食い違う | exit 1 + `declares <X> but the lines are <Y>` |
| 宣言が実コードと一致する | exit 0 |
| 宣言なし(ラチェットの opt-out) | exit 0 |
| 語彙外の値 | parse で throw |
| 実台帳の全数スイープ | 宣言済みエントリすべてで一致 |
| **宣言が実際に存在すること** | 宣言 0 件ならスイープは無条件に緑を返すため、別テストで固定する |

最後の 1 行は検証劇場の予防である(`org.md` Forbidden)。スイープ単独では「宣言が 1 件も無い台帳」
でも緑になり、ラチェットが進んでいるかどうかを区別できない。

## 交差する既存面

`t55-test-suite-drift.integration.test.ts` は `tests/README.md` を読むため、
本 intent の README 追記に追従する。README を触る変更では単独でも再実行する。

```bash
bun test ./tests/integration/t55-test-suite-drift.test.ts
```

## 期待被覆

`code-generation-plan.md` Step 9 が定めるとおり、フルスイート(`bash tests/run-tests.sh --ci`)を
**conductor が 1 回通す**。新規テストファイルの追加は honesty ratchet・境界ガード・
registry drift の横断ゲートを射程に入れるため、対象ファイルだけの実行では足りない
(`cid:code-generation:c3-conductor-runs-full-suite`)。
