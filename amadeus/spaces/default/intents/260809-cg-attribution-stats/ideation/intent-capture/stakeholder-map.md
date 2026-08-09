# Stakeholder Map — CG 観測可能区間集計

- **Intent**: `260809-cg-attribution-stats`
- **Source**: [Issue #2695](https://github.com/amadeus-dlc/amadeus/issues/2695)
- **Mirror**: [Issue #2722](https://github.com/amadeus-dlc/amadeus/issues/2722)

## Key Stakeholders and Interests

| ステークホルダー | 立場 | 関心・期待 | 必要な証拠 |
|---|---|---|---|
| Intent 所有者／ユーザー | 最終意思決定者 | Issue #2695 の記載範囲を縮小せず、完了条件 1〜10 を本 Intent で満たす | stage ごとの承認対象、Issue 契約とのトレーサビリティ、実行結果 |
| Amadeus 運用・自己開発チーム | 主要顧客 | 重い code-generation 時間のうち、現行 audit が説明できる部分とできない部分を混同しない | coverage、帰属不能率、除外理由、missing instrumentation candidates |
| Framework メンテナー | 実装・保守担当 | 現行 `stage-stats` 契約を退行させず、既存 event から決定的に集計する | 閉じた candidate registry、合成 fixture、後方互換テスト |
| 品質担当／レビュアー | 独立検証者 | 会計恒等式、union、idle subtraction、fail-closed 除外が仕様どおりか | Red／Green の落ちる実証、全 window 不変量、3形式 parity |
| CLI 利用者／下流 automation | 出力 consumer | JSON・CSV・Markdown が途中で切れず、同じ意味を持つ | 65,536 bytes 超の producer／consumer exit、byte digest、JSON parse |
| GitHub Issue ・Project の閲覧者 | 進捗・監査の参照者 | 原 Issue、mirror、Intent record の関係と現状を追跡できる | Issue link、stage artifact、audit trail、PR 検証結果 |

## Decision-Makers vs. Influencers

### Decision-makers

- **Intent 所有者／ユーザー**: スコープ、仕様変更、stage gate、PR マージを最終判断する。
- **Amadeus エンジンが保持する承認ゲート**: Issue 契約、成果物、検証結果が揃うまで後続 stage へ進めない。

### Influencers

- **Amadeus 運用・自己開発チーム**: どの観測ギャップを次に計装すべきかの価値判断に影響する。
- **Framework メンテナー／アーキテクト**: event の実在、identity、stage 属性、終端対応の技術的証拠を提供する。
- **品質担当／独立レビュアー**: 完了条件、境界値、退行の見落としを防ぐ。
- **下流 automation の保守者**: 出力の parseability、安定した exit code、append-only 契約の要求を提供する。

## Communication Requirements

| 場面 | 伝える内容 | チャネル／正本 | タイミング |
|---|---|---|---|
| stage gate | 成果物の要約、Issue #2695 の契約との差分、BLOCKER／FOLLOW-UP、検証結果 | Intent record と Amadeus 承認質問 | 各 stage の完了前 |
| スコープ判断 | Issue 本文の `In`／`Out`、完了条件 1〜10、「縮小しない」裁定 | `intent-statement.md`、`intent-capture-questions.md` | 下流成果物の起草・レビュー時 |
| #2700 依存 | 終了経路欠陥は解決済み、#2695 出力追加後の3形式実サイズ検証は未来の必須責務 | [Issue #2700](https://github.com/amadeus-dlc/amadeus/issues/2700)、[PR #2702](https://github.com/amadeus-dlc/amadeus/pull/2702)、[PR #2706](https://github.com/amadeus-dlc/amadeus/pull/2706)、Intent record | Requirements・Build and Test・PR レビュー時 |
| 出力契約 | category は lifecycle 名のまま表示し、実装／検証時間へ読み替えない。category 比率の合計 100% を要求しない | CLI methodology section、利用者向け文書 | コマンド利用時 |
| 観測ギャップ | 帰属不能率が 50% を超えた事実と、不足境界の候補。観測事実と candidateBoundary 仮説を分離する | `stage-stats` 出力と後続 Issue 候補 | 実 corpus 検証後 |
| 外部変更 | PR の差分、CI、レビュー、マージ待ち状態 | GitHub PR と Intent audit | PR 作成後から収束まで |

## Traceability and Escalation

- 正本の問題・対象範囲・完了条件は Issue #2695 とし、Intent record は実行・承認・検証の正本とする。
- Issue #2695 からの縮小、意味変更、完了条件の延期が必要になった場合は、実装せず Intent 所有者へエスカレーションする。
- 観測できない残余の理由は推定しない。追加計装の境界案は実測事実と分けて後続判断へ回す。
- PR マージは人間の明示承認を必要とする。
