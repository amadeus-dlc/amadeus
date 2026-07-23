# Security Requirements — U1-mirror-tool

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## SR-U1-1: トークン非保持(C-01/ADR-7)

gh 認証は keyring 委譲。環境変数・ファイルへのトークン書込を行わない(現行 mirror.ts と同一 — 挙動不変)。

## SR-U1-2: shell 非経由 spawn(既存様式維持)

gh 呼出は引数配列 spawn(Bun.spawnSync({ cmd: [...] })、shell 非経由)+env: process.env 明示(bun-spawn-env-snapshot)。status の gh view 追加呼出も同一様式。

## SR-U1-3: 入力検証(境界)

--intent 引数は既存 parse(recordDirMatches 系)の検証を通る。status は書込ゼロのため出力面の injection 面なし。
