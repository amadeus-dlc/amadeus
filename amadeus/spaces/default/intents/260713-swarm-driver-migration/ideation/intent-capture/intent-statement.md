# Intent Statement

## Problem Statement

`AMADEUS_USE_SWARM`はbooleanでありながら、実際に選ぶ実行方式がハーネスごとに異なる。Claude CodeではDynamic Workflowの選択として働く一方、Codexでは要求した能力を利用できず`codex exec`方式へdegradeし、Kiroでは有効な選択にならない。このため利用者は、同じ設定値から次のことを予測できない。

- どのdriverが実際に選ばれるか
- 要求したnative multi-agent能力が本当に使われたか
- fallbackが発生したか
- 実行結果を監査証跡から再現できるか

中心課題は、ハーネス固有の能力差そのものではない。利用者の「最良の利用可能方式を使う」「このnative方式を必ず使う」という意図を、決定的かつ監査可能な共通契約で表現できないことである。

## Target Customer

最優先の顧客は、AmadeusをClaude Code、Codex、Kiro等の複数ハーネスで実行する利用者および開発チームである。

利用者は通常時には環境固有の詳細を意識せず最良の方式を使いたい。一方、性能検証、再現性、障害調査、組織ポリシーのために特定driverを指定した場合は、そのdriverが使われたことを保証したい。

第二の受益者は、driverを追加・保守するAmadeusのハーネス開発者である。公開契約が一つに定まることで、ハーネス固有分岐、fallback、監査、ドキュメントを同じ語彙で管理できる。

## Success Metrics

| 指標 | 完了条件 |
|---|---|
| Native capability coverage | Claude CodeのAgent TeamsとUltra Code、CodexのUltraが、代表的なmulti-Unit Constructionで実際に選択・実行され、収束まで検証される |
| Deterministic selection | 同一のハーネス能力・設定・task topologyから常に同じdriverが選択され、選択表の全ケースが自動テストで一致する |
| Explicit-driver guarantee | 明示したdriverが利用不能な全ケースで実行開始前にhard errorとなり、別driverによる成功扱いが0件である |
| Loud fallback | `auto`による全fallbackが利用者表示と監査イベントの両方に残り、silent degradationが0件である |
| Migration safety | 互換期間中の`AMADEUS_USE_SWARM`利用がdeprecationとして明示され、旧・新設定の矛盾は全ケースでエラーになる |
| Harness parity | 正本・配布物・セルフインストール後の各ハーネスで同じ公開driver契約と検証結果が維持される |

実行時間やtoken効率は重要だが、第一の成功指標にはしない。決定性、監査可能性、要求能力の保証を壊さない範囲で評価する。

## Initiative Trigger

大きなIntentを複数Unitとして実行する必要性を[Issue #688](https://github.com/amadeus-dlc/amadeus/issues/688)の検討が表面化させた。同時に、Claude CodeにはAgent TeamsとUltra Code/Dynamic Workflowsが存在し、CodexにもUltraに対応するnative multi-agent能力があるため、booleanによる旧シームでは各ハーネスの本来の能力を表現できなくなった。

[PR #941](https://github.com/amadeus-dlc/amadeus/pull/941)でAmadeus自身の開発用scopeが導入・マージされたため、本変更を自己ホストしたAI-DLCとして設計・実装・検証できる状態になった。

## Initial Scope Signal

- **Workflow scope**: `amadeus`
- **Project type**: Brownfield
- **Depth / test strategy**: Standard / Comprehensive
- **対象信号**:
  - `AMADEUS_SWARM_DRIVER`を利用者向け正本契約として導入する
  - `auto`を既定とし、明示driver指定をoverrideとして扱う
  - Claude CodeのAgent Teams・Ultra Code、CodexのUltraを実利用可能にする
  - 明示指定のhard errorと、`auto`の監査付きfallbackを区別する
  - `AMADEUS_USE_SWARM`を期限付き互換後にbreaking releaseで削除する
  - 監査、移行文書、テスト、配布物の整合性を含める

task topologyに基づき、Claude CodeではUnit間の相互調整が重要な場合にAgent Teams、独立Unitの大量fan-outや反復可能な収束処理にUltra Codeを選ぶ。詳細な判定規則とdriver境界は後続ステージで確定する。

## Evidence and Assumptions

- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams)は独立session、共有task、相互messageを持つ実験機能であり、明示的な有効化を必要とする。
- [Claude Code Dynamic Workflows / Ultracode](https://code.claude.com/docs/en/workflows)は、JavaScript workflowが多数のsubagent、分岐、反復を制御する方式である。
- [OpenAI公式の最新モデル案内](https://developers.openai.com/api/docs/guides/latest-model#what-is-new)は、Codexのultra modeを複数subagentの並列協調に対応するものとして説明している。
- Codex UltraをAmadeusから選択・検証する具体的なprogrammatic surfaceと最低バージョンは、この段階では未確定であり、後続の実現可能性調査で現在のCodex能力と照合する。

