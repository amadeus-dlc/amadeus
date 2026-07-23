# §13 学習候補 — requirements-analysis(260723-fixture-shard-pollution)

提出: conductor e4、2026-07-23T03:07Z 頃。leader の採否選挙用 verbatim 正本。

## 候補(surface 4件): c3 のみ採用提案+3件不採用

| # | source | 要旨 | 提案 | 理由 |
|---|---|---|---|---|
| c1 | Interpretations | 裁定転記の件数照合+per-voter 逐語照合の自己適用(leader 指名外の e1 留保も分母照合で転記) | 不採用 | E-TPRRAS13 追補+reservation-transcription-count-check の機械的執行 |
| c2 | Interpretations | questions への実参照上流入力行の追記→再発火 PASSED | 不採用 | artifact-upstream-inputs-header(装飾トークン禁止)の執行 |
| c3 | Deviations | **t211 の短形引用が5ファイルに曖昧で reviewer が誤照合 → 偽 Major 1件+イテレーション1回消費** | **採用** | 新規性あり: **テスト引用は tNNN 短形でなくフルパス(+可能ならシンボル)で書く** — 同一テスト番号の複数ファイル共存は実在する生態(本件 t211 = 5ファイル実測、cid:swarm-test-number-reservation の t250 重複採番の既測とも同族)で、短形引用は「実在する別ファイル」へ誤解決されるため mechanism-cite-verify-at-draft(実在確認)では防げない — 引用の実在と一意性は別の検査面。統合先案: cid:requirements-analysis:mechanism-cite-verify-at-draft への追補 |
| c4 | Deviations | E-MPRRAS13 scratch 併書配送の適用(2 iteration 決定的回収)+complete-review 様式の機構実測変換 | 不採用 | 着地直後ノルムの運用実例(初回)— PM 実例回付 |

parked open questions: 0 件。
