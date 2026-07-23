# Requirements Analysis 質問票 — doctor-inprocess-seam

> 対象: [Issue #857](https://github.com/amadeus-dlc/amadeus/issues/857)
>
> 上流入力: `business-overview.md`、`architecture.md`、`code-structure.md`
>
> 深度: Minimal。Reverse Engineering で、既存の in-process monkeypatch テストは
> 6ファイル104ケース・LCOV 437/771行まで進展している一方、正式な戻り値 seam、
> cwd・stage graph・cache 依存の注入境界が未確立であることを確認した。
>
> ユーザー承認: 2026-07-23T03:51:40Z — Q1〜Q3 の回答サマリーを確認し、
> 「A. この内容で正しい」を選択。

## Q1. 今回の refactor の完了範囲をどこに置くか

Issue 起票時の「doctor 全行が spawn 経由で未計測」という前提は現状では一部解消済みです。
残る目的は、doctor を変更するたびに process・env の monkeypatch や coverage waiver に
依存しない、正式な in-process seam を設けることです。

- A. **正式な in-process seam と、その成立に必要な最小限の依存注入まで**。doctor の各 check は原則として現状の本体に残し、全面分割は行わない（推奨）
- B. A に加え、主要な check 群を複数の内部関数へ分割する
- C. 各 check を独立モジュールへ分割し、doctor 全体を全面的に再構成する
- D. 本番コードは変更せず、既存 `handleDoctor` の monkeypatch テストだけを拡充する
- X. Other (please specify)

[Answer]: A — 正式な in-process seam と、その成立に必要な最小限の依存注入まで。doctor の各 check は原則として現状の本体に残し、全面分割は行わない。

## Q2. in-process seam の結果・副作用契約をどうするか

外部 CLI 契約として stdout と終了コード 0/1 は維持します。未決なのは、
core を直接呼ぶテストが何を正式に観測できるようにするかです。

- A. **終了コード・整形済み出力・check 結果を含む構造化結果を返す**。観測性は最大だが、今回のための型と変換が増える
- B. 終了コードだけを返し、出力は注入した writer で観測する。変更量は最小だが、テストは writer spy を必要とする
- C. **終了コードと整形済み出力を返し、薄い CLI wrapper が出力・終了を担当する**。check 内部モデルは増やさず、process monkeypatch を外せる（推奨）
- D. 戻り値は設けず、`exit` と writer の両方を依存注入する
- X. Other (please specify)

[Answer]: C — core は終了コードと整形済み出力を返し、薄い CLI wrapper が stdout とプロセス終了を担当する。check 内部モデルは今回追加しない。

## Q3. テストとカバレッジ上の完了条件をどう置くか

現行 CI は patch coverage 100% を要求します。既存 spawn テストは CLI・cwd・配布物の
契約確認として価値がある一方、Bun の子プロセス内部は親 LCOV に反映されません。

- A. **既存 spawn 契約テストを維持し、新規・変更 doctor 経路は in-process テストで駆動して patch coverage 100% を満たす**。doctor 全771行の一括100%化は要求しない（推奨）
- B. spawn テストを in-process テストへ置き換え、子プロセス契約テストは削除する
- C. spawn テストを維持し、doctor 全771行の line coverage 100% を今回の完了条件にする
- D. in-process smoke test の追加だけを要求し、patch coverage は必要に応じて waiver する
- X. Other (please specify)

[Answer]: A — 既存 spawn 契約テストを維持し、新規・変更 doctor 経路は in-process テストで駆動して patch coverage 100% を満たす。doctor 全771行の一括100%化は要求しない。

## 回答内容の最終確認

- Q1: 正式な in-process seam と、その成立に必要な最小限の依存注入までを今回の範囲とする
- Q2: core は終了コードと整形済み出力を返し、薄い CLI wrapper が stdout とプロセス終了を担当する
- Q3: spawn 契約テストを維持し、変更経路を in-process テストで駆動して patch coverage 100% を満たす

- A. この内容で正しい
- B. 回答を変更したい
- X. Other (please specify)

[Answer]: A — この内容で正しい。要件成果物の生成へ進む。

## 学びの追加確認

Requirements Analysis の `memory.md` から永続化候補は検出されなかった。
今後の実行へ残したい追加の学びがあるか。

- A. 追加なし
- X. Other (please specify)

[Answer]: A — 追加なし。
