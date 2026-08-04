上流入力（consumes 全数）: intent-statement, feasibility-assessment, constraint-register

# Scope Document — ハーネス横断 live E2E

Intent: `260803-harness-live-e2e`  
入力正本: [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717)

## 目的と境界の根拠

`intent-statement` が定義した成功条件に基づき、実ハーネスCLI・実モデルを使うlive E2Eの安全契約をハーネス横断で揃える。共通化対象はpolicy/lifecycleであり、起動コマンド、transport、認証方式、設定隔離、出力形式、終了条件は`harness × transport`単位のadapterに残す。

このIntentでは`feasibility-assessment`と`constraint-register`を生成する前段ステージがスキップされているため、両成果物は存在しない。したがって、検証済みのIssue #1717、`intent-statement`、Scope Definitionのユーザー回答を境界の正本とする。

## In Scope — Must

| ID | 能力 | 完了境界 |
|---|---|---|
| M1 | 共通policy/lifecycle contract | 明示opt-in、GitHub Actions hard deny、canonical skip reason、preflight、scratch lifecycle、cleanup/debug保持、child env隔離、timeout、赤の3分類、決定的アンカー、リトライ、直列実行を単一契約として定義する |
| M2 | 共通contractの落ちる実証 | policy unit testとfake executable/distによるadapter integration testを追加し、CI deny・opt-in gate・sensitive key漏洩の違反注入が実際に赤くなることを確認する |
| M3 | Codex + Claude Code headless | Codexの既存live E2E・認証隔離・workspace保持を維持し、`claude -p`と`--setting-sources project`を使う短いno-state status journeyを追加する |
| M4 | Claude Code既存transport | Agent SDKとtmux TUIを共通policyへ接続する。接続不能な面は阻害要因・推奨seam・受け入れ条件を持つ後続Issueへ接続する |
| M5 | Kimi Code + Kiro系 | Kimi print、Kiro CLI ACP/TUI、Kiro IDE GUIを共通policyへ接続する。接続不能な面にはM4と同じ根拠付き後続Issueの完了条件を適用する |
| M6 | Cursor + OpenCode capability spike | 非対話実行、project-local設定、ユーザー設定隔離、認証、終了条件、packaging conformanceを実機確認し、adapter/live journeyを追加するか、実測証拠付き後続Issueへ接続する |
| M7 | 運用サイクルと可視化 | 全`harness × transport`のcapability matrix、最終live green SHA、実行日時・SHA・adapterの台帳、配布面変更Intentの完了前実行規範を文書化する |

M1〜M7はすべてMustである。ただしM4〜M6の各対象は「本Intentで接続・実装」または「証拠と受け入れ条件を備えた後続Issueへ接続」の二択で完了できる。「要調査」やmatrixへの記録だけでは完了としない。

## In Scope — Could

- 各adapterの最小journeyを超える追加journey。
- 短いlive実行の範囲内での補助的な診断表示。
- capability matrixから導ける保守者向け補足ガイド。

CouldはMustの安全契約、決定的テスト、最小live journeyを遅らせない場合に限る。

## Out of Scope — Won't

| ID | 除外項目 | 理由 |
|---|---|---|
| W1 | Agent SDK、headless CLI、TUI、ACP、GUIのtransport統一 | ハーネス固有能力をadapter境界に残す設計方針に反する |
| W2 | 全ハーネスを一つのPRで一括移行 | 検証可能な縦スライスと段階的ロールアウトを損なう |
| W3 | capability不足を隠すための共通contract弱体化 | 安全不変量と失敗分類がハーネスごとに分裂する |
| W4 | 通常のGitHub Actionsでlive processを起動 | live E2Eは課金・認証を伴うローカルopt-in専用である |
| W5 | モデル出力の完全一致 | 非決定性が高く、exit code・構造化出力・ファイル/状態をアンカーとする |
| W6 | `swarm-driver-migration` Intentの再開・変更 | Issue #1717の問題境界外である |
| W7 | 全OS・全CLI version組み合わせの網羅 | 最小対応versionと実測versionを記録し、組合せ爆発を避ける |

## 段階完了条件

### Phase 1 — 共通seam、Codex、Claude Code

- M1とM2のcontractを先に固定し、Codex adapterで既存挙動の回帰がない。
- `dist/claude`をscratch projectへ配置し、ユーザー設定・hooksを読まず、認証情報をコピーしない`claude -p` journeyがgreenになる。
- Claude Code SDK/TUIの各面がM4の二択を満たす。

### Phase 2 — Kimi Code、Kiro系

- Kimi print driverの認証・設定・child env境界をadapter contractで固定し、opt-in live journeyがgreenになる。
- Kiro CLI ACP/TUI、Kiro IDE GUIの各面がM5の二択を満たす。

### Phase 3 — Cursor、OpenCode、Intent完結

- Cursor/OpenCodeの実測結果が再現可能な証拠として残り、各面がM6の二択を満たす。
- M7のcapability matrixと台帳に最終結果とlive green SHAが記録される。

## 品質・安全境界

- opt-inがなくても、または`GITHUB_ACTIONS=true`でも、ハーネスprocessを起動しない。
- adapterはsensitive env keyとsource auth/config pathを宣言し、共通層がchild environmentへの漏洩を検査する。
- skip、timeout、実失敗を機械判別でき、assertionの実文を保全する。
- journeyごとのtimeoutはBun既定値や内部待機予算と衝突させず、性能契約として扱わない。
- リトライは既定0回、負荷起因と確認した場合のみ上限1回とする。
- live journeyは直列、短時間、1〜数プロンプトとし、課金実行を明示opt-inの内側に限定する。

## スコープ対タイムライン検証

ユーザー回答により外部の特定日期限はない。Phase 1→2→3の依存関係を維持し、安全契約のリスクを先に解消する。M4〜M6で後続Issueへの接続を許容するため、未知のCLI capabilityを推測で実装する必要はない一方、根拠のない先送りは認めない。範囲、優先順位、期限制約の間に矛盾はない。
