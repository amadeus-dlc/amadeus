# Requirements — doctor の drops 表面化（260705-doctor-drops）

対象 Issue: [#432](https://github.com/amadeus-dlc/amadeus/issues/432)

## 意図分析

hook は fail-open 設計であり、失敗は `recordHookDrop()` が `.aidlc-hooks-health/<hook>.drops` へ追記する。
しかし `.drops` を読むコードが存在せず（書き込み専用）、hook の静かな失敗が誰にも気づかれない。
`recordHookDrop` のコメントは「so `--doctor` can surface them」と約束しており、本 Intent はその約束を実装する。

## 機能要求

- R001: doctor の hooks-health 検査は `.aidlc-hooks-health/*.drops` を読み、drops がある hook ごとに 1 行の **fail**（pass: false）を報告する。行には hook 名、件数、最新 1 件の時刻と理由を含める（questions Q1 / Q2 = A）。
- R002: `.drops` の行は `recordHookDrop` の書式（`<ISO timestamp>\t<reason>`）として解釈する。解釈できない行は件数にだけ数え、理由表示は最新の解釈可能行を使う（無ければ「未確認」）。「最新」は時刻の大小比較ではなく、追記型ファイルの末尾に近い解釈可能行を指す（reviewer 低指摘の明文化）。
- R003: fix 文言に、クリア手段（理由を確認したうえで当該 `.drops` ファイルを削除する）を明記する。古い drops の自動解除は行わない（Issue 未確定事項 2 の確定）。
- R004: `.drops` が 1 つも無い場合、doctor の出力と exit code は現状と変わらない（後方互換）。

## 非機能要求

- N1: eval は隔離 workspace で実 CLI（`amadeus-utility.ts doctor`）を駆動する。RED 先行（修正前は drops があっても出力に現れないことを確認する）。
- N2: 既存検証の退行なし（`npm run test:all` 全件）。
- N3: parity-map の engineFileExceptions へ `tools/aidlc-utility.ts` の宣言を確認する（宣言済みなら追加不要）。

## 受け入れ条件（Issue の受け入れ条件と対応）

| AC | 内容 | 担保する要求 |
|---|---|---|
| 1 | `.drops` が存在する状態で doctor を実行すると、対象 hook 名、件数、最新の理由が出力され、doctor が fail（非 0 exit）になる | R001 / R002 |
| 2 | `.drops` が無い場合の doctor 出力と exit code は現状と同じ | R004 |
| 3 | 追加挙動が決定論的な eval で確認できる | N1 |
| 4 | 既存検証に退行がない | N2 |

## スコープ外

#431（エンジンエラーの audit 記録）、hook 側（recordHookDrop）の変更、drops の自動ローテーション。
