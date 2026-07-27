# Code Summary — fix-1498-envelope-lf

上流入力(consumes 全数): requirements.md(FR-1〜FR-4/NFR-1〜3)。degrade 構成につき設計系成果物は非生成(plan 参照)。

- Issue: #1498(P1/S2)→ **CLOSED**(PR #1537 スカッシュ着地、ユーザー承認マージ)
- FR-1: `findLineEnd()` 導入で parseHttpEnvelope を CRLF/bare-LF 両対応(意味論不変、「互換シムでなく実出力への回復」を doc コメント明記)
- FR-2(裁定 Q1=A): `findArgv(repo, page)` — `--paginate --slurp` 廃止、`-f page=N` の1ページずつ取得。不変条件は「1リクエスト=1ブロック+1ページ配列」(pageCount≠1 で fail-closed)へ等価変換
- FR-3: t272 fixture 正本を実 gh 2.96.0 バイト列へ(採取コマンド記録)。落ちる実証 = CRLF 専用への退行注入で 9 fail
- ページング終端(実装時実測、requirements Open question の解消): gh は最終ページで Link rel=next 消失・超過ページで `[]`。採用は**ページ空判定の既存慣行**(`elements.length < FIND_PER_PAGE`)— Link ヘッダ露出は FR-1 意味論不変に反するため不採用。上限カウンタは置かず終端保証を置換前と同じサーバ応答依存に揃えた(builder 申告済みのレビュー観点)
- 検証: regression-first(fixture 先行で修正前 10 fail)、typecheck/lint/complexity/dist:check/promote:self:check/フルスイート(573 files/8032 assertions/0 failed)全 exit 0、lcov 追加75行 UNCOVERED 0、CI 15 job 全 pass
- 増幅: 変更15ファイル = 14 パス(正本1+self-install5+dist7+テスト1)+ allowlist。gateway ピン5件を照合更新(447-448→484-485 / 602→639 / 615-620→652-657 / 702→738 / 716→752)。model-map ピンなし(grep 0)
