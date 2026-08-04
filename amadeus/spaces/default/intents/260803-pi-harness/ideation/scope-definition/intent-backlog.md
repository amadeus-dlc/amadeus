# Intent Backlog — 260803-pi-harness

## 上流入力と優先原則

上流の`intent-statement`を価値根拠とする。`feasibility-assessment`と`constraint-register`は本workflowでskipされ未生成のため、そこから未確認の制約やGO判定を補完しない。

全項目をMoSCoWで分類し、Must内はwalking-skeleton-first + risk-first + dependency-firstで並べる。WSJFの精密な数値は見積もり証拠がないため捏造せず、遅延コスト、リスク低減、依存解除をHigh/Medium/Lowで相対評価する。

## 優先度付きproto-Units

| 順位 | ID | proto-Unit | MoSCoW | 遅延コスト | リスク低減・依存解除 | 依存 |
|---|---|---|---|---|---|---|
| 1 | P1 | Pi manifest・skill・extensionのwalking skeleton | Must | High | High: 全後続の実行面を開く | なし |
| 2 | P2 | session/input/agent-settledの監査・継続adapter | Must | High | High: 最大の未知であるevent変換とstop loopを証明 | P1 |
| 3 | P3 | human gate・question rendering・presence mint | Must | High | High: 無人ゲート通過を防ぎ正式workflowの安全性を成立 | P2 |
| 4 | P4 | 全lifecycle/tool/compaction event adapterとfixture契約テスト | Must | High | High: adapter完全性と回帰可能性を確立 | P2-P3 |
| 5 | P5 | Pi専用doctor | Must | Medium | Medium: adapter・trust・版不整合を早期診断 | P1-P4 |
| 6 | P6 | support/reviewer subagent driver | Must | High | High: role付き子Pi実行の基本契約を証明 | P2-P4 |
| 7 | P7 | Construction swarm driver・resolve・失敗伝播 | Must | High | High: 正式なConstruction parityを成立 | P6 |
| 8 | P8 | setup CLI `--harness pi`・冪等導入 | Must | High | Medium: 既存Amadeus配布経路を開く | P1-P7 |
| 9 | P9 | Pi Package manifest・local/git install | Must | High | Medium: Piネイティブ配布経路を開く | P1-P7 |
| 10 | P10 | 二重経路parity・`dist/pi`・promote-self・CI drift guard | Must | High | High: 配布の単一正本と再現性を保証 | P8-P9 |
| 11 | P11 | TUI dogfood | Must | High | High: 公開契約を実機で縦断確認 | P5-P10 |
| 12 | P12 | `pi -p`またはRPC live driver/journey | Must | Medium | High: 継続的な実機回帰経路を確立 | P10-P11 |
| 13 | P13 | 利用者・保守者文書 | Must | Medium | Medium: 導入・診断・保守を再現可能にする | P5-P12 |
| 14 | P14 | 0.83.0未満の互換性調査 | Could | Low | Low: 対象利用者を広げる可能性 | P4-P12 |
| 15 | P15 | 公開npm registryへのリリース | Won't | Medium | Low: release-ready後の外部手続き | P9-P13、別承認 |
| 16 | P16 | Agent Core単体SDK統合 | Won't | Low | Low: 別顧客・別API | 独立intent |

## Walking Skeleton受け入れ条件

最初の縦断SliceはP1〜P3の最小構成とし、次を同時に証明する。

1. Piがproject-localのAmadeus skillとextensionをtrust境界内で読み込む
2. `/skill:amadeus`からBun製エンジンを起動する
3. `input`からHUMAN_TURNを監査へ記録する
4. human gateをユーザー回答なしに越えない
5. `agent_settled`後に、必要な場合だけengine-owned continuationを行う
6. session終了時に監査と状態が矛盾しない

このSliceが成立しない限り、subagentや配布の横展開へ進まない。

## 依存グループ

| Group | 含むproto-Units | 完了が解除する後続 |
|---|---|---|
| G1 Harness Core | P1-P4 | doctor、subagent、installer、実機検証 |
| G2 Operability | P5 | dogfood、利用者文書 |
| G3 Multi-agent | P6-P7 | 正式Construction parity、配布完結 |
| G4 Distribution | P8-P10 | dogfood、live journey、release-ready判定 |
| G5 Evidence | P11-P13 | 正式対応の表明、通常リリースへのhandoff |

## バリューストリームと成果仮説

1. **P1-P4 — 実行可能性**: Piの公開eventだけでAmadeusの監査・ゲート・継続契約を表現できる
2. **P5-P7 — 運用可能性**: 不備をdoctorで説明でき、単体agentだけでなくsupport/reviewer/swarmまで安全に実行できる
3. **P8-P10 — 入手可能性**: Amadeus標準とPi標準のどちらから導入しても同一生成物になる
4. **P11-P12 — 実証可能性**: 手動dogfoodと自動live journeyの両方で公開契約を再確認できる
5. **P13 — 維持可能性**: 利用者と保守者が実測済み手順で導入・診断・更新できる

## Deferred Backlog

- Pi 0.83.0未満への対応は、event適合fixtureとlive journeyが同じ契約でgreenになる版だけを候補にする
- npm実公開はrelease-ready成果物を通常のリリース承認へ渡す
- Agent Core単体SDK、Pi一般機能、provider/model連携は、それぞれ独立した顧客価値と受け入れ条件を持つ別intentにする

## Scope変更ルール

- Mustの削除、Won'tの取り込み、最低対応版の変更、npm実公開の追加はプロジェクトオーナーの再承認を要する
- Pi実測で公開eventが不足すると判明した場合は、非公開APIへの依存を追加せず、代替設計またはscope変更を提示する
- 実装中に見つかった既存ハーネスの無関係な改善はこのbacklogへ混在させず、別intentへ送る
