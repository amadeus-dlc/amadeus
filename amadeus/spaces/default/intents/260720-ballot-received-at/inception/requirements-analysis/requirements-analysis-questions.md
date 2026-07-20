# Requirements Analysis Questions — 260720-ballot-received-at

> **E-OC1 判定ヘッダ**: Q1〜Q3 は未決の設計判断につき**エージェント選挙で裁定**する(leader ディスパッチ 00:08:44Z「修正方式は requirements で選挙依頼、単独決定禁止」)。[Answer] は裁定受領後にのみ記入。選挙不要判定の質問なし。
> 選挙依頼送信: leader へ 2026-07-20T00:24Z 頃(agmsg)。選挙: E-BRARA1〜3(/amadeus-election CLI、blind 配布 00:25:03Z → 開票 00:33:48Z、各 3-0 採用)。裁定通知受領: 2026-07-20T00:34:13Z(agmsg)。record: leader ブランチ `128882771` の elections/E-BRARA{1,2,3}/record.md(e1 直接実読 — 留保3件全文確認: Q1×1 / Q2×1 / Q3×1)。

上流入力(consumes 全数): business-overview.md(N/A — 根拠は requirements.md 冒頭注記)、architecture.md、code-structure.md(実参照は requirements.md §2)

## Q1. 時刻軸の修正方式(#1262 の核心)

背景(RE 実測、re-scans/260720-ballot-received-at.md): timeline の ballot/late イベントだけが `at: ballot.submittedAt`(store.ts:156/:166)で、distributed(election.ts:304)/tallied(store.ts:228)は機械時刻 — 非対称。verifySelf(record.ts:179-183)の隣接 at 単調検査が中継遅延票の混在で構造的に fail(E-BFARA1 実測: 受理順 [e1@22:10:03, e4@22:10:42, e3@22:10:29])。

選択肢:
A. **TimelineEvent に受理時刻フィールドを追加し、単調性検査を受理時刻軸へ移行**。ballot イベントの `at` は申告値(submittedAt)のまま表示用に保存(Issue 記載案。timelineSegment 描画・U2/U3 canonical 型への波及あり)
B. ballot/late イベントの `at` の意味を受理時刻へ変更(申告値は ballot 側にのみ残る — フィールド追加なしで非対称を解消、既存 timeline の at 値と意味が変わる破壊的変更)
C. 単調性検査(timeline-order)を撤廃(検査価値の喪失 — 非推奨として提示)
X. Other (please specify)

[Answer]: A — E-BRARA1 裁定(2026-07-20 開票 00:33:48Z、3-0 採用、GoA 1x2 2x1)。receivedAt フィールド追加+単調性検査を受理軸へ、at は申告値のまま表示用保存。留保転記(e3, GoA2): 『受理時刻フィールドの追加は canonical 1定義(TimelineEvent — E-ETF-BT で canonical lift 済み)への追加1点から導出し、描画側は単調性検査と遅延可視化に必要な面のみ更新する(不要な renderer への一律表示展開はしない — 波及最小化)』。

## Q2. classifyLate の時刻軸

背景: classifyLate(model.ts:296-297)は `ballot.submittedAt <= tallyTime` で late を判定 — 中継遅延票は「申告は tally 前・受理は tally 後」がありうる。e2 の per-voter 最新解決(E-BFARA2)は submittedAt 軸を使う(交差)。

選択肢:
A. **受理時刻軸へ移行**(late = 「受理が tally 後」— 遅延の実態と一致。e2 の最新解決は submittedAt 軸のままで独立)
B. submittedAt 軸を維持(現状固定 t234:207-220 不変 — 中継遅延票が「late でないのに tally 後に受理」される穴は注記のみ)
X. Other (please specify)

[Answer]: A — E-BRARA2 裁定(2026-07-20 開票 00:33:48Z、3-0 採用、GoA 1x2 2x1)。classifyLate も受理軸へ。留保転記(e4, GoA2): 『store.ts:146-150 の null-fallback(state 到着で classifyLate が null でも late 扱いする既存分岐)は受理軸移行後に意味が変わる: 受理が tally 後なら受理軸 classifyLate は常に late を返し fallback が死码化しうる。design で机上トレースし、死码化する場合はコメント化でなく削除まで含めて裁定すること(消費されない分岐の残置は検証劇場 Forbidden の隣接クラス)』。

## Q3. 既存 timeline(旧様式 record)の互換

背景: 受理時刻フィールドの導入後、既存選挙 store の timeline は新フィールドを持たない。construction ガードレールは要求なき互換シムを禁止(導入するなら NFR 根拠必須)。

選択肢:
A. **遡及なし** — 既存 record は完了済み監査記録として再検証対象外(verify は新規選挙にのみ新軸を適用。読み側 fallback シムは書かない — 既存 timeline を verify し直す運用が存在しないことを根拠に NFR で明文化)
B. 読み側 fallback(受理時刻欠落時は従来 at 軸で検査 — 互換シム。NFR 根拠の明文化必須)
C. 既存 timeline の一括再生成(ledger から機械再構成 — 過去 record の書き換えを伴う)
X. Other (please specify)

[Answer]: A — E-BRARA3 裁定(2026-07-20 開票 00:33:48Z、3-0 採用、GoA 1x2 2x1)。遡及なし・シムなし・NFR 明文化。留保転記(e4, GoA2): 『移行窓(修正着地前に open し着地後に verify へ到達する in-flight 選挙)の扱いを design で明示し、transient-state-fixtures 準拠の fixture を置くこと — 「新規選挙にのみ新軸適用」の判別(受理時刻フィールドの有無等)は事実上1点の読み分岐であり、その1点に限り NFR 根拠を明文化する(それ以上の fallback シムは書かない)』。
