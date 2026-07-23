# Functional Design 質問票 — doctor-inprocess-seam

> 上流入力: `requirements.md`
>
> Unit: `doctor-inprocess-seam`。Units Generation と Application Design は
> Minimal refactor の実行計画で SKIP されているため、既存コード構造を de-facto
> application design とし、FR-1〜FR-6・NFR-1〜NFR-4 の実装境界だけを決める。
>
> ユーザー承認: 2026-07-23T04:05:46Z — Q1〜Q3 の回答サマリーを確認し、
> 「A. この内容で正しい」を選択。

## Q1. core と既存 `handleDoctor` の公開境界をどうするか

現在の `handleDoctor(projectDir): void` は export 済みで、`runUtilityMain` から呼ばれる。
FR-1〜FR-3 は core が結果を返し、CLI wrapper が表示と終了を担当することを要求する。

- A. **`handleDoctor` を同期 core として維持し、戻り値を `DoctorRunResult` へ変更する。`runUtilityMain` が薄い CLI wrapper になる**（推奨。新しい公開関数を増やさない）
- B. 新しい `runDoctor` core を追加し、`handleDoctor` は表示・終了を行う互換 wrapper として残す
- C. doctor を新しい専用モジュールへ移し、`amadeus-utility.ts` から re-export する
- D. `handleDoctor` の `void` 契約を維持し、結果は注入 callback だけで受け取る
- X. Other (please specify)

[Answer]: A — `handleDoctor` を同期 core として維持し、戻り値を `DoctorRunResult` へ変更する。`runUtilityMain` が薄い CLI wrapper になる。

## Q2. 整形済み出力をどの型で返すか

Q2-C と FR-2 により、core は終了コードと整形済み出力を返す。未決なのは、
既存 CLI のバイト列・順序を保ちやすく、テストもしやすい表現である。

- A. **`{ exitCode: 0 | 1; output: string }`**。core が既存順序どおりの完全な出力文字列を組み立て、wrapper が一度だけ write する（推奨）
- B. `{ exitCode: 0 | 1; output: readonly string[] }`。行単位で検証し、wrapper が改行を付けて連結する
- C. `{ exitCode: 0 | 1; output: readonly DoctorOutput[] }`。各要素に stdout/stderr と text を持たせる
- D. 終了コードだけを返し、出力は注入 writer で逐次観測する
- X. Other (please specify)

[Answer]: A — `DoctorRunResult` は `{ exitCode: 0 | 1; output: string }` とし、core が既存順序どおりの完全な出力文字列を構築して wrapper が一度だけ write する。

## Q3. process-global 依存をどの境界で注入するか

FR-4 は stage graph、main-checkout/cwd、env・cache をテストから制御可能にする一方、
全 filesystem・subprocess・audit 操作の抽象化は要求していない。

- A. **production resolver が小さな `DoctorContext` 値を構築し、core へ渡す**。stage graph、main checkout、harness/env 由来値だけを snapshot として保持し、既存 FS・audit・subprocess 関数は必要箇所で使う（推奨）
- B. FS、subprocess、audit、clock、env をすべて含む大きな `DoctorDependencies` port を作る
- C. `handleDoctor` に個別の optional parameter を追加し、指定がなければ global 値へ fallback する
- D. 現行どおり env 差し替えと cache reset API を正式テスト seam とする
- X. Other (please specify)

[Answer]: A — production resolver が小さな `DoctorContext` 値を構築し、stage graph、main checkout、harness/env 由来値だけを snapshot として core へ渡す。既存 FS・audit・subprocess 関数は維持する。

## 回答内容の最終確認

- Q1: `handleDoctor` を同期 core とし、`DoctorRunResult` を返す
- Q2: `DoctorRunResult` は `{ exitCode: 0 | 1; output: string }`
- Q3: production resolver が小さな `DoctorContext` snapshot を構築する

- A. この内容で正しい
- B. 回答を変更したい
- X. Other (please specify)

[Answer]: A — この内容で正しい。Functional Design 成果物の生成へ進む。

## 学びの追加確認

今回の stage memory から永続化候補は検出されなかった。
次回の Functional Design に引き継ぎたい追加事項はあるか。

- A. **追加なし**（推奨）
- X. Other（追加したい内容を記入）

[Answer]: A — 追加なし。
