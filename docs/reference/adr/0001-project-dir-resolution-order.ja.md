# ADR-0001: プロジェクトディレクトリ解決順

> 言語: [English](0001-project-dir-resolution-order.md) | **日本語**

- Status: Accepted
- Date: 2026-08-20
- Scope: `resolveProjectDir` と `resolveProjectDirFromHook`

## Context

Issue #1279 では、プロジェクトディレクトリの解決後に cursor 依存の
engine 経路が失敗し得ることが確認された。`CLAUDE_PROJECT_DIR` が誤った
workspace を指すと、環境変数の段が契約どおりに動作していても、その
project directory の下で active-space または active-intent の解決が空に
なることがある。そこで Issue #1287 (E-DAGRA3) は、この横断的な順序を
変更する前に ADR を作ることを求めた。CLI と hook の両 resolver が同じ優先順位
を持つため、片方だけを変更すると新たな非対称性が生じる。

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

### 選択肢 2: 環境変数優先を維持し、cursor 解決失敗を診断する

既存の契約を維持しつつ、選択された project directory の下で active-space
または active-intent の解決に失敗した場合、project directory と、その値の
provenance（`CLAUDE_PROJECT_DIR`、workspace marker、script path、CWD）を含む
stderr 診断を出す。marker-less scratch fixture が cursor を解決しない場合は
無音のままとし、問題が確定する cursor 解決境界で診断する。

## Decision

選択肢 2 を採用する。`CLAUDE_PROJECT_DIR` は、workspace-marker、script-path、
CWD fallback の各段より上位に、両 resolver で維持する。resolver は選択した
project directory の source を小さな provenance seam で記録する。intent record
が存在するのに cursor 解決に失敗した場合、その失敗面が project directory と
source を含む診断を出す。project directory の解決自体は無音で、選択した値を
変更しない。

## Consequences

- 明示的な環境変数 override との互換性を維持できる。
- active-space または active-intent の解決失敗が、project directory と source
  を伴って失敗地点で見える。
- cursor を解決しない scratch fixture からは、新たな stderr が出ない。
- 将来、優先順位を変更する場合は別の ADR とし、選択肢 1 に列挙した呼び出し元を
  改めて検討する。
