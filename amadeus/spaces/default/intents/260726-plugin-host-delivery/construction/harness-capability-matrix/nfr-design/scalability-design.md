# スケーラビリティ設計 — U1 harness-capability-matrix

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## N/A 継承(稼働時スケール)

scalability-requirements「適用可否(N/A の判定)」のとおり稼働体が存在せず、水平スケール等の常駐 service 向け指標は **N/A を継承** する(performance-requirements の N/A と同根)。

## 固定境界の文書設計(7 行 × 6 面の全数被覆)

scalability-requirements「対象母集団の固定境界」の合否(7 ハーネス固定集合の全数被覆)を、マトリクス文書の様式で決定的に担保する:

- **行の固定列挙**: マトリクスは claude / codex / cursor / kimi / kiro / kiro-ide / opencode の 7 行を固定順(この列挙順)で持ち、行の省略を認めない。reliability-requirements の silent skip 禁止と対で、「行がない=非対応」という暗黙表現を様式段階で不能にする
- **列の固定列挙**: business-logic-model ステップ 1 の 6 面(distribution / trust / composeTrigger / rootResolution / userOps / degradeContract)を固定列とし、count 照合(7×6=42 セル)を §12a の機械確認 1 手にする
- **機械可読な確定集合**(BR-U1-7): 下流 Unit(U2/U3/U6)が参照する「Bolt 3 / Bolt 6 の確定集合」は、マトリクス本文と別の機械可読列挙節(クラス別ハーネス名リスト)として置き、下流は推論でなく参照で消費する。security-requirements の合否走査に用いる ProbeRecord 参照 ID(security-design)と同様、参照の決定性を様式で作る

## 将来拡張の非設計(意図的省略)

scalability-requirements のとおり、将来ハーネス追加は別 intent で business-logic-model の 5 ステップを再適用する方針であり、本成果物側に動的スケール機構・テンプレート生成器は **設計しない**。反復可能性はプローブ手順の文書化(reliability-design の再現手順)で担保され、機構では担保しない。
