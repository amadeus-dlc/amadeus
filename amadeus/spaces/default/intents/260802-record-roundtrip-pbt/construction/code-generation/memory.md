
## Interpretations
- 2026-08-03T03:02:13Z — Bolt 2/4 の行数超過申告(376 vs 200-280 / 181 vs 60-90)を執行受理: AD/FD の行数は推定であり受け入れ基準ではない(cid:nfr-requirements:estimates-not-acceptance-criteria)。承認済み設計の対象ドメイン・必須規約ヘッダを削る方が実逸脱。deslop 実施済みを確認。
- 2026-08-03T03:02:13Z — Bolt 2 の coverage registry/ratchet 再生成(宣言外書込)と helper export 追加1件(BR-ST-4 検証手段の要求)を機械的必然として受理。ratchet は 162→164 の単調増加のみ。

## Deviations
- 2026-08-03T03:02:13Z — Bolt 4 builder が落ちる実証のベースライン測定で引数なし git stash pop を使用(自己捕捉・実害なし・完全復元実測済み)— cid:requirements-analysis:stash-discipline / cid:code-generation:falling-proof-no-stash の違反実例として PM カウントへ。
- 2026-08-03T05:48:35Z — Bolt 6 の規模超過申告(ci.yml ジョブ 127行 = 実効87行 vs 見積 41〜61)を執行受理: 増分は (a) E-RRP-CG2 の留保が必須とした説明コメント2件 (b) BR-PDC-5/6 の検査ステップで、いずれも削ると裁定・設計の違反になる。Bolt 2/4 と同じ判断(見積は推定であり受け入れ基準ではない — cid:nfr-requirements:estimates-not-acceptance-criteria)。
- 2026-08-03T05:52:38Z — Bolt 5 で base 前進(#2092)が3件の新規キャストを持ち込み初回 CI が赤 → 再接地して**初期台帳を最終 base で採り直し**(33/18→36/19)。ratchet 系ガードの初期 census は「実装時点」でなく「マージ先 base」で採る必要がある(shrink-only は増加を admit できないため、base 前進が構造的に赤を作る)。
- 2026-08-03T05:52:38Z — Bolt 6 で設計指定の実行コマンドがそのままでは赤(t417 の実 FS property が bun test 直接起動の per-test 既定 5000ms を超過)。正準ランナー経由では 30000ms が渡るため通常 tier では顕在化せず、**ランナー非経由の新設ジョブだけが Bun 既定を継承**する構造。選挙 E-RRP-CG2 で --timeout=30000 付与(環境差の吸収)を 2-0 採択。
- 2026-08-03T05:52:38Z — Bolt 5 のレビュー指摘(parseAllowlist が typeof [] === "object" で配列 sites を受理)は、fail-closed のバイパスではなく**「台帳が壊れているのにソース退行と誤報する」反転**だった。旧テストが exit code のみを assert していたため、主張と逆の理由で緑になっていた(検証劇場)。

## Tradeoffs
- 2026-08-03T05:52:38Z — Bolt 2/4/6 の規模超過(376行 vs 200-280 / 181 vs 60-90 / 実効87 vs 41-61)を3件とも執行受理した。削減対象が承認済み設計の対象ドメイン・必須規約ヘッダ・裁定必須コメント・BR 必須ステップであり、削る方が実逸脱になるため。見積は推定であって受け入れ基準ではない。
