# Domain Entities — u003-kanban-hooks

上流入力: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md)

## 状態ファイル（`.claude/kanban-sync/`、gitignore 対象）

| ファイル | 形式 | 意味 |
|---|---|---|
| `queue` | 1 行 1 エントリ。dirName（例 `260705-github-kanban-sync`）または `*` | 未反映の変更。flush が rename で専有する |
| `queue.processing` | queue と同形式 | flush が専有した処理中スナップショット。成功で削除、失敗で queue へ戻す |
| `last-success` | ISO 8601（UTC）1 行 | 最後に成功した sync の時刻。2 分抑制の判定に使う |
| `drops.log` | `<ISO 8601>\t<理由>` の追記ログ | flush の失敗と `*` の手動 `--all` 委譲の記録 |

## hook 入力（Claude Code の hook stdin JSON のうち使う部分）

```ts
type HookInput = {
  tool_name?: string;                       // PostToolUse のみ
  tool_input?: { file_path?: string };      // PostToolUse のみ
};
```

Stop / SessionEnd では stdin の内容を使わない（キューと時計だけで判定する）。
