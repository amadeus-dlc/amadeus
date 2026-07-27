# Domain Entities — U4 hook-wiring-remaining

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> U2 の HookInvocation(正本 — 逐語継承・改変なし)を残対応面へ展開する型と、非対応面の degrade 契約の型。UI なし(services.md — frontend-components.md 非該当につき不生成)。

## HookWiring(面ごとの配線 — U1 マトリクス駆動)

| フィールド | 型 | 制約 |
|---|---|---|
| harness | 7 値 union(U1 と逐語同一)から claude を除く 6 値 | claude は U2 で配線済み(不変) |
| clazz | ADR-4 正準 literal(`native-manifest \| folder-drop-auto \| manual-only`) | U1 マトリクス確定値の転記 |
| invocation | HookInvocation(U2 正本 — command は `bun <harnessDir>/tools/amadeus-plugin.ts compose --if-stale` verbatim、失敗時 stderr 1 行+セッション継続) | clazz が manual-only の面は invocation なし |
| wiringPoint | 実装位置(各 harness/<name>/hooks/ のアダプタ or 設定ファイル — U1 マトリクスの composeTrigger セルが正) | 未実測面への配線を書かない |

## DegradeContract(非対応面の契約 — DropsRecord へのエントリ源)

| フィールド | 型 | 制約 |
|---|---|---|
| harness | 上記 union | — |
| missing | `"auto-compose-trigger"` ほか非対応 surface の識別子 | — |
| manualPath | 手動 1 コマンド(component-methods.md C1 compose verb)+手順書パス | 全面で必ず成立(手動床) |
| doctorVisibility | DropsRecord entry(severity: "advisory" — 自動 trigger 欠如は機能縮退であって破損ではない) | U5 の doctor 行に必ず出る(silent skip 禁止) |

## 不変条件

- 配線の追加はフックアダプタへの呼び出し 1 点のみ — 合成ロジック・判定をフック側に置かない(U2 BR-U2-1 の面展開)
- **全面が「配線あり XOR DegradeContract あり」のどちらかに必ず落ちる**(manual-only 面と、composeTrigger が deferred の面の両方が DegradeContract 側 — BR-U4-4 の fail-closed 閉包。components.md C4 の「非対応と確定した面は配線せず degrade 契約」の 2 軸精密化)
- DropsRecord の書式は U5 domain-entities が正本(severity 2 値 — 逐語継承)
