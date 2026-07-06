# 動向 — Engine Installer（260705-engine-installer）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

## 関連する動向

- エージェントハーネスの構成規約は、`.claude/`（Claude Code）と `.agents/`（ハーネス中立）の 2 系統併存が現状の前提である。本リポジトリは CD009 でエンジンの正を `.agents/amadeus/` へ寄せ、`.claude/` を相対 symlink で参照する構成を採用済みである。
- 上流 awslabs/aidlc-workflows（v2）はハーネス別 `dist/` を配布形態とするが、本リポジトリは適応コピー（skill 改名 + grilling 結線）を含むため、上流 dist をそのまま流用できない。
- オフライン・cold cache での起動保証（#441 の受け入れ条件）は、依存を持たない Bun 単体実行スクリプト群という現行エンジンの設計と整合しており、インストーラもこの前提（node_modules 非依存）を壊さないことが求められる。

## 含意

配布の正を 1 箇所（`.agents/amadeus/`）に保ち、ハーネス別の差分を「配線（symlink、settings.json）」に閉じ込める方針は、2 系統併存の動向に対して追加ハーネス対応の拡張点を最小にする（Codex は配置のみで成立 = grilling 確定 2 が実例）。
