# Construction ノート

## 実行方針

eval 先行の TDD で進める。BR001、BR002、BR006 のスキーマとファイル命名規則、および実測 commit の意味（working tree と HEAD が異なる場合は入力エラー）を eval の期待値として先に固定してから、`provenance:generate` の最小実装を入れる。

実測は git コマンドとファイルハッシュ計算だけで完結させ、人間の手書きを排除する（INV001）。

## 対象タスク

| タスク | 状態 | 方針 | 証拠 |
|---|---|---|---|
| T001 | 未着手 | `dev-scripts/evals/provenance-generate/check.ts` を作成し、`test:it:provenance-generate` を追加してから実装前の失敗（RED）を記録する。 | 未登録 |
| T002 | 未着手 | `dev-scripts/provenance-generate.ts` を新設し、`package.json` に `provenance:generate` を追加して GREEN を確認する。 | 未登録 |

## 作業順序

1. T001 で eval と検証入口（`test:it:provenance-generate`）を追加し、RED を記録する。
2. T002 で `provenance:generate` の最小実装を入れ、GREEN を確認する。
3. 一時 workspace fixture が成功時も失敗時も片付くことを確認する。

## 未確認事項

- なし。

## 実装判断

- CLI 引数は、build workspace と target workspace を別々のフラグ（`--build-workspace`、`--target-workspace`）で受け取る形式にした。自己開発運用では同じ path を渡す運用になるが、`domain-entities.md` が `buildWorkspace` と `targetWorkspace` を別概念として定義しているため、値が同じ場合でも概念を混同しない設計とした。
- 利用ツールの path 一覧は `--skill`（0個以上）、`--validator`（0または1個、`--validator-result` と対）、`--dev-script`（0個以上）の繰り返しフラグで受け取る。`validator` は `domain-entities.md` で単一オブジェクトとして定義されているため配列にしなかった。
- 実測対象ファイルの working tree と HEAD の内容比較は `git show <commit>:<path>` の出力と working tree の内容をバイト単位で比較する方式にした（`provenance:check` の照合ロジックと同じ手段を使い、実装を揃えた）。
- slug は `^[a-z0-9-]+$` で軽く検証し、D002 の命名規則（小文字英数字とハイフン）を機械的に強制する。
- 迷った点: build workspace と target workspace を分けるか単一の workspace 引数にまとめるかで迷ったが、`development.md` が「target workspace は Amadeus 本体リポジトリから切った別 git worktree を推奨する」としており、両者が異なる path になり得る運用を否定していないため、概念を保った分離を採用した。
