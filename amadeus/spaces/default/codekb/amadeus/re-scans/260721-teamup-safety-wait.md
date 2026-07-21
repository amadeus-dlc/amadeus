# 260721-teamup-safety-wait 再スキャン記録

## 観測点

- Date: 2026-07-21T02:02:12Z
- Base commit: `a326f47bc0146a3b4285552f42b92fd61fb343a7`
- Observed commit: `3e349465b07ea415fd1303a072d161438d6bbf3c`
- Reachability: base は observed の祖先（131コミット）。共有 freshness pointer `37f8cf5e...` は非祖先のため除外。

## Focus

`scripts/team-up.sh` → Herdr pane → Codex TUI の `Additional safety checks`／`Keep waiting` 停止を対象に、`scripts/run-codex.sh`、`scripts/team-msg.sh`、4つの関連 integration test、外部 agmsg codex-monitor／shim／bridge を調査した。焦点7ファイルの base→observed 差分は0。設計候補は team-up 所有の Herdr 境界に限定した Codex pane 専用 dismiss supervisor であり、完全 visible fingerprint、二重読取、one-shot latch、rate limit、解除確認、session／pane cleanup、version drift fail-closed を要求する。

## 制約

この修正は TUI modal を自動解除するだけで、サーバー側 safety check を無効化しない。Herdr の read→send 間に原子的 primitive がないため TOCTOU リスクは残る。通常 question、approval、composer、shell prompt、曖昧／過去出力に入力してはならない。
