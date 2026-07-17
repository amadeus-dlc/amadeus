# Stakeholder Map

## Stakeholder Overview

| ステークホルダー | 区分 | 主な関心 | 主な懸念 |
|---|---|---|---|
| Claude／Codex で Amadeus を実行する利用者 | Primary customer | 設定値から実行方式を予測できること、同一セッション内での並列実行、明示的な失敗・降格 | silent fallback、ハーネス間の意味のずれ、別プロセス worker の残存 |
| Intent owner | Final decision-maker | 三モード契約、軽量な変更規模、実測に基づく受け入れ | 旧 Intent と同じ過大化、名目だけの native 対応 |
| Amadeus maintainers | Decision-maker / builder | 小さく追跡可能な conductor 変更、語彙の一貫性、既存レフェリーの保護 | 分岐や写像層の増加、adapter の未配線、回帰 |
| Claude／Codex harness maintainers | Builder / influencer | 各ハーネスのセッション内能力への正確な接続、必要バージョンの明示 | 能力の誤認、実測不足、provider surface の変更 |
| Quality・CI maintainers | Gatekeeper | 選択表の網羅、実行証跡、fail-closed と loud-degrade の検証 | 偽緑、監査漏れ、別プロセス起動の見逃し |
| Documentation・release maintainers | Gatekeeper / communicator | breaking change と新しい値の明確な案内、配布物の整合 | 旧値 `1` の案内残り、Codex floor の古い説明 |
| Upstream sync maintainers | Influencer | fork 独自の選択面をレフェリー外へ限定すること | upstream 同期面への不要な侵入 |
| Anthropic・OpenAI の harness provider | External dependency | native subagent、Workflow、reasoning effort の実行面を提供 | CLI・tool・hook 仕様や利用条件の変更 |

## Decision Rights

### Final decision-makers

- **Intent owner**: 三モードの意味、Codex 通常経路の置換、失敗・降格方針、変更規模、最終的な受け入れ可否を決定する。
- **Amadeus maintainers**: 承認済み契約を満たす最小の変更境界、既存レフェリーの保護方法、リリースへの組み込み可否を決定する。

### Implementers and gatekeepers

- **Harness maintainers**: Claude と Codex の session 内 fan-out、強化モード、能力の実測方法を実装・維持する。
- **Quality・CI maintainers**: 三モードとハーネスの組み合わせ、旧値・未知値、降格、監査、別プロセス非起動を検証し、未達時に進行を止める。
- **Documentation・release maintainers**: 旧値 `1` の削除、新しい値、Codex floor の変更、必要条件を文書と配布物へ反映する。

### Influencers

- **Harness providers**: 公開された tool、subagent、hook、reasoning effort の仕様によって、実測可能な能力境界を規定する。
- **Upstream sync maintainers**: fork 独自面が upstream のレフェリー設計を汚染しないかを確認する。
- **Contributors**: 設定、エラー、監査、テストの理解しやすさについて feedback を提供する。

## Interests by Outcome

| Outcome | Primary beneficiary | Required evidence |
|---|---|---|
| 三モードから決定的に選択される | 利用者、maintainers | ハーネス別の選択表と全ケースの自動テスト |
| Claude／Codex の通常経路が同型になる | 利用者、harness maintainers | 同一セッション内 fan-out の実行証跡と別プロセス非起動の確認 |
| `codex-ultra` が実能力に基づく | Codex 利用者、Intent owner | 並列 spawn、結果回収、effort 指定の個別実測 |
| 不正値が開始前に止まる | 利用者、quality maintainers | `1` と未知値の fail-closed テスト |
| 他ハーネス専用値の降格が見える | 利用者、監査担当 | 利用者表示と `SWARM_DEGRADED` 監査の一致 |
| 語彙が一対一になる | maintainers、contributors | 環境変数・型・監査値の一致と写像層がないことのレビュー |
| 変更規模が軽量に保たれる | Intent owner、reviewers | Unit ごとの概算行数レンジと承認ゲートでの規模評価 |
| レフェリーの意味論が変わらない | maintainers、upstream sync maintainers | `prepare`、`check`、`finalize` の回帰テスト |

## Communication Requirements

- `unset`、`claude-ultra`、`codex-ultra` の意味をハーネス別の一つの表で示し、環境変数・コード型・監査で同じ語彙を使う。
- 旧値 `1` は互換シムなしで削除されること、未知値として dispatch 前に失敗することを migration note と runtime error の双方で通知する。
- 他ハーネス専用値では、要求値、実行ハーネス、降格先、理由を利用者表示と `SWARM_DEGRADED` 監査へ同じ意味で残す。
- Codex floor の説明から headless `codex exec` worker を除き、session 内 native subagent fan-out と、その成立を確認した実測条件を示す。
- Units Generation の各 Unit に概算行数レンジを併記し、数値上限ではなく変更の凝集性と必要性を承認判断の根拠にする。
- Codex の実測が一部でも成立しない場合は、代替実装を既定扱いせず、未達の能力と影響を Intent owner へ差し戻す。

## Engagement Cadence

| タイミング | 対象 | 内容 |
|---|---|---|
| Ideation gate | Intent owner、maintainers | 問題、三モードの成果、軽量スコープの承認 |
| Feasibility | Harness maintainers、quality maintainers | Codex の spawn・回収・effort 指定の実測と制約確認 |
| Scope Definition | Intent owner、maintainers | 対象・対象外、規模評価方法、完結した着地条件の確定 |
| Units Generation | Intent owner、reviewers | Unit ごとの概算行数レンジと過大化の有無を審査 |
| Construction | Harness・quality maintainers | 選択表、実行証跡、監査、レフェリー回帰の継続確認 |
| Release 前 | 利用者、documentation・release maintainers | breaking change、新値、必要条件、既知制約の案内 |
