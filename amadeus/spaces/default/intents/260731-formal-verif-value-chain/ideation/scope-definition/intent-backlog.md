# Intent Backlog — formal-verif-value-chain

上流入力(consumes 全数): intent-statement

intent-statement の Success Metrics を proto-Unit へ分解し、MoSCoW と依存で優先順位付けする(scope-document の WS 分類に対応)。順序選好は Q1 裁定の dependency+risk-first。

## Proto-Units(MoSCoW)

| # | Proto-Unit | WS | MoSCoW | 依存 | 概要 |
|---|---|---|---|---|---|
| P1 | runner 移設+stage 参照書き換え | WS-A | Must | — | 16 ファイルを plugins/formal-model-check/tools/ へ。walking-skeleton 候補 |
| P2 | CI 付け替え+残骸削除 | WS-A | Must | P1 | ci.yml の消費経路更新、実験遺物・テスト・台帳エントリの整理 |
| P3 | plugin 境界ガード | WS-A | Must | P1 | 配布 plugin の repo-only パス参照で赤。落ちる実証必須 |
| P4 | composition 多ハーネス化 | WS-B | Must | P1(dist 面が交差) | 他ハーネスツリーへの compose |
| P5 | advisory チャネル強化+発火点前倒し | WS-B | Must | — | stderr 1行脱却、チェックポイント1・2の新設 |
| P6 | モデル工程(追従+供給)の定義 | WS-C | Must | P1 | model-map/ドリフト検出を是正へ繋ぐ工程 |
| P7 | mirror lifecycle 新規モデル | WS-C | Must | P6 | .tla+.cfg+model-map エントリ。#1816/#1607/#1838 を invariant 候補に |
| P8 | updateModelMap --impl-only+案内 | WS-D | Must | P1 | 宣言要求+監査行、SOURCE_DRIFT メッセージ更新 |
| P9 | e2e 受け入れ実測 | 受入 | Must | P4,P5,P7 | audit イベント実測、チェックポイント両貫通、検証結果到達 |

Should/Could は置かない — 6 proto-capability 全 Must の先例(260722-tla-plugin scope-definition:c2)に倣い、Won't は scope-document に明記済み(#1543/#1735/#1838 修正/telemetry 等)。

## Value Stream Map(テキスト)

spec 変更(並行プロトコル)→ チェックポイント発火(P5)→ モデル照合(P6/P7)→ 矛盾検出 → 上流是正(要件/設計)→ 実装 → CI 二層検証(P2)→ 配布(P1/P3/P4)→ 配布先で自立実行。運用ループ: 実装のみ変更 → SOURCE_DRIFT → --impl-only 正規復旧(P8)。

<!-- Text fallback: 上記は左から右へ流れる価値ストリームの線形表現。分岐は運用ループのみ -->
