# Ideation Decision Log

## Intent Capture

| ID | Decision | Rationale | Source | Status |
|---|---|---|---|---|
| D-01 | `auto`を既定とし、明示driverをoverrideとして提供する | 通常利用の簡潔さと特定native能力の保証を両立する | Intent Capture Q1 | 確定 |
| D-02 | 最優先利用者は複数ハーネスでAmadeusを実行する利用者・チーム | 内部拡張性より利用者可視の予測可能性を優先する | Intent Capture Q2 | 確定 |
| D-03 | 決定的選択、監査可能性、silent degradation防止を最優先する | token効率や拡張容易性は契約を壊さない範囲で扱う | Intent Capture Q3 | 確定 |
| D-04 | Claude Agent Teams、Claude Ultra Code、Codex Ultraの実利用を必須にする | 名前や設定の受理だけでは中心価値を満たさない | Intent Capture Q3追加条件 | 確定 |
| D-05 | `AMADEUS_USE_SWARM`は期限付き互換後にbreaking releaseで削除する | 即時破壊と恒久aliasの両方を避ける | Intent Capture Q4 | 確定 |
| D-06 | 明示driverはhard error、`auto`だけ監査付きfallbackを許可する | 明示要求を別方式で成功扱いしない | Intent Capture Q5 | 確定 |
| D-07 | Claudeの`auto`はtask topologyでAgent Teams / Ultra Codeを選ぶ | 相互調整型と独立並列・反復収束型で得意領域が異なる | Intent Capture Q6 | 確定 |

## Feasibility & Constraints

| ID | Decision | Rationale | Source | Status |
|---|---|---|---|---|
| D-08 | Codex driverの正本はローカル`codex exec` Ultra | Responses API betaではなく既存CLI認証・worktree契約を維持する | Feasibility Q1 | 確定 |
| D-09 | Agent Teamsはnative Team実起動を能力検査で保証する | 通常subagentや疑似Teamへの置換を防ぐ | Feasibility Q2 | 確定 |
| D-10 | `auto`は能力とtask topologyから決定的に選ぶ | 固定優先や個人設定依存による再現性低下を防ぐ | Feasibility Q3 | 確定 |
| D-11 | 公開値は`auto`と4つのハーネス修飾名 | 製品とsurfaceを一意に識別し、明示保証を監査可能にする | Feasibility Q4 | 確定 |
| D-12 | 旧変数は0.1.xで警告付き互換、0.2.0で削除 | 現在の0.1.x利用者に移行期間を与える | Feasibility Q5 | 確定 |
| D-13 | 0.1.xでは旧booleanの現行ハーネス別意味を忠実に再現する | 互換期間中の挙動変更を避ける | Feasibility Q6 | 確定 |
| D-14 | 完了には決定的suiteと4driver各2 Unit以上のlive収束を必須にする | command / env検査とnative実利用証明を両立する | Feasibility Q7 | 確定 |

## Scope Definition

| ID | Decision | Rationale | Source | Status |
|---|---|---|---|---|
| D-15 | selectorはConstructionのmulti-Unit `invoke-swarm`だけを制御する | 通常stage orchestrationへのscope拡大を防ぐ | Scope Q1 | 確定 |
| D-16 | 今回は0.1.x移行bridgeまで実装し、0.2.0削除は後続Issue | 同じ成果物で互換と削除を同時に成立させられない | Scope Q2 | 確定 |
| D-17 | backlog順序はrisk-first | Agent TeamsとCodex Ultraの証跡不成立による手戻りを先に限定する | Scope Q3 | 確定 |
| D-18 | registryは既知の5値に閉じる | Responses API、plugin ABI、cost UIは別問題である | Scope Q4 | 確定 |
| D-19 | 再実行可能なopt-in live suiteを作り、新しいcredentialed CI jobは作らない | 再現性を確保しつつprovider secretと外部障害を通常PR gateへ持ち込まない | Scope Q5 | 確定 |
| D-20 | proto-Unitは検証可能な縦切りとする | 各Unit完了時にdriver選択から収束・監査まで価値を検証する | Scope Q6 | 確定 |

## Approval & Handoff

| ID | Decision | Rationale | Source | Status |
|---|---|---|---|---|
| D-21 | Initiativeは条件付きGOとしてInceptionへ進む | scopeとfeasibilityは成立し、native証跡はRG-01で早期検証できる | Handoff Q1 | 確定 |
| D-22 | RG-01不成立時はscopeへ戻して停止する | 証明不能driverをfloor代替で成功扱いしない | Handoff Q2 | 確定 |
| D-23 | 非機密fixtureに限り現在の認証済みローカルCLIとproviderを利用できる | live証明の資源commitmentを確保し、CI credential追加を避ける | Handoff Q3 | 確定 |
| D-24 | ユーザーがsponsor / decision owner、Amadeus agentsが実行主体 | 追加Team Formationなしでapproval rightsとexecution ownershipを明確にする | Handoff Q4 | 確定 |

## Deferred / Out of Scope

| ID | Deferred Decision | Trigger |
|---|---|---|
| DD-01 | 0.2.0で`AMADEUS_USE_SWARM`と互換処理を完全削除する | PU-05で後続Issueを起票し、0.2.0 releaseを対象にする |
| DD-02 | Responses API Multi-agent driverを提供する | ローカルCLIとは別のAPI / SDK driver要件が承認される |
| DD-03 | custom driver / plugin SDKを提供する | 既知5値で満たせない実需要と互換方針が得られる |
| DD-04 | 通常stageとconductorへselectorを拡張する | Construction swarm以外の独立問題が承認される |
| DD-05 | credentialed live CI matrixを追加する | 組織のsecret、費用、外部provider障害ポリシーが合意される |

## Supersession

矛盾または撤回されたIdeation決定はない。D-12の「0.2.0で削除」はD-16により、今回の実装範囲ではなく後続Issueとして具体化された。D-14のlive証明はD-19とD-23により、再実行可能なopt-in suiteと現在のローカル認証環境で実施する形に具体化された。
