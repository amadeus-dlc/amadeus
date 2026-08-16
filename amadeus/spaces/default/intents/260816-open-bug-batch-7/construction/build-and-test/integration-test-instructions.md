# Integration Test Instructions — 260816-open-bug-batch-7

depth = Minimal。統合面は 3 つ:

1. **no-silent-drop gate の実走**: `bun run no-silent-drop -- --base-revision $(git merge-base HEAD origin/main)` → `status: "pass"` exit 0(conductor 統合断面で実測済み)
2. **self-install 配送の実ツリー検証**: `bun run build` → `.pi/agents/` 集合一致・reviewer charter の `tools: read, grep, find, ls` 逐語・追跡汚染 0 件(t2363 + t209 が固定)
3. **docs guard の落ちる実証**: t3028 拡張述語の注入 Red → revert 残渣ゼロ(unit 実装時に 3 種実測済み — code-summary 参照)

CI の blocking 集合(typecheck / lint / 隔離2回ビルド再現性 / source-only / グラフ不変量 / Tests / Coverage 両条件 / Patch Coverage / plugin-conformance-e2e)は各 PR のリモート CI を正とする。
