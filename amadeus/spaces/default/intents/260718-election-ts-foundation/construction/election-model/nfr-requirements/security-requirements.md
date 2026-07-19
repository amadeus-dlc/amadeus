# Security Requirements — election-model(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md

## 入力検証(fail-closed)

- 境界検証は `Ballot.parse` / `Election.parse` に集約: 不正票5クラス(unknown-election/unknown-voter/goa-out-of-range/reservation-missing/parse-failure)を fail-closed で拒否し、拒否理由を型で返す(business-logic-model.md 票検証フロー、business-rules.md BR-3)
- 数値は parse してから比較(requirements.md FR-4 受け入れの verification-numeric-parse — "five" 等の型不正は例外でなく型エラー)
- 二重票拒否の所有は C2 Store(BR-4 — U1 は AmendBallot/BallotRef 型の提供のみ)

## 秘匿情報と blind 性

- 認証情報・API キー・シークレットを扱わない(ADR-1 Security 節: gh 非依存・repo 外書込なし。票は開票後公開前提のチーム内データ)
- blind 性は型で保証: DistributionView は推奨・先行票・他者状況のフィールドを持たない(business-rules.md BR-2 の構造的 blind — フィールド不在の compile 検査)
- 認証・認可レイヤは導入しない(チームローカルツール — W-04 配布外。投票者正当性は voters 集合照合 = unknown-voter 拒否で担保)
