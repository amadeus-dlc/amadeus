# ADR-0001: プロジェクトディレクトリ解決順

- Status: Accepted
- Date: 2026-08-20
- Scope: `resolveProjectDir` と `resolveProjectDirFromHook`

## Context

Issue #1279 では、プロジェクトディレクトリの解決順が cursor に依存する
engine 経路の成否を決めることが確認された。`CLAUDE_PROJECT_DIR` が main
checkout や、workspace marker を持たない別ツリーを指すと、環境変数の段が
プロセスをその解決不能なツリーに固定する。そこで Issue #1287 (E-DAGRA3)
は、この横断的な順序を変更する前に ADR を作ることを求めた。CLI と hook の
両 resolver が同じ優先順位を持つため、片方だけを変更すると新たな非対称性
が生じる。

正規の workspace predicate は、`amadeus/` ディレクトリと既知ハーネスの
`tools/` ディレクトリの組み合わせである。marker の不一致は診断できる状態
だが、明示的な環境変数 override が無効だという証明ではない。テスト、scratch
project、別 workspace を意図的に対象にする呼び出し元は、この override が
優先されることに依存している。

## 検討した選択肢

### 選択肢 1: script-path 解決を環境変数より上位にする

`CLAUDE_PROJECT_DIR` より先に、tool や hook の物理的な場所を project root と
して使う。これにより、worktree セッションが解決不能な環境パスに固定される
問題は避けられる可能性がある。しかし、別 workspace を指定する公式の方法を
上書きする。hook 起動、チームの worktree、fixture、scratch project-root
override に影響するため、採用には全呼び出し元の棚卸しが必要である。

### 選択肢 2: 環境変数優先を維持し、不一致を loud に診断する

既存の契約を維持しつつ、環境変数の値が marker を持つ workspace の内外に
ない場合、値、失敗した marker predicate、次段で選ばれるディレクトリを含む
stderr 診断をプロセスあたり一度だけ出す。意図的な override を維持したまま、
cursor/worktree の不一致を operator と CI に見えるようにする。

## Decision

選択肢 2 を採用する。`CLAUDE_PROJECT_DIR` は、workspace-marker、script-path、
CWD fallback の各段より上位に、両 resolver で維持する。marker 不一致の診断は
プロセスあたり最大一度だけ出し、resolver の返り値は環境変数の値を変更しない。
環境変数の値自体が marker を持つ workspace の内部または配下にある場合は、診断
を出さない。

## Consequences

- 明示的な環境変数 override との互換性を維持できる。
- marker を持たない環境変数値が原因の worktree/cursor 障害が、無音ではなく
  stderr で見える。
- 診断はプロセスあたり一行に制限され、resolver の繰り返し呼び出しでログを
  埋め尽くさない。
- 将来、優先順位を変更する場合は別の ADR とし、選択肢 1 に列挙した呼び出し元を
  改めて検討する。
