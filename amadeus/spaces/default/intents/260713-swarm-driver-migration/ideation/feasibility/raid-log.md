# RAID ログ

## Risks

| ID | リスク | 確率 | 影響 | 対応・終了条件 | Owner |
|---|---|---|---|---|---|
| R-01 | Agent Teams が `claude -p` では安定して Team を起動できない | 中 | 高 | 最小 live probe で Team 固有証跡を確認する。確認不能ならscopeへ戻して停止し、`claude-agent-teams`を出荷せずfloor代替もしない | Architect / Developer |
| R-02 | Codex Ultra の委譲イベントが CLI 更新で変わり、実利用判定が壊れる | 中 | 高 | capability probe と fixture を CLI 対応表に固定する。認識不能ならscopeへ戻して停止し、成功扱いしない | Architect / Quality |
| R-03 | `auto` が従来より高コストな driver を選び、予期せぬ token 消費を招く | 中 | 中 | 選択 driver と理由を開始前に表示し、明示 driver で固定可能にする。小型 live fixture を使う | Product / Architect |
| R-04 | provider 認証・network・rate limit により live suite が不安定になる | 高 | 中 | 決定的 suite と分離し、再試行上限と失敗分類を設定する。skip を pass に変換しない | Quality / DevSecOps |
| R-05 | 正本、ハーネス展開先、`dist` の driver 契約が drift する | 中 | 高 | 既存の package / drift guard に新ファイルと契約表を含める | Developer / Quality |
| R-06 | native driver が Unit の worktree 境界を破り、競合や保護 spec 改変を起こす | 低 | 高 | 全 driver を prepare / check / finalize の外側境界に閉じ、Unit ごとの cwd と保護ファイルを検証する | Architect / Quality |

## Assumptions

| ID | 仮定 | 検証方法 | 破れた場合 |
|---|---|---|---|
| A-01 | 対象環境には認証済みの Claude Code、Codex、Kiro CLI がある | doctor と live suite の preflight | 該当 driver を unavailable とし、明示指定は hard error |
| A-02 | Unit 定義から「相互調整型」と「独立並列・反復収束型」を決定的に分類できる | Units Generation の実例に選択表を適用 | `auto` の分類を縮小し、曖昧ケースを既定規則へ寄せる |
| A-03 | 非機密fixtureに限り、現在の認証済みCLIからproviderを利用できる | Approval & Handoff Q3でdecision ownerが確認済み。live suiteで接続を実証する | 認証・networkが利用不能ならlive suiteを停止し、Intent完了を保留する |
| A-04 | 0.2.0 を breaking release として旧変数を削除できる | release plan の承認 | 削除 release を再決定し、互換表を更新する |
| A-05 | token 効率より native capability の保証を優先できる | Intent Statement と完了 gate で確認 | live fixture と並列度を再設計するが、silent degradation は許可しない |

## Issues

| ID | 現在の問題 | 影響 | 解消条件 |
|---|---|---|---|
| I-01 | `AMADEUS_SWARM_DRIVER` と共通 selector がまだ存在しない | driver 選択がハーネスの skill prose に分散している | 共通契約と選択結果を全ハーネスが利用する |
| I-02 | Codex の現在の個人設定は `model_reasoning_effort = "xhigh"` | 既定設定の継承だけでは Ultra にならない | `codex-ultra` が局所的に `ultra` を指定し、実委譲を確認する |
| I-03 | `AMADEUS_USE_SWARM=1` は Codex / Kiro で要求能力を表せない | 同じ値から実 driver を予測できない | 新 selector、hard error、loud fallback、移行警告を実装する |
| I-04 | 4 driver の live 収束証跡がまだない | Intent の完了条件を満たしていない | 各 driver で2 Unit以上の fixture を収束させる |

## Dependencies

| ID | 依存先 | 必要条件 | 確認時点 |
|---|---|---|---|
| D-01 | Claude Code CLI | Agent Teams flag、Ultra Code effort、非対話実行、Team / Workflow 証跡 | capability preflight と live suite |
| D-02 | Codex CLI と対象 model | `ultra` effort、subagent 委譲、機械可読 event、非対話実行 | capability preflight と live suite |
| D-03 | Kiro CLI | subagent DAG、非対話 trust、最大並列度の公開契約 | capability preflight と live suite |
| D-04 | Amadeus swarm referee | Unit worktree の prepare、収束 check、直列 finalize、監査 | integration test と live suite |
| D-05 | framework package / distribution pipeline | 正本から Claude、Codex、Kiro、`dist` への再現可能な展開 | package / drift test |
| D-06 | 認証済み非機密テスト環境 | 現在のローカルCLI利用はdecision owner承認済み。provider credential、outbound network、token予算、小型fixtureをlive実行で確認する | Intent 完了前 |
