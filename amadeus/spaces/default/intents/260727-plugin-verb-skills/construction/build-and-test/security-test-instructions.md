# Security Test Instructions — 260727-plugin-verb-skills

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(U1〜U4 の各 code-generation 成果物 — 実装対応と検証エビデンスの正本)

## 選定(NFR trace)

- trust 境界不変(SR-U2-1): install は素材配置のみ・compose 三層へ委譲 — t353 が staging 外書込なし・compose 委譲失敗伝播をピン(code-summary.md)
- 無音上書き禁止(SR-U2-3): t353 の different fail+--force ケース
- symlink 防御(SR-U2-2): t353 の symlink skip ケース
- 固定 verb 導線(SR-U4-1)+runner guard 非干渉(FR-3d): t354 のマーカー不含(落ちる実証済み — code-summary.md)
- 生成導線の入力限定(SR-U3-1): t351 が検証済み graph 由来のみの生成をピン

## 対象外(根拠付き)

依存監査・DAST 等は対象変更に新規依存ゼロ(TS-U*-1)のため本 intent では追加しない(既存 CI の必須 scan は不変)。
