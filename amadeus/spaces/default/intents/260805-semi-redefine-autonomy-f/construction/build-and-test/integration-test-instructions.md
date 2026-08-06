# Integration テスト手順 — intent 260805-semi-redefine-autonomy-f(#2253)

上流入力(consumes 全数): `code-generation-plan.md`(全 7 Unit)、`code-summary.md`(全 7 Unit)

Comprehensive strategy の integration 面: Unit 横断の相互作用(認可基体 → 梯子 → 指令搬送 → advisory 解決)と、外部依存(実 FS の record / audit シャード / 台帳)の取り扱いを対象とする。

## 対象テスト(integration 層)

| Unit | ファイル | 対象 |
|---|---|---|
| semi-authorization-core | `tests/integration/t453-semi-ladder-runtime.integration.test.ts` | semi 梯子の runtime 貫通(認可基体が実 state / record 上で解決されること) |
| launch-autonomy-flag | `tests/integration/t450-autonomy-flag-branch.test.ts` | 起動宣言フラグの分岐が engine 経路で効くこと |
| semi-policy-carrier | `tests/integration/t455-semi-policy-cli.integration.test.ts` | CLI 面での decision policy 搬送(`policies:[]` 呼び出し面を含む) |
| stop-question-carveout | `tests/integration/t456-question-carveout-predicate.test.ts` | 人間宣言 semi Intent に対する Stop hook 質問 carve-out 述語 |
| advisory-auto-resolution | `tests/integration/t458-advisory-auto-resolution.integration.test.ts` | pending advisory を autonomy ladder で解決する経路(receipt 形状の同期を含む) |

## 実行方法

```
bun test ./tests/integration/t453-semi-ladder-runtime.integration.test.ts
bun test ./tests/integration/t450-autonomy-flag-branch.test.ts
bun test ./tests/integration/t455-semi-policy-cli.integration.test.ts
bun test ./tests/integration/t456-question-carveout-predicate.test.ts
bun test ./tests/integration/t458-advisory-auto-resolution.integration.test.ts
```

- **並列 fan-out 直後にフルスイートを回さない**。入れ子 spawn 型テストは外側の並列と重なるとタイムアウト予算を食い切り、負荷起因の偽赤を生む。負荷の収束を待つか並列度を落とす。
- エラー経路テストの green は「目的の分岐を実際に踏んだこと」を lcov の DA で確認してから完成扱いにする(別経路が同じ exit code に到達する偽経路 green を避ける)。

## 環境依存で赤くなりうる面(判定前に確認する)

| 面 | 症状 | 確認 |
|---|---|---|
| `@ast-grep/napi` 不在 | no-silent-drop 系が `TOOL_MISSING` | 当該 worktree で `bun install --frozen-lockfile` |
| NSD 台帳束縛 | `BASELINE_INVALID: previousDigest does not bind the trusted base bytes` | 対象ブランチの base に対して台帳を再束縛 |
| 並列負荷 | 単独実行では green、スイート内でのみ赤 | 単独再実行で対照を取り、負荷起因なら記録して再実行 |

環境起因の分類は、**未改変 base を同一条件(同一親配下の worktree・依存導入済み)で実行して失敗集合の差を取る**ことでのみ行う。ベースコミットを自分自身に対して検査する形の再現は縮退条件であり帰属の証拠にならない。
