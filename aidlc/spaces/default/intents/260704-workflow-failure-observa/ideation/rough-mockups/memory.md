# Rough Mockups Memory

## Interpretations

- 2026-07-04T01:37:50Z — `rough-mockups` は user-facing UI ではなく、CLI と markdown artifact から見える失敗証拠の情報設計として扱う。stage 定義は非 UI initiative では system interaction diagrams を作るよう求めているため、この解釈で進める。

## Deviations

- 2026-07-04T01:37:50Z — Web dashboard の画面案は作らない。Scope Definition で OpenTelemetry collector と dashboard は scope out と確定しているため、rough mockup の対象から外す。

## Tradeoffs

- 2026-07-04T01:37:50Z — `doctor` を第一入口にする案を推奨する。audit は証跡、OpenTelemetry は分析境界、Intent artifact と PR 説明は追跡文脈であり、日常確認の入口としては CLI の doctor が最も軽い。
- 2026-07-04T01:37:50Z — `skills/` は配布物境界として扱い、mockup でも直接編集経路を示さない。source、昇格先、host harness、Intent artifact の境界を維持する。
- 2026-07-04T02:14:27Z — Product Lead reviewer は `READY` と判定し、重大な指摘はなかった。成果物は非 UI initiative として、doctor、system interaction diagram、個別 flow、OpenTelemetry core 計装境界を要件化可能な粒度で示していると判断された。

## Open questions

- 2026-07-04T01:37:50Z — doctor 出力に OpenTelemetry の具体 metric 名まで載せるか、代表境界だけに留めるかを確認する。
