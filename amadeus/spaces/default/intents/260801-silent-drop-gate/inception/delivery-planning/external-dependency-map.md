# External Dependency Map — no-silent-drop

## 上流入力と判定

本mapは `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`、承認済み `delivery-planning-questions.md` を入力とする。新規 external API、data availability window、external team hand-off、credential、AWS resource、database、常駐serviceは0件である。

ast-grepはrepository-local dependencyとしてlockfileに固定し、GitHub Actions／Git objectは既存repository delivery environmentであるため、外部組織依存として扱わない。

## External dependency inventory

| Dependency | Owner | Lead time | Blocking Bolt | Mitigation |
|---|---|---:|---|---|
| なし | — | 0 | — | — |

## Internal gated items

| Gate item | Owner | 必要時点 | Blocks | Release condition | Mitigation／fallback |
|---|---|---|---|---|---|
| U1 walking-skeleton approval | 人間 | Bolt 1完了時 | Batch 2 | Pass／Violation／Error demoとdesign／code gate承認 | Request ChangesでBolt 1だけ改訂 |
| Construction autonomy ladder | 人間 | Bolt 1 gate直後 | Batch 2 | autonomous／gatedを選択 | 未選択ならengineが停止 |
| classification ledger | U4＋人間reviewer | Bolt 4 evidence承認前 | approved evidence | raw identity全件にTP／FPと根拠 | 不足identityを補完し再検証 |
| approval receipt | 人間 | Bolt 4 baseline候補前 | `approve-evidence` | classification digest一致 | receipt再発行、旧receipt拒否 |
| PR base／push-before SHA | U4 CI wiring | Bolt 4 check時 | trusted-base ratchet | SHAがGit objectとして解決可能 | 欠落／不正はfail-closed |
| Bolt 1／2／3 landing revision | 各Bolt owner＋人間 | Bolt 4開始前 | U4 | 各変更がmainへ承認済みで着地 | 未着地Unitを開始条件から外さない |
| CI blocking step | U4 | Bolt 4完了前 | stage completion | lint jobでexit 0／1／2をblocking消費 | warning／continue-on-error禁止 |
| package／promotion drift | U4 | Bolt 4完了前 | distribution handoff | 両drift guardがexit 0 | canonical sourceから再生成 |
| phase approval | 人間 | Delivery Planning gate | Construction開始 | 4成果物＋phase check承認 | Request Changesで計画改訂 |

## Lead-time and ownership conclusion

外部待ち時間は0である。内部gated itemはすべて同一repository／同一workflow内にowner、入力、解除条件を持ち、未達時はfail-closedまたは人間待ちになる。silent skip、期限切れを成功扱いするfallback、外部資格情報による迂回はない。

## Bolt impact summary

- Bolt 1 はrepository-local tool availabilityと人間walking-skeleton gateだけに依存する。
- Bolt 2／3 はBolt 1 gate後のladder decisionに依存するが、互いには依存しない。
- Bolt 4 は3 Boltの着地revision、classification／approval、base SHA、既存CI environmentを消費する。
- Operation phaseはscope上SKIPであり、deployment hand-offは発生しない。
