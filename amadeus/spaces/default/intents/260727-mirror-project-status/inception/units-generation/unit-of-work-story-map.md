# Unit of Work Story Map — Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): components, component-methods, services, component-dependency, decisions, requirements

user-stories ステージは本スコープでスキップのため、requirements の FR 群と intent の価値ストリーム(運用者ジャーニー)を Unit へ写像する簡易ストーリーマップとする(存在しない stories 成果物は捏造しない)。ジャーニーの体験記述は components の UI/UX 面(config 記述・ask 文言・診断出力・docs の4接点)と component-methods の診断出力型(availableOptions 等)、services の認証・障害時挙動、decisions ADR-1〜5 の裁定、component-dependency の対称性表に依拠する。

## 運用者ジャーニー × Unit

| ジャーニー(運用者の体験) | 価値 | 担う Unit |
|---|---|---|
| intent を開始すると mirror Issue が Project ボードに現れ、Status が `Ideation` になっている | 手動でカードを作らない・動かさない | U1 |
| GitHub 側の一時障害があっても、次の節目でボードが正しい状態に追いつく | 収束の信頼(drift 0 の頑健化) | U2 |
| フェーズが進むたびにボードの列が `Inception`→`Construction`→`Operation` へ動き、完了時だけ `Done` になり Issue が閉じる。park してもボードは動かない | ボード = ライフサイクルの真実 | U3 |
| 自チームの Project の列名が違っても設定で写像でき、ズレは repair status で一目で分かる | 実環境適応と診断可能性 | U4 |
| 配布先の別チームでも、ドキュメントを読めば同じ運用を再現できる | 自走可能な配布 | U5 |

## 受入条件 → Unit の全数写像(機械照合用)

| 受入条件(scope-document In Scope #) | Unit |
|---|---|
| 1(no-op 不変)、2(冪等追加+即 Status)、13(削除・アーカイブ禁止)、14(daemon 等不要)、18(追加) | U1 |
| 6(複数 Project)、11(pending 冪等収束) | U2 |
| 10(safety-blocked+close 阻止) | U1(検出)+U2(収束)+U3(close 阻止) |
| 3, 4, 5(フェーズ遷移)、7(final sync→Done→close)、8(parked 維持) | U3 |
| 9(上書き設定)、12(repair status) | U4 |
| 15(認証ドキュメント)、16(テスト完備)、17(dist 再生成) | U5(検収 — テスト作成自体は各 Unit 並行) |
