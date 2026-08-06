# Unit テスト手順 — intent 260805-semi-redefine-autonomy-f(#2253)

上流入力(consumes 全数): `code-generation-plan.md`(全 7 Unit)、`code-summary.md`(全 7 Unit)

Test Strategy は `amadeus-state.md` の `**Test Strategy**: Comprehensive`。よって要件・リスク・NFR 駆動の被覆を対象とし、コンポーネントあたり 15 テストは**上限の目安**でノルマではない。

各 Unit の `code-summary.md` が申告したテスト番号(tNNN)を正とし、下表は `find tests -name "<tNNN>-*"` の実出力からの転記。

## 対象テスト(unit 層)

| Unit | ファイル | 対象 |
|---|---|---|
| semi-authorization-core | `tests/unit/t451-semi-authority.test.ts` | `SemiAuthority` 認可基体の構成と basis 指紋 |
| semi-authorization-core | `tests/unit/t452-authorize-interaction-semi.test.ts` | 質問を 5 段梯子へ載せた `authorizeInteraction` の semi 分岐 |
| autonomy-statusline | `tests/unit/t448-autonomy-statusline-segment.test.ts` | statusline の Intent autonomy セグメント描画 |
| launch-autonomy-flag | `tests/unit/t449-autonomy-flag-parse.test.ts` | `--autonomy none\|semi\|full` の parse(last-wins 意味論、複数回出現) |
| launch-autonomy-flag | `tests/unit/t450-autonomy-flag-apply.test.ts` | parse 済みフラグの適用 |
| semi-policy-carrier | `tests/unit/t454-semi-policy-carrier.test.ts` | semi モード指令の decision policy 搬送 |
| advisory-auto-resolution | `tests/unit/t457-advisory-auto-resolve.test.ts` | ladder による advisory 自動解決の判定 |
| advisory-auto-resolution | `tests/unit/t459-advisory-receipt.test.ts` | receipt の provenance union と revocation 条項 |

## 実行方法

```
bun test ./tests/unit/t451-semi-authority.test.ts
bun test ./tests/unit/t452-authorize-interaction-semi.test.ts
bun test ./tests/unit/t448-autonomy-statusline-segment.test.ts
bun test ./tests/unit/t449-autonomy-flag-parse.test.ts
bun test ./tests/unit/t450-autonomy-flag-apply.test.ts
bun test ./tests/unit/t454-semi-policy-carrier.test.ts
bun test ./tests/unit/t457-advisory-auto-resolve.test.ts
bun test ./tests/unit/t459-advisory-receipt.test.ts
```

複数パスを 1 コマンドで並べる場合は、**シェル変数に入れて展開しない**(zsh は未クォートのパラメータを単語分割しないため、全体が 1 語として解決され `command not found` / 母集団の無音欠落になる)。配列展開かパスの直書きを使い、実行後に runner の `Ran ... across M files` と期待ファイル数を照合する。

正規判定はスイート全体(`bash tests/run-tests.sh --ci`)で行う。

## 配置規律

- 実 FS・プロセスを触る検証は unit 層に置かず integration 層に置く(test-size classification ratchet が `fs` トークンで medium を要求する)。
- in-process 駆動(spawn 盲点回避=計測の軸)とテスト層(配置の軸)は独立。実 FS を触る in-process テストは integration 層に置いたまま lcov 有効。

## カバレッジ期待

- 判定は CI の Project Coverage Gate(固定絶対下限 **AND** merge-base 相対許容低下幅)と Patch Coverage Gate の両方。ローカル `coverage:ci` の完走を push 前提条件にしない。
- 同一 worktree での coverage 計測は単独所有者を決めて直列化する(runner が起動時に coverageRoot を rmSync するため並行実行は相互破壊する)。
