# Stakeholder Map

## Stakeholder Overview

| ステークホルダー | 区分 | 主な関心 | 主な懸念 |
|---|---|---|---|
| Amadeus利用者・開発チーム | Primary customer | 最良driverの自動選択、明示指定の保証、予測可能な結果 | silent fallback、ハーネスごとの意味の違い、設定負荷 |
| Intent owner / product decision-maker | Decision-maker | 必須native能力、互換性、成功条件の承認 | 要求能力が名目対応に留まること |
| Amadeus maintainers | Decision-maker / builder | 安定した公開契約、保守可能なdriver境界、release管理 | boolean互換負債、分岐増加、配布物drift |
| Harness integration maintainers | Builder / influencer | Claude Code、Codex、Kiro固有能力への正確な接続 | vendor仕様変更、能力検出の誤判定 |
| Quality / CI / release maintainers | Gatekeeper | 再現可能なE2E証跡、監査整合性、breaking change管理 | 偽緑、未検証のfallback、移行漏れ |
| Anthropic / OpenAI等のharness provider | External dependency | native能力、設定、バージョンの提供 | experimental機能や公開surfaceの変更 |
| Amadeus contributors | Influencer / consumer | driver追加手順、テスト方法、明確な用語 | 複数箇所への暗黙分岐の再発 |

## Decision Rights

### Final decision-makers

- **Intent owner**: 利用者向け挙動、必須native能力、deprecation方針、fallback方針、受け入れ可否を決定する。
- **Amadeus maintainers**: 公開契約を満たす実装境界、リリース時期、breaking releaseへの組み込みを決定する。

### Implementers and gatekeepers

- **Harness integration maintainers**: 各native能力の検出、起動、収束、停止、失敗処理を実装・維持する。
- **Quality / CI / release maintainers**: 代表的なmulti-Unit E2E、配布物同期、移行互換性、監査イベントを検証し、未達時にリリースを止める。

### Influencers

- **Harness providers**: 公開ドキュメント、feature flag、CLI/tool surface、バージョン互換性によって実現可能なdriver境界を規定する。
- **Contributors**: 新driver追加時の使い勝手と保守性についてfeedbackを提供する。

## Interests by Outcome

| Outcome | Primary beneficiary | Required evidence |
|---|---|---|
| `auto`で最良driverを選択 | Amadeus利用者 | 能力・topology別の選択表と自動テスト |
| 明示native driverの保証 | 利用者、Intent owner | 実driver識別子を含むE2E実行・監査証跡 |
| fallbackの可視化 | 利用者、運用・監査担当 | user-facing messageと監査イベントの一致 |
| 段階的移行 | 既存利用者、release maintainer | deprecation表示、競合エラー、削除時期の記録 |
| driver追加容易性 | Harness maintainers、contributors | 単一契約、追加手順、contract test |
| 配布後の同一挙動 | 全利用者 | 正本・dist・self-installのdrift検査 |

## Communication Requirements

- 新driver契約、選択可能な値、`auto`の判断原則、利用不能時の挙動を一つのcapability matrixで公開する。
- `AMADEUS_USE_SWARM`利用時は、互換期間、変換先、削除予定のbreaking releaseをruntimeと文書の両方で通知する。
- 明示driverが利用不能な場合は、必要なversion、feature enablement、利用可能な代替をエラーに含める。ただし自動fallbackは行わない。
- `auto`でfallbackした場合は、requested/selected/fallback reasonを利用者表示と監査で同じ語彙にする。
- Claude Code Agent Teams・Ultra Code、Codex Ultraの対応状況を「実験的」「利用可能」「利用不能」「degraded」のような検証可能な状態で示す。
- breaking change前にmigration guideと代表的な設定例を公開し、release noteから到達可能にする。

## Engagement Cadence

| タイミング | 対象 | 内容 |
|---|---|---|
| Ideation / Inception gate | Intent owner、maintainers | 公開契約、scope、要件、driver分類の承認 |
| Constructionのwalking skeleton | Intent owner、harness maintainers | 一つのnative driverによるend-to-end証明 |
| 各native driver収束時 | Quality、harness maintainers | 実行証跡、fallbackなし、保護spec維持の確認 |
| Release前 | 利用者、release maintainer | capability matrix、移行手順、既知制約 |
| Breaking release前 | 旧フラグ利用者 | 削除予告、移行期限、互換性終了の通知 |

