# Performance Test Instructions: pr-convergence plugin

上流入力(consumes 全数): code-generation-plan、code-summary(各 unit)

## 比例選定(Comprehensive 戦略下でも承認済み NFR と実在境界へ trace する範囲のみ — bt-proportional-selection)

承認済み要件のうち性能面を持つのは次の2点のみで、いずれも実時間負荷試験でなく決定的検証で構成する(bt-timeout-verification-shape):

| 要件 | 検証形 | 実測 |
|---|---|---|
| ADR-4: mergeable UNKNOWN retry(MAX=5・10s) | タイミングシーム注入で回数・順序を決定的検証(実時間待機なし) | t446 の retry テスト green(5回で unknown-exhausted 確定、busy-wait なし) |
| regex-linearity-untrusted-input: terminalRefs/severity の新設 regex | 100KB 級敵対入力の線形性実測 | t447 に線形性テストを固定(builder 実測 green) |

## 非該当検査とその根拠

負荷試験・auto-scaling・SLO 検証は非該当(常駐サービスなし — nfr-design logical-components の CLI 原則)。機械追加しない検査とその根拠: スループット試験(収束 CLI は人間承認リズムの PR 単位実行で、性能境界が存在しない)。
