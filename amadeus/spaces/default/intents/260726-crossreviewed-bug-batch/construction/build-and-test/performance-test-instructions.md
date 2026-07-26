# Performance Test Instructions

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(6 unit 分)

## 比例選定の方針

承認済み NFR へ trace できる範囲のみ生成する(戦略名による機械追加はしない)。

## 対象と根拠

- **FR-1(#1489)固有**: benchmark 分散ゲートの両側実測は code-generation で完了済み(t292 に fixture 固定)。実時間の負荷試験は不要 — 同じ制御経路の決定的 fixture 検証で構成要素を確認済み(cid:build-and-test:wtfbt-c3 系の姿勢)。
- **FR-5(#1462)固有**: plugin 列挙の Dirent 化は syscall 削減方向 — `t-plugin-stage-discovery-performance.integration.test.ts` で検証。ただし本テストの 20% 相対閾値自体がランナージッタで頻繁に偽赤(**#1525 起票済み、実測 0.218〜0.363**)— CI 赤の帰属は assertion 実文で確定すること。
- その他のユニットに性能 NFR は無く、負荷試験は生成しない(根拠: requirements.md NFR に性能項目なし)。
