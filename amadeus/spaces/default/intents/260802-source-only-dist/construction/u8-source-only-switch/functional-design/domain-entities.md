# Domain Entities — u8-source-only-switch

上流入力(consumes 全数): component-methods(C7 段階2 / C8)、requirements(FR-4/FR-5/NFR-2/3)、components(C7/C8/C9)、unit-of-work(u8)、unit-of-work-story-map(Slice 3)、services(negative 確認)。

## 対象エンティティ

本 Unit は境界契約の切替であり、新ランタイム型は境界ガードの検査述語のみ。

| エンティティ | 変更 |
|---|---|
| `.gitignore` | COMMITTED 契約(:16-19)→ source-only 契約。未追跡化面 ignore + allowlist 否定(u6 正本導出)+ `.codex/local/` 新設 |
| git index | `git rm --cached` で dist/** + self-install 面(− allowlist)を除外。作業ツリー不変 |
| ci.yml | 旧 check 2ステップ撤去(:243-244/:246-247)、境界ガードステップ追加 |
| `package.ts --check`(committed 比較モード) | 撤去(比較対象消滅。再現性検査は u7 着地形が canonical — verb 再定義・寄せ替えなし) |
| `amadeus-graph.ts compile --check` | 不変量検証(i)〜(v)へ再定義(:254-255 の呼び出しは維持) |
| `promote-self --check` | ローカル鮮度検査へ再責務化(carve-out 不変) |
| `detect-ci-changes.sh` | drift フィルタ改訂(:18-24) |

## 境界ガードの検査述語

```ts
// 検査: git ls-files の出力と生成対象パターンの交差が空集合
type BoundaryVerdict =
  | { readonly kind: "clean" }
  | { readonly kind: "violation"; readonly trackedGenerated: readonly string[] }; // loud fail
```

- 期待集合は u6 正本 allowlist + u1 同梱範囲から導出(BR-U8-4 — 第2定義禁止)。判定は `git ls-files` 実出力から導出(検証劇場にならない)

## 不変条件

1. 切替 PR マージ後、`git ls-files` に生成対象パターンのヒットが 0(境界ガードが恒常検査)
2. `bun run build` 実行後の `git status --short` が空(NFR-2 — u5/u6/u7 の成果と合流して成立)
3. 手編集検出の空白期間ゼロ(旧 check の撤去と再現性検査・境界ガードの有効化が同一コミット)
4. per-user 第3カテゴリ(u6 perUserPatterns)と稼働中 worktree はどの手順でも削除・除外対象にならない
