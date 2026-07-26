# Reliability Design — U2 visualize-hardening

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## 設計

- U2-REL-01(サイズ超過 fail-closed)の実現: 生成バイト列確定 → サイズ判定 → (write: 書込 / check: 比較)の順序。超過時はどちらのモードも副作用ゼロで exit 1(business-logic-model.md 増分3)
- U2-REL-02(--check 3値契約)の実現: 一致0/不一致1/不在1 の分岐を main 内の単一判定に集約し、integration の落ちる実証3本で固定(performance-design.md の同一生成パス前提)
- U2-REL-03(CI loud-fail)の実現: ステップに continue-on-error を書かない(不在が正 — diff レビュー+security-design.md U2-SEC-02 の観点で担保)
- U2-REL-04(着地検証)の実現: Bolt 2 完了条件チェックリストに「マージ後 main push run の job green」「bot PR diff に metrics/index.html」の2実測を明記(business-logic-model.md 増分4 の閉包。scalability-requirements.md の上限内で生成されたファイルであること = サイズガード green も同 run で確認)

## 非対象

- 通知・自動ロールバック(reliability-requirements.md 非対象。tech-stack-decisions.md の既存 CI 経路のみ)
