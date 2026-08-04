# Delivery Planning Questions

- **Mode:** Grilling
- **Depth:** Standard
- **Question budget:** 最大8問（主質問・確認・合意確認を含む）
- **Question policy:** Issueに明記済みの方針は問い直さず、Issue未記載の矛盾・抜け漏れだけを質問する。
- **leader 承認:** 2026-08-03T11:36:38Z（共有理解の確認、audit seq 1146）

## Q1. Walking Skeletonの範囲

#2067はWalking Skeletonのgateが自律mode規則に従うことを定める一方、どのUnitをWalking Skeletonにするかは定めていない。また、team規範のWalking Skeletonには別Intentの`auto` mirror createを対象とする記述が残り、今回へそのまま適用できない。最初のBoltをどの範囲にするか。

- A. U1 `loop-monitor-runtime`をWalking Skeletonにする（推奨）: manifest→production engine→audit/status/replay→5 harness contract/liveまでを最小end-to-endで実証し、#2095→#2096→#2067の依存順と小さい承認境界を守る。完全自律のmode/grantはU3以降で検証する。
- B. U1〜U3を1つのWalking Skeleton Boltへ束ねる: `full`のmode/grantと品質修復まで最初に実証できるが、#2095/#2096の独立検証境界と小さいBoltを失う。
- C. U1〜U5を1つのWalking Skeleton Boltへ束ねる: Intent終端まで一度に実証するが、5 Unit分割と段階的な欠陥局所化を実質無効にする。
- X. その他（具体的に指定）

[Answer]: A — U1 `loop-monitor-runtime`をWalking Skeletonにする。manifestからproduction engine、audit/status/replay、5 harness contract/liveまでを最小end-to-endで実証し、#2095→#2096→#2067の依存順を維持する。

## Q2. 5 harness live receiptのhard gate位置

#2067と`requirements.md`はIntent完了時に同一implementation revision / package digestへ束縛した5 harness成功receiptを要求する。一方、U1とU2もbehavior固有のopt-in live受け入れ条件を持ち、後続Boltは同じowner moduleを変更するため、中間revisionのreceiptは最終完了証拠として再利用できない。各Boltと終端でliveをどう扱うか。

- A. 中間Boltは決定論的contractをhard gateとし、利用可能ならbehavior固有liveを暫定実測する。U5で最終revisionの全5 harness liveを再実行し、そのreceiptだけをIntent終端のhard gateにする（推奨）: 小さいBoltの検証を保ちつつ、credential不在で中間進行を止めない。U5で収集不能なら`AWAITING_HUMAN`へparkする。
- B. U1以降の各Boltを毎回5 harness成功receiptでhard gateする: 早期の実環境確信は強いが、同じliveを各revisionで反復し、credential不在が#2095→#2096→#2067の進行を止める。
- C. U1〜U4ではliveを一切実行せず、U5だけで初めて全liveを実行する: 反復は最小だが、各Unitの独立live検証と早期のadapter欠陥検出を弱める。
- X. その他（具体的に指定）

[Answer]: A — 中間Boltは決定論的contractをhard gateとし、利用可能ならbehavior固有liveを暫定実測する。U5で最終revisionの全5 harness liveを再実行し、その成功receiptだけをIntent終端のhard gateにする。収集不能なら`AWAITING_HUMAN`へparkする。

## 合意内容の確認

| 項目 | 合意・導出内容 |
|---|---|
| Walking Skeleton | U1 `loop-monitor-runtime`。Coreから5 harness liveまでの最小end-to-endを実証する |
| Bolt粒度 | 5 vertical Unitを1 Unit = 1 Boltとして扱う |
| Bolt順 | U1→U2→U3→U4→U5。#2095→#2096→#2067とUnit DAGを維持する |
| 並行性 | dependency-free pairがなくowner moduleも重なるため、5 Boltを直列実行する |
| 経済的順序 | 架空のWSJF値を作らず、blocker解消とrisk-firstを明示理由にする |
| Live hard gate | 中間Boltはcontract必須・live暫定実測、U5で最終revisionの5 harness成功receiptを必須化する |
| 外部能力待ち | credential不足なら中間検証を継続し、U5終端で`AWAITING_HUMAN`へparkする |
| 担当 | Team FormationはSKIPのため、全Boltを`amadeus-developer-agent`が担当する |
| Core境界 | PR/merge、外部runner/supervisor、Kiro live、#2065外部形式をBolt完了条件へ入れない |
| Functional Designへ持越し | U5→U1 live authorization利用経路とJudge providerの物理的exactly-once保証範囲を閉じる |

上記をDelivery Planningの正本として成果物を生成してよいか。

- A. Yes, confirmed（推奨）: 上記の共有理解で成果物生成へ進む
- B. I want to revise: 修正対象を指定し、回答と要約を更新する
- X. その他（具体的に指定）

[Answer]: A — Yes, confirmed。上記の共有理解でDelivery Planning成果物を生成する。
