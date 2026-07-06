# Requirements Analysis 質問（260705-upstream-sync）

対象 Issue: [#428](https://github.com/amadeus-dlc/amadeus/issues/428)

すべての質問は、leader ディスパッチ（承認者 j5ik2o、2026-07-06 03:51 JST）、Adaptive Workflows 取り込み方針の中継承認（2026-07-06 04:03 JST）、leader 調整指示（2026-07-06 08:31 JST 確認分）の確定判断からの出典付き転記で回答する。新規ピア協議はない。

現行構造の前提は上流入力の [codekb/amadeus/business-overview.md](../../../../codekb/amadeus/business-overview.md)、[codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md)、[codekb/amadeus/code-structure.md](../../../../codekb/amadeus/code-structure.md) に依る（詳細は requirements.md の意図分析を参照）。

---

## Q1. scope は refactor を維持するか？（ディスパッチの変更許可条項）

A. refactor を維持する
B. feature へ変更する
X. Other (please specify)

[Answer]: A（ディスパッチ承認要旨の転記: 「Intake の判定で feature が適切なら理由付きで変更可」に対し、上流同期は既存契約への追従（無改変再コピー + パリティ回復 + 判断記録）であり、新機能の企画・設計を伴わないため refactor を維持。Adaptive Workflows は上流由来の取り込みであって当方の新機能開発ではない。Intent 作成承認の decision に記録済み）

## Q2. 上流 2.2.0 の取り込み範囲は？

A. 全面取り込み（意図的見送りなし）。amadeus 適応は rename + grilling 結線に限定
B. Adaptive Workflows を見送り、ドリフト判断だけ実施
X. Other (please specify)

[Answer]: A（中継承認定型文 2026-07-06 04:03 JST の転記: dist/claude 差分 16 ファイルは実質すべて Adaptive Workflows 1 機能であり、部分見送りは「無改変再コピー + parity バイト一致回復」の承認要旨を達成できない。amadeus-compose は既存 packaging skill 群と同カテゴリに置き、公開入口 1 個の契約を維持。decision 記録済み）

## Q3. composed scope と amadeus-graph compile の grid 衝突への共存規約はどこで確定するか？

A. functional-design（設計ステージ）で確定し、設計 gate で人間が再確認する
B. 本ステージで確定する
X. Other (please specify)

[Answer]: A（中継承認定型文の転記: 「共存規約は設計ステージで確定し、設計 gate で再度人間確認とする」。本ステージでは要求として「共存規約が設計で確定されること」を掲げるに留める）

## Q4. parity 基準の更新方式は？

A. 上流 clone（b67798c3）から generate-parity-baseline.ts で parity-baseline.json を再生成し、baselineCommit を b67798c3 へ更新する。engineFileExceptions は上流取り込みで解除できる例外を解除し、当方 fix が上流未吸収の例外は維持する
B. baseline を手編集する
X. Other (please specify)

[Answer]: A（既存契約の転記: parity-baseline は generate-parity-baseline.ts の生成物であり手編集しない。例外整理はディスパッチ作業指示 5 の転記。engineer3 の #507 5 ファイル追記との整合確認をピア合意済み — 交差ゼロ確認 2026-07-05T23:20Z）

## Q5. codekb/amadeus の衝突（engineer3 の bugfix Intent と同一 7 文書）はどう扱うか？

A. codekb は生成物として「再生成を正とする」規約を適用。先行 merge PR（engineer3 見込み）が現行 main 分の codekb 更新を運び、本 Intent は merge 後に rebase して自分の codekb 変更を落とし、上流 2.2.0 取り込みで新たに必要な分だけ Construction で更新する。record stub 9 件は path 参照のため非破壊で維持
B. 双方の PR で同じ更新を持ち、コンフリクトを都度解消する
X. Other (please specify)

[Answer]: A（leader 調整指示 2026-07-05T23:29:23Z の転記。gate 承認 decision に調整判断として記録済み。内容差 7 点は engineer3 へ送付済み）
