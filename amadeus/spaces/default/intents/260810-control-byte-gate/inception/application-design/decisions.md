# Decisions(ADR)— 制御バイト検出ゲート(Issue #2814)

上流入力(consumes 全数): requirements.md(Open questions 3件が本 ADR 群の争点)、architecture.md(CI ジョブ構成・lint job の重量構成が ADR-1 の代替案評価根拠)、component-inventory.md(既存ゲートの allowlist 様式が ADR-2 の先例)

## ADR-1: CI 起動形態 — 常時実行の独立ジョブ

- **Context**: FR-CBG-8 は docs-only・amadeus-only を含む全変更クラスでの起動を要求する。現行 `detect-ci-changes.sh` は docs/** 一般・amadeus/** で full=false(RE 実測)のため、既存 lint job への同居は構造的空文化する。
- **Decision**: ci.yml に独立ジョブ `control-byte-gate` を新設し、`needs.changes` 条件を付けず常時実行する(AD Q1 裁定 independent-job、AUTO_DECIDED)。step は checkout → setup bun → `timeout --signal=TERM --kill-after=5s 30s bun tests/control-byte-gate.ts --check`(no-silent-drop step(ci.yml:157)のコマンド形と 30s 値を同形再利用)。
- **Consequences**: 全 PR に約数十秒のジョブが1本増える(walltime は他ジョブと並行)。detect-ci-changes.sh は**無改修** — 分類器と結合しないため、将来の分類変更がゲートを空文化するリスクが構造的に消える。変更クラス×起動有無の全数マトリクスは「全クラス×常時起動」に縮退し、FR-CBG-8 の受け入れは workflow 定義の実読(条件不在の確認)で完結する。
- **Alternatives Rejected**: (a) detect-ci-changes 分岐追加 — docs-only PR に lint job 全体(biome+build+lizard+全ゲート)を課し、分類器結合が残る。(b) lint job への step 追加のみ — docs-only PR で走らず要件違反。
- **Reversibility**: 高(ジョブ定義の移設・条件付与はいつでも可能)。

## ADR-2: allowlist は in-script 定数

- **Context**: FR-CBG-5 は正当バイナリ(現時点 PDF 1件)の明示 allowlist と stale エントリの fail-closed を要求する。
- **Decision**: ゲートスクリプト内の型付き定数配列 `BINARY_ALLOWLIST: readonly {path, reason}[]` とする(AD Q2 裁定 in-script)。stale 検査は「エントリ path が `git ls-files` 出力に不在なら exit 1」。
- **Consequences**: 追加は PR レビューで可視(reason 必須は型で強制)。台帳ファイル・digest 束縛・ratchet 機構は持たない — 1件クラスに対する最小形。
- **Alternatives Rejected**: no-silent-drop 型のイベント台帳 — shrink-only ratchet 意味論は要件に存在せず、複数 PR 競合の実績もない(過剰設計)。
- **Reversibility**: 高(件数が増えたら台帳ファイルへ抽出可能)。

## ADR-3: 検出バイト集合 — canonical との意図的相違(CR 除外)

- **Context**: FR-CBG-3/11 は canonical からの導出を要求する。`CONTROL_CHARS`(amadeus-lib.ts:4298 `/[\u0000-\u0008\u000B-\u001F\u007F]/g`)は監査表示文字列の sanitize 用で、CR 0x0D(0x0B-0x1F 範囲内)も strip する。ファイル内容検査で CR を検出すると CRLF 行末の正当ファイルが偽陽性になる。
- **Decision**: 検出集合 = **C0(0x00-0x1F)− {TAB 0x09, LF 0x0A, CR 0x0D} + DEL 0x7F**(AD Q3 裁定 cr-excluded)。0x0C(FF)は検出対象(canonical と相違なし — RA Open question の帰属確定)。CR 除外は意図的相違としてコードコメントと本 ADR に明文化(cid:application-design:citation-semantics-check — 引用元のドメイン差: 単一行の表示文字列 vs 複数行のファイル内容)。
- **Consequences**: RE Architect 実事例の混入4バイト(0x00/0x08/0x0B/0x1F)を全捕捉。CRLF ファイルは green。エスケープ表記はバイト走査により構造的に非検出(FR-CBG-4)。
- **Alternatives Rejected**: (a) CONTROL_CHARS 完全一致(CR 検出)— CRLF 偽陽性。(b) NUL のみ — 実事例4バイト中1バイトしか捕捉しない。
- **Reversibility**: 中(集合の拡縮は述語1関数の変更だが、緩め方向の変更は検出力の低下として要裁定)。
