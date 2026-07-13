# 実現可能性評価

## 結論

本 Intent は**条件付きで実現可能**である。Claude Code、Codex、Kiro はそれぞれ対象となるネイティブな複数エージェント実行面を現在のローカル CLI で公開しており、Amadeus の既存の別プロセス実行、Unit ごとの worktree、収束レフェリーを維持したまま driver 選択契約を追加できる。

ただし、環境変数やコマンドの受理だけではネイティブ機能の利用を証明できない。次の2条件を満たすまで、Intent 全体を完了扱いにしてはならない。

- 明示 driver は実行開始前に能力検査し、要求した実行面を確認できない場合は代替せず hard error にする。
- 4 driver すべてで2 Unit以上を実際に起動し、ネイティブ委譲の証跡と Amadeus の収束結果を取得する。

## 入力と評価範囲

- `intent-statement` は [`../intent-capture/intent-statement.md`](../intent-capture/intent-statement.md) を正本とし、driver の決定性、明示指定の保証、loud fallback、移行安全性、ハーネス間の同一契約を評価対象とした。
- `competitive-analysis`、`market-trends`、`build-vs-buy` は、今回の `amadeus` scope で `market-research` が SKIP のため生成されていない。外部製品の比較購入ではなく、既存ハーネス能力の統合変更として評価した。
- アプリケーションコードやデータプレーンは追加しない。対象はローカル CLI の能力検査、driver 選択、別プロセス実行、監査、互換処理、配布物、テストである。
- 固定の予算・納期は提示されていない。Intent Statement の方針どおり、token 効率より決定性・監査可能性・要求能力の保証を優先する。

## 能力調査

| Driver | 確認済みの実行面 | 主な制約 | 評価 |
|---|---|---|---|
| `claude-agent-teams` | ローカル Claude Code 2.1.205。`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` で有効化する Agent Teams | 実験的機能。team のネスト不可、in-process teammate の再開不可。`claude -p` での Team 実起動は live 証明が必要 | 条件付きで実現可能 |
| `claude-ultracode` | `claude -p --effort ultracode`。ローカル 2.1.205 は `--effort ultracode` の要件 2.1.203 以上を満たす | 非対話実行では途中のユーザー入力を受けない。workflow の実起動証跡が必要 | 実現可能 |
| `codex-ultra` | ローカル Codex CLI 0.144.0。`gpt-5.6-sol` の `ultra` が利用可能で、`codex exec` の設定 override を doctor と prompt-input で受理することを確認 | 現在の個人設定は `xhigh` であり `ultra` ではない。driver が明示的に `ultra` を設定し、実委譲イベントを検証する必要がある | 実現可能 |
| `kiro-subagent` | ローカル Kiro CLI 2.12.1。非対話 chat と subagent fan-out / DAG を提供 | 最大4 subagent。非対話実行で承認が必要になると fail-fast するため、信頼設定の事前検査が必要 | 実現可能 |

公式根拠は [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams)、[Claude Code Dynamic Workflows / Ultra Code](https://code.claude.com/docs/en/workflows)、[Codex Models](https://learn.chatgpt.com/docs/models)、[Codex Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)、[Kiro CLI Subagents](https://kiro.dev/docs/cli/chat/subagents/) である。Responses API Multi-agent はベータの別サーフェスであり、ローカル CLI の認証・設定契約を維持するため本 Intent の対象外とする。

## 確定した driver 契約

公開変数は `AMADEUS_SWARM_DRIVER`、既定値は `auto` とする。公開値は `auto`、`claude-agent-teams`、`claude-ultracode`、`codex-ultra`、`kiro-subagent` とする。

| 要求種別 | 選択規則 | 利用不能時 |
|---|---|---|
| 明示 driver | 指定されたハーネス修飾 driver だけを選択 | 実行開始前に hard error。別 driver への置換は禁止 |
| `auto` | ハーネス能力と task topology から決定的に選択 | loud fallback を利用者表示と監査の両方へ記録 |
| Claude の相互調整型 topology | Unit 間の共有 task、直接連携、相互調整が必要なら Agent Teams | Agent Teams が利用不能なら Ultra Code への fallback を記録 |
| Claude の独立並列・反復収束型 topology | Ultra Code | floor への fallback が必要なら理由を記録 |
| Codex | Codex Ultra | 利用可能な既存 exec-worker floor への fallback を記録 |
| Kiro | Kiro subagent | 利用可能な並列度へ縮退した理由を記録 |

同じ入力から同じ driver を得るため、選択入力は要求値、検出ハーネス、能力検査結果、task topology に限定する。モデルの自由判断だけで driver を切り替えてはならない。

## 移行の実現可能性

`AMADEUS_USE_SWARM` は 0.1.x でのみ警告付き互換を維持し、0.2.0 で削除する。互換期間では次の規則を適用する。

- 旧変数が明示されている場合は、`1` とそれ以外を含め現行のハーネス別挙動を忠実に再現する。
- 旧変数を受理した全ケースで deprecation warning と監査記録を残す。
- 旧変数と新変数の同時指定は、優先順位を推測せず設定競合として error にする。
- 旧変数が未設定の場合だけ、新しい既定値 `auto` を使う。

互換処理は 0.1.x に閉じるため、恒久的な二重 selector にはならない。0.2.0 では旧分岐、警告、互換テストを同時に削除できる。

## AWS・運用・コンプライアンス観点

- 新しい AWS service、account、network boundary は不要であり、AWS landscape への依存はない。CI で live test を実行する場合だけ、既存の secret 管理と outbound network policy の対象になる。
- subprocess は利用者が選択した provider の認証・モデル設定を継承する。Amadeus は API key、session token、provider credential を新たに保存しない。
- 監査には要求 driver、選択 driver、能力検査結果、fallback 理由、CLI / model 識別子、batch / Unit、収束結果を残す。prompt 本文、credential、秘密値、provider の生レスポンスは保存しない。
- live test は実 provider へコード断片を送る可能性があるため、専用の非機密 fixture を使う。組織の provider 利用ポリシーに反する環境では、明示的に未実施として扱い、成功へ読み替えない。
- Agent Teams と Responses Multi-agent の実験的・ベータな surface は変更され得るため、version 固定だけでなく振る舞いの能力検査を正本とする。

## 検証戦略

1. driver 選択表、旧変数移行、設定競合、明示指定 hard error、`auto` fallback、監査 payload を決定的な unit / integration test で網羅する。
2. subprocess 境界で command、environment、working directory、stdin、model / effort、trust 設定を検証する。
3. 非機密の2 Unit以上の fixture を用い、4 driver それぞれで実起動、Unit 完了、レフェリーの check / finalize、監査証跡を確認する。
4. 正本 `packages/framework`、各ハーネスの展開先、`dist`、self-install 後の生成物に drift がないことを既存の生成・同期検査で確認する。

live test は認証・network・provider 可用性に依存するため通常の決定的テストとは分離できるが、Intent 完了判定からは除外できない。

## 判定

実装へ進める技術的根拠は揃っている。最大の不確実性は、Agent Teams の非対話 Team 起動と Codex Ultra の実委譲を安定して検出する証跡であり、これは設計段階で capability contract を定義し、Construction の live 収束で解消する。証跡が得られない driver は名前だけの対応として出荷せず、未完了または hard error とする。
