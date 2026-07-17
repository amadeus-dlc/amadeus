# Reliability Requirements — U1 opencode-skeleton

intent: `260715-opencode-cursor-harness` / Unit: U1
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)(R-U1-3 落ちる実証)、application-design の decisions.md(ADR-4)。

## 要件(検証可能形)

- RL-U1-1: emit は fail-fast(throw 伝播)— 部分生成物が dist:check を通過しない(ADR-4、write⇔check 対称で担保)
- RL-U1-2: dist:check の冪等性 — 2回連続実行で同一 exit 0(R-U1-3 検証列)
- RL-U1-3: 検証の失敗経路は「落ちる実証」で実在確認(エントリ故意欠落→DIFFERS/MISSING 赤の1回実測 — Mandated)
- RL-U1-4: クラッシュ耐性 — package.ts はビルド生成のみで永続状態を持たず、中断後の再実行で完全再生成(アトミック性は byte 照合で担保 — requirements NFR チェックリスト)

## N/A(反証可能根拠付き)

- 可用性 SLO・リトライ・フェイルオーバー: **N/A** — runtime service が存在しない(静的配布物)。回復可能性分類: ビルド失敗はすべて「回復不能=フェイルファスト」が正(エラー分類は construction phase rules に整合)
