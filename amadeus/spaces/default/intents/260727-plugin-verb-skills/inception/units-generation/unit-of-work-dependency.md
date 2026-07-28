# Unit Dependencies — 260727-plugin-verb-skills

上流入力(consumes 全数): unit-of-work.md(U1〜U4)、component-dependency.md(コンポーネント依存の導出元)、decisions.md(ADR-1〜3)、requirements.md(FR 対応)、components.md(規模)、component-methods.md(配線点)、services.md(入口契約)

## 依存エッジ(parseBoltDag 用 — per-unit-loop-activation (a))

```yaml
units:
  - name: u1-plugin-handler-skeleton
    depends_on: []
  - name: u2-install-verb
    depends_on: []
  - name: u3-runner-gen-plugin
    depends_on: []
  - name: u4-skill-docs
    depends_on:
      - u1-plugin-handler-skeleton
      - u2-install-verb
      - u3-runner-gen-plugin
```

## 根拠(依存の性質のみ — 実装順・クリティカルパスの裁定は 2.8 Delivery Planning の専管)

- U1/U2/U3 の間に成果物依存はない(エッジなし)。編集面はファイル単位で非交差に近い(U1 = utility.ts+t67 系 / U2 = plugin CLI+projection 文言 / U3 = runner-gen+graph compile+plugin CLI の spawn 配線点)。**注記**: U2 と U3 はともに amadeus-plugin.ts へ触れる(U2 = install 追加、U3 = compose/drop の spawn 1行)— この編集面交差の扱い(直列化するか実 diff で非交差確認するか)は 2.8 が裁定する材料としてここに記録する
- U4 → U1/U2/U3 のエッジは成果物依存(スキル/docs の文言は3系統の入口契約が確定してから固定できる — component-dependency.md の C5 依存)
- walking skeleton の Bolt 割当・ゲート運用は 2.8 で確定する(ideation の intent-backlog に skeleton 候補の記録あり)

## テキストフォールバック

U1・U2・U3 は相互に成果物依存なし。U4 のみが U1〜U3 全部に依存する終端 Unit。
