# Reliability Requirements — U3-mirror-config

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## RL-U3-1: fail-closed の非退行

invalid 1面で全体 invalid(BR-U3-2)— 「読めた層だけで解決」の fail-open 退行をテストで固定(落ちる実証: invalid 注入で loud 実測 — business-logic-model のテスト設計)。

## RL-U3-2: 全不在 default の安定性

3面とも不在 → { autoMirror: false } の決定的 default(BR-U3-2)。default 変更は仕様変更(ユーザーエスカレーション対象)。

## RL-U3-3: プラットフォーム差

ランタイムは technology-stack.md のとおり Bun(TypeScript/ESM 直接実行)。その Bun の readFileSync 実装差(macOS=EISDIR throw / Linux=空文字 — 出典は team.md cid:bun-readfilesync-dir-platform-divergence であり technology-stack.md には記載なし)を考慮し、不在判定は ENOENT 系で行い、テストのポータブル注入設計(ENOENT/dangling symlink)に従う。
