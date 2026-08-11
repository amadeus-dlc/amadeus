# Component Dependency — 制御バイト検出ゲート(Issue #2814)

上流入力(consumes 全数): requirements.md(FR の依存 = 線形連鎖という scope 裁定の反映)、architecture.md(git バイナリへの依存は既存ゲート先例(no-silent-drop の base-revision 解決)と同型であることの確認)、component-inventory.md(既存コンポーネントへの依存が読み取り参照のみであることの棚卸し)

## 依存マトリクス

| 依存元 → 依存先 | 種別 | 内容 |
|---|---|---|
| control-byte-gate CLI → control-byte predicate | 同期 import | 判定関数の呼び出し |
| control-byte-gate CLI → git(spawn) | 同期 subprocess | `git ls-files -z` の列挙のみ(書込なし)。spawn 失敗・非 0 exit(git 不在・非 git 環境)は個別ファイルの readErrors とは別の列挙段エラーとして即 loud fail(非 0 exit + 原因メッセージ)— NFR-3 fail-closed の列挙段適用 |
| control-byte-gate CLI → FS | 同期読取 | tracked ファイルのバイナリ読取のみ(書込なし) |
| CI ジョブ → control-byte-gate CLI | プロセス起動 | `--check` 1回 |
| unit テスト → predicate | 同期 import | 実行時生成バイトでの判定固定 |
| integration テスト → CLI(`runControlByteGate` seam) | 同期 import | scratch 一時ディレクトリ + `listFiles` 注入での走査固定(spawn 盲点回避 — bun-coverage-spawn-blindspot) |

## 既存コンポーネントとの関係(全て読み取り参照)

- `isUtf8`(amadeus-migrate.ts:477)・`CONTROL_CHARS`(amadeus-lib.ts:4298): **コメント参照のみ** — import しない(tests/ → packages/framework/core の import は不要かつ patch 母集団を汚染しうる。導出はバイト集合の転写+出典コメントで行う — FR-CBG-11 の「参照が実在」はコメント参照で充足)。
- 既存走査系ゲート(no-silent-drop / unchecked-cast-guard): 依存なし(様式先例としてのみ参照)。
- `t-learnings-persist-seam` の #786 guard・`t55` の NUL-skip: 改修しない(Out of scope)。

## データフロー

`git ls-files -z` → path 列(バイト安全) → allowlist 除外(path 完全一致) → `readFileSync` Buffer → `findControlByte` → 集計(violations / staleAllowlist / readErrors) → stdout 診断 + exit code。

共有リソース: なし(読み取り専用・単発プロセス。coverage 計測(単独所有者規律 c1-coverage-single-owner)以外の直列化要件なし)。
