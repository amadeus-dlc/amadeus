# Reliability Design — U1 opencode-skeleton

intent: 260715-opencode-cursor-harness / Unit: U1
上流入力: nfr-requirements(reliability-requirements.md RL-U1-1〜4)、functional-design(business-rules.md R-U1-3)。

## 設計(write⇔check 対称の実現)

- RL-U1-1(fail-fast): emit 内 try/catch なし(throw 伝播)— 呼び出し側契約(package.ts:459-461)に整合
- RL-U1-2(冪等): emission table を build/check の単一ソースにする構造(モジュールローカル定数関数 `emissionTable(ctx)` が両モードで同一 table を返す)
- RL-U1-3(落ちる実証): 実装完了時に table エントリ1件を一時的に欠かせて dist:check 赤(DIFFERS/MISSING)を実測 → 復元して緑 — 実測列を code-summary に記録
- RL-U1-4(再実行完全性): 状態レスなビルド(既存 buildTree 特性の継承)— 新規設計なし

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
