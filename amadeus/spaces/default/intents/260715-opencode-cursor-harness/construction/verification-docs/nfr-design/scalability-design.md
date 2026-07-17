# Scalability Design — U4 verification-docs

intent: 260715-opencode-cursor-harness / Unit: U4
上流入力: nfr-requirements(scalability-requirements.md SC-U4-1)。

## 設計

期待ファイル表は per-harness の Readonly 配列2本(EXPECTED_OPENCODE / EXPECTED_CURSOR)— ハーネス追加時は配列1本追加(保守規約は functional-design 明記済み+テスト内モジュールコメントへ焼き込み)。

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
