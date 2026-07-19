# Business Logic Model — election-record(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## 記録生成フロー(C3 — FR-5a)

```
renderGoaLine(electionCode, ballots):
  freq = GoA 値ごとの度数(受理済み票のみ、後着は別集計)
  出力 = "GoA[E-<code>]: 1x<n> 2x<n> …"(度数 0 の値は省略 — 既存 team.md 実例の様式)
  制約: norm-metrics.ts parseGoaLine(:688)の round-trip で byte 互換(FR-5a 受け入れ)
renderTimeline(events):
  "配信 <t> → <voter> <t> → … → 開票 <t> → 後着 <voter> <t>" の1行(persist-vote-timeline-field 様式)
renderPersistDraft(election, tally, ballots, timeline):
  裁定文+留保転記(GoA 2/3/6 の留保を全件列挙)+タイムライン行+GoA 行
```

## 照合フロー(C4 — FR-6)

```
verifyReservations(ballots, document):
  必須件数 = |{b : b.goa ∈ {2,3,6}}| ; 転記件数 = document 中の留保記載の機械抽出
  不一致 → fail(件数ペア付き)          # reservation-transcription-count-check の機械化
verifySelf(record):
  票数一致(台帳 vs 実体化)・GoA 度数の再計算一致・タイムライン時刻の単調非減少
verifyDocument(path):
  外部文書へ verifyReservations+GoA 行 parse 検査を適用(CLI 面は U5 が配線)
```

## 自己検査の常時適用(検証劇場の構造回避)

render 系の出力は書き出し前に verifySelf を通す(生成と検証が同一値を共有しない — 検証は票データからの再計算で行い、render 出力の自己参照比較にしない)。

## エラー処理

fallible API(parse 系・verify 系)は Result を返す。render 系は全域関数(入力は検証済み型)。
