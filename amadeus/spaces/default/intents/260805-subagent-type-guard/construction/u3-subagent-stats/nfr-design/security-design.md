# U3 subagent-stats — Security Design

**上流入力(consumes 全数)**: `business-logic-model`(read-only 契約・エラーモデル — 本書の統制対象)。条件解決で除外された consumes(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は nfr-requirements SKIP による設計上の不在(directive の `consumes_absent` expected: true)。

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## read-only 境界(最重要統制)

- **書込ゼロの構造化**: main は走査(読取)と stdout/stderr 出力のみ、集計は純関数 — ファイル書込・state 変更・audit 追記の API を import しない(business-logic-model 不変条件1)。監査データを読む道具が監査を汚染しない、が本 Unit の第一統制
- **走査対象の限定**(本 ND が加える引数受理統制 — FD の BR-U3-1 は「未知フラグの loud 拒否」までを定め、以下は ND 所有の追加統制): 走査 glob は常に `<projectRoot>/amadeus/spaces/<space>/intents/*/audit/*.jsonl` の固定形。2フラグの意味論は別物として分ける —
  - `--space <name>`: 固定形の中の1セグメントを**絞り込む**値。path traversal を防ぐため、path セパレータ・`..`・空文字を含む値は loud 拒否(非0 exit)
  - `--project-dir <path>`: 走査ルートを**別の場所へ差し替える**フラグ(部分集合保証はない — 既存 audit 読取 CLI の `--project-dir` と同じ意味論)。受理条件: 実在するディレクトリであること(不在は loud 拒否)。値そのものは利用者の任意パスでよい(ローカル CLI の明示指定は利用者の権限内)

## 入力の取り扱い(信頼境界)

- **audit 行は信頼境界外のデータ**: parse-don't-validate で JSON parse → 型付き `SubagentAuditRecord` へ写像し、parse 不能・型不正は skip 計上(壊れた行がクラッシュ・誤集計に昇格しない)
- **属性値の出力サニタイズ**: `agentType` / `model` は audit 行由来の任意文字列。除去点は **render 側**(`renderStatsText` が text 描画時に制御文字を除去)— compose はデータをそのまま保持する(集計キーの同一性を表示都合で変えない)。`--json` 出力は JSON エンコードで制御文字がエスケープされて**残る**(意図どおり — 機械消費側は生値が必要で、構造はエンコードが守る)。**除去の実装供給元(§12a iteration 2 BLOCKER の是正)**: `amadeus-subagent-observability.ts`(U1 新設・本 Unit の既定依存先)が export する制御文字除去ヘルパを使う — stats → observability の一方向依存に載り、依存禁止(`amadeus-lib.ts` へ依存しない)と矛盾しない。lib の `CONTROL_CHARS` とは意味論同水準だが定数は共有しない(lib 側は既存 audit 経路の所有、observability 側は検出/集計表示面の所有 — 変更理由が異なるコードは統合しない「意図ベースの重複排除」原則。U1 の lib/hook 層内の差し込みは lib 定数をそのまま使えるため U1 側に矛盾はない)
- **Type Verdict の union 判定**: `isTypeVerdict()` で閉語彙判定し、非適合値を集計キーにしない(BR-U3-3 手順1 — 出力語彙の閉鎖)

## 情報開示

- 出力は集計値・型名・model 名・警告理由のみ — audit 行の Request/Response 本文・prompt 内容は読み取りも出力もしない(CON-1 と同族の非接触)
- `scanScope` の印字は space 名 + glob のみ(絶対パスの機械秘匿は不要 — ローカル CLI の診断出力)

## コンプライアンス統制

- ネットワーク送出・資格情報・暗号化対象なし(ローカル FS 読取のみ)— 該当統制は N/A(根拠: business-logic-model のモジュール構成に I/O は node:fs のみ)
- 集計値はすべて実行時計数からのみ導出(検証劇場 Forbidden — ハードコード・推定値なし、business-logic-model 不変条件5)
