# Requirements Analysis Memory

## Interpretations

- 2026-08-04T09:33:35Z — Kiro CLIの直接接続はtransport単位のlive greenを含む; ユーザー回答Q1=Aにより、ACP/TUIの片方のgreenを他方へ代用しない。

## Deviations

- 2026-08-04T09:33:35Z — 既存Intent・Scope・Issueで確定済みの境界を再質問しなかった; 重複質問を避け、未確定だったKiro直接接続時のlive証拠だけを確認した。

## Tradeoffs

- 2026-08-04T09:33:35Z — Kiro CLI全体で代表live 1本とする案より、接続transportごとのlive greenを採用した; transport固有の認証・終了・cleanup差を実証し、偽の能力継承を防ぐため。

## Open questions

- 2026-08-04T09:33:35Z — Kiro ACP/TUIそれぞれの安全なauth/config bindingと子孫process cleanupは成立するか; 後続設計・実装前のruntime probeで確定する。
