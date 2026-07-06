# Requirements Analysis 質問（260706-doctor-guidance）

対象 Issue: [#573](https://github.com/amadeus-dlc/amadeus/issues/573)

回答は Issue の確定記載、leader ディスパッチ（2026-07-06 17:20 JST）、および再現実測・現行実装の実測（requirements.md 該当節）からの出典付き転記である。新規の人間質問はない。

本質問の判断は次の上流成果物（consumes）に依る。

- [codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md) — doctor（amadeus-utility --doctor）のエンジン層内の位置づけと hooks の fail-open 設計（Q2 の advisory pass 先例の根拠）。
- [codekb/amadeus/api-documentation.md](../../../../codekb/amadeus/api-documentation.md) — utility verb 面と exit code 契約（Q2 の exit 0 化の影響範囲判断）。
- [codekb/amadeus/code-quality-assessment.md](../../../../codekb/amadeus/code-quality-assessment.md) — 隔離 workspace + 実 CLI 駆動の eval 規約（Q4 の eval 置き場と実 birth 採用の根拠）。

---

## Q1. 実施候補の選択は？

A. 候補 3 = 1 + 2 併用（doctor の誘導修正 + installer smoke の info 化）
B. 候補 1 のみ（doctor 文言変更）
C. 候補 2 のみ（installer 側の許容）
X. Other (please specify)

[Answer]: A（ディスパッチ承認要旨の転記。「実施候補 3 = 1+2 併用を基本線とし、実装形は設計で確定」）

## Q2. doctor 側の実装形は？

A. shell 検査を 2 状態に分離 — エンジン dir 不在 = fail（fix は installer 再実行の実行可能誘導）、memory 未 seed = pass with advisory label（hook heartbeats の fresh-install 先例と同型）。導入直後は exit 0 になる
B. fail のまま fix 文言だけ変更（installer は doctor 出力を parse して shell fail だけ許容）
X. Other (please specify)

[Answer]: A（B は installer が doctor の出力文字列に依存する脆い結合を生む。A は doctor 自身の既存 3 状態設計（hook heartbeats）の先例に揃い、exit code 契約（fail>0 → 1）を変えずに導入直後 exit 0 を実現する）

## Q3. installer smoke の info 表示の実装形は？

A. smoke pass 時に doctor 出力へ advisory marker が含まれる場合だけ info 1 行を表示（「workspace shell は初回の /amadeus workflow で seed される」）
B. info 表示なし（doctor の advisory 表示に任せ、installer は従来の pass 表示のみ）
X. Other (please specify)

[Answer]: A（ディスパッチの (2)「fail → info」の転記。smoke pass 時は doctor 出力を破棄する現行実装のままだと advisory が利用者に見えないため、info 1 行で可視化する）

## Q4. eval の置き場は？

A. installer eval（dev-scripts/evals/installer/check.ts）へ一連（導入 → doctor → birth → doctor）を追加
B. 新規 eval を新設
X. Other (please specify)

[Answer]: A（ディスパッチ作業指示 2「installer eval への追加が自然」の転記）
