# Build Instructions — 260817-inception-cost-batch

上流入力: 両 Unit の `code-generation-plan.md` / `code-summary.md`(U1 = issue-evidence-upstream、U2 = re-input-exclusion)。

## 依存導入と環境

```bash
bun install          # Bun-only(NFR-2)。runtime dependency の追加なし
```

- 環境変数・ローカルサービスは不要。gh CLI は optional dependency(不在でもビルド・テストは完結 — FR-EVD-5 の fail 設計をテストは fake runner で検証)

## ビルドと検証

```bash
bun run typecheck    # tsc --noEmit
bun run lint         # Biome(フォーマッタ無効)
bun run build        # 全ハーネス dist + self-install 面の再生成(manifest 発見の全ハーネス対象)
```

- ビルド検証: `bun run build` 後に `git status --porcelain` で tracked 不変を確認(dist は untracked 投影 — 変更が出たら正本と投影の不整合)
- 再現性(隔離2回ビルド)・source-only 境界・グラフ不変量は CI の blocking 集合が正(ローカル手動チェックで代替しない — project.md Forbidden)

## 既知のトラブルシューティング

- 新規 worktree では self-install 面が欠けるため `bun install && bun run build` を移設定型に含める(`cid:code-generation:solo-bolt-worktree-required`)
- merge 取込直後の registry regen は必ず `bun run build` の後に行う(stale dist は enumeration universe を欠落させる — `cid:code-generation:c5-regen-needs-build`)
