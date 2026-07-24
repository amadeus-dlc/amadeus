# API ドキュメント

## 外部 CLI サーフェス

### Mirror CLI

```text
bun {harness-dir}/tools/amadeus-mirror.ts {create|sync|close|status} [--intent {dirName}]
```

| サブコマンド | 外部作用 | 現行の主要前提 |
|---|---|---|
| `create` | `gh issue create`、state へ Issue 番号を書込 | 同じ Intent に番号がないこと、`gh` が利用可能 |
| `sync` | `gh issue edit` | state に Issue 番号があること |
| `close` | 最終 edit 後に `gh issue close` | registry と state の両方が完了 |
| `status` | `gh issue view` のみ | read-only、差異を分類 |

CLI は引数を配列として `gh` へ渡し、shell 展開を介さない。`status` は clean を0、drift を1、前提失敗を2として扱う。create/sync/close の詳細なエラーは loud failure だが、現行 engine は GitHub 障害を workflow 継続可能な warning へ正規化していない。

### Orchestration CLI

`amadeus-orchestrate.ts next` は状態を変更せず directive を返し、`report` が state tool を呼び出して遷移を確定する。mirror phase 境界では、ask、sync を含む print、error の既存 directive kind を再利用し、新しい transport-specific directive kind は持たない。

## 内部 TypeScript 契約

### Mirror config

現行:

```ts
type MirrorConfig = {
  readonly autoMirror: boolean;
};
```

`parse` は JSON、object root、既知キー、boolean 型を検査する。`mergeLayers` は Global→Space→Intent の順で後勝ちに解決し、いずれかの layer が invalid なら部分結果を返さない。目標契約は `off | prompt | auto` の文字列 union、既定値 `prompt`、boolean 拒否である。

### Boundary decision

現行 `decideMirrorBoundary(autoMirror, hasMirrorIssue)` は、auto-sync と ask を区別するだけで、operation や lifecycle boundary を型として持たない。目標では少なくとも次の情報を入力へ含める必要がある。

- mode: `off | prompt | auto`
- operation: `create | sync | close`
- boundary: Intent Capture 承認、phase 完了、park、workflow 完了
- mirror/provenance/receipt の現在状態

戻り値は `suppress | ask | execute` と理由を持つ小さな判別 union が適する。

### Mirror state

現行 state の公開フィールドは `Mirror Issue` と `Mirror Boundary Receipts` である。receipt は canonical phase ごとに `pending | completed` を持ち、不正 JSON、未知 phase、未知 status、重複キーを拒否する。

目標では、Issue ownership provenance、操作 identity、未同期状態、最後の失敗、再試行対象、最終 sync 成功を表す必要がある。フィールドを追加する場合は status 表示や retry decision が実際に消費し、未使用の検証用フィールドを作らない。

## GitHub API 境界

外部 API は `gh` CLI に限定される。

| `gh` 呼び出し | 用途 |
|---|---|
| `gh auth status` | 認証 readiness |
| `gh issue create` | Mirror Issue 作成 |
| `gh issue edit` | title/body/label 同期 |
| `gh issue close` | 安全条件確認後の close |
| `gh issue view` | status 比較と再発見候補 |

token は Amadeus が保持・表示せず、`gh` credential store に委譲する。同期方向は record→Issue の一方向であり、Issue 編集を record へ取り込まない。

## 互換性とエラー契約

旧 boolean は互換変換しない。設定ファイルに boolean が残っている場合は、どの layer のどのキーが不正かを示す設定エラーとする。未指定だけが `prompt` へ解決される。

GitHub 操作の失敗は、外部操作の成功を偽装せず warning と未同期状態を記録し、workflow 本体は継続する。自動 close は provenance、最終 sync、landing のいずれかが欠ければ実行しない。
