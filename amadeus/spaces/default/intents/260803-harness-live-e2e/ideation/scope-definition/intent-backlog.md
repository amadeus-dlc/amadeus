上流入力（consumes 全数）: intent-statement, feasibility-assessment, constraint-register

# Intent Backlog — ハーネス横断 live E2E

Intent: `260803-harness-live-e2e`  
入力正本: [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717)

## 優先順位付け方針

`intent-statement`とScope Definition回答に従い、**dependency-first + risk-first**で並べる。全proto-UnitはMoSCoWのMustである。`feasibility-assessment`と`constraint-register`は前段スキップにより存在しないため、未知のCLI capabilityは実測で解消し、実装不能時は証拠付き後続Issueへ接続する。

横断的な「テスト後付けUnit」は作らない。各proto-Unitは、contract test、違反注入、fake integration、必要な最小live journeyを同じ縦スライスの完了条件に含める。

## 優先度付きproto-Units

| 順位 | proto-Unit | 主な価値 | 依存 | 完了の決定的アンカー |
|---|---|---|---|---|
| 1 | U1 共通contract + Codex walking skeleton | 全live pathの安全不変量を単一seamで実証する | なし | policy unit test、偽Codex integration、違反注入、既存Codexテスト、workspace保持 |
| 2 | U2 Claude Code headless vertical slice | 新seamが別ハーネスで再利用できることを最短で証明する | U1 | `claude -p`、`--setting-sources project`、`dist/claude`、no-state status、認証非コピー |
| 3 | U3 Claude Code SDK/TUI adoption | 既存live pathもGHA deny・opt-in・skip reasonの適用母集団へ入れる | U1、U2 | SDK/TUIの共通policy接続、または面ごとの根拠付き後続Issueリンク |
| 4 | U4 Kimi Code print vertical slice | credential symlinkと設定homeを含む異なる認証境界でcontractを実証する | U1 | adapter contract、fake integration、`kimi -p` opt-in live journey、child env漏洩なし |
| 5 | U5 Kiro CLI/IDE adoption | ACP/TUI/GUIのtransport差を保ったまま安全契約を適用する | U1 | ACP/TUI/GUI各面の接続、または面ごとの根拠付き後続Issueリンク |
| 6 | U6 Cursor/OpenCode capability closure | 未知の非対話・設定隔離能力を実測し「要調査」を解消する | U1 | version/helpと実機ログ、adapter/live journey、または阻害要因・seam・AC付き後続Issue |
| 7 | U7 capability matrix + run ledger + docs | live journeyが回されず腐ることを防ぎ、Intent完了を証明する | U2〜U6 | 全面の状態、最終live green SHA、実行日時/SHA/adapter、完了前実行規範 |

## proto-Unit別受け入れ条件

### U1 共通contract + Codex walking skeleton

- 小さな共通interfaceとCodex adapterへ責務を分離し、巨大な条件分岐helperを作らない。
- opt-in、GHA deny、canonical skip reason、preflight、scratch/cleanup/debug保持、env隔離を共通policy/lifecycleとして固定する。
- skip/timeout/実失敗、timeout予算、決定的アンカー、リトライ上限、直列実行をcontractで表現する。
- GHA+opt-in、opt-in欠落、sensitive key漏洩の違反注入が赤になる。
- Codexの既存live E2Eと認証隔離が維持される。

### U2 Claude Code headless vertical slice

- Intent実装時点のClaude CLI version/helpを再取得し、flag意味論を固定する。
- `--bare`は使わず、`--setting-sources project`でユーザー設定とhooksを隔離する。
- scratch projectへ`dist/claude`を配置し、認証情報をコピーせずに利用する。
- 短いno-state status journeyを、exit codeと構造/状態アンカーで判定する。

### U3〜U6 transport別adoption

- 既存transportは役割を維持したまま共通policyへ接続する。
- 接続不能時の後続Issueは、実測結果、阻害要因、推奨seam、受け入れ条件を必須とする。
- matrix記録や「要調査」だけで完了しない。
- adapter実装時はfake executable/distによるintegration testと、該当する最小live journeyを持つ。

### U7 capability matrix + run ledger + docs

- 全`harness × transport`について、接続状態、認証/設定境界、決定的アンカー、最終live green SHAを記録する。
- ハーネス配布面、driver、installerを変更したIntentは完了前に該当live journeyをローカルで1回実行する規範を明記する。
- 台帳は少なくとも実行日時、対象SHA、adapter、結果を記録する。
- opt-in変数、skip code、認証前提、直列実行、timeout/リトライ方針を利用者向け文書に反映する。

## バリューストリーム

1. **安全に選択する** — 保守者が明示opt-inし、共通gateがCI hard denyとpreflightを評価する（U1）。
2. **隔離して準備する** — adapterが認証・設定境界を宣言し、共通lifecycleがscratch projectとchild envを構築する（U1〜U6）。
3. **実CLIで検証する** — transport固有adapterが短いjourneyを直列実行し、決定的アンカーで判定する（U2〜U6）。
4. **正しく分類する** — skip、timeout、実失敗を機械判別し、cleanupまたは明示的debug保持を行う（U1〜U6）。
5. **証拠を残す** — capability matrixと台帳へSHA・adapter・結果を残し、次の配布面変更時の実行契機にする（U7）。

## Sequencingと分割方針

- U1→U2を最初のwalking skeletonとし、共通seamが二つのハーネスで成立するまで後続adapterを広げない。
- U3〜U5はU1安定後に独立した縦スライスとして進められるが、同一ファイルへの競合とlive実行の並列化を避ける。
- U6は実機capability確認を先に行い、推測に基づく抽象化を作らない。
- U7のschemaと配置は設計段階で決め、最終値は各Unit完了時に逐次追記する。
- PRはUnitまたは凝集した小規模スライス単位に分割できるが、Intent完了にはU1〜U7の完了が必要である。

## 見積もりとリスクのメモ

- 最大リスクは、既存SDK/TUI/ACP/GUIのopt-in挙動と共通GHA denyの整合、およびCursor/OpenCodeの非対話能力の未知である。
- Claude Codeの`AMADEUS_TUI_LIVE`自動設定と明示opt-in契約は、U3で実行入口を棚卸しして裁定する。
- 課金・rate limitリスクは、短いjourney、直列実行、既定リトライ0回で抑える。
- 外部期限はないため、scope圧縮よりも安全契約と証拠の完全性を優先する。
