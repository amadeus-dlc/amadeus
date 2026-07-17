# Security Design — U3 cursor-port

intent: 260715-opencode-cursor-harness / Unit: U3
上流入力: nfr-requirements(security-requirements.md SR-U3-1〜4)、functional-design(domain-entities.md CursorHookEnvelope/ToolNameMap)。

## 設計(モジュール別)

| 対象 | 保証機構 |
| --- | --- |
| parseCursorEnvelope | parse-don't-validate — 検証済み型 CursorHookEnvelope のみが後段へ流れる(SR-U3-1)。null → 非ゼロ(2以外)exit |
| exit コード | 定数 `EXIT_ADVISORY_FAIL = 1` をモジュールスコープで宣言し、exit(2) の呼び出しをコード上に持たない(SR-U3-2 — grep で検証可能な構造)。前提: R-U3-1 の exit 意味論再実測 |
| ToolNameMap | Readonly 定数(実測確定値のみ)— 未登録キーは変換せず EXIT_ADVISORY_FAIL(無音素通し禁止) |
| hooks.json.example | command はワークスペース相対 bun 実行のみ(SR-U3-3)— 例に外部 URL・シェル補間を含めない |
| 継承分 | U1 security-design 継承 |

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
