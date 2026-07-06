# Requirements — 260706-journal-logger（Issue #557）

## Intent 分析

Intent 横断の調整記録の受け皿がなく #556 の手動 Issue 運用が暫定である（[intent-statement.md](../../ideation/intent-capture/intent-statement.md)）。本 Intent は journal 契約 + logger 手順書ほか納品物 5 点（[scope-document.md](../../ideation/scope-definition/scope-document.md)）を実装する。実施規範は [team-practices.md](../practices-discovery/team-practices.md)、コードベース文脈は codekb（[business-overview.md](../../../../codekb/amadeus/business-overview.md) の運用モデル、[architecture.md](../../../../codekb/amadeus/architecture.md) の validator seam、[code-structure.md](../../../../codekb/amadeus/code-structure.md) の層構成）を参照した。

## 機能要求

### FR-1: journal 契約 doc（納品物 1）

- FR-1.1: `amadeus/spaces/default/journal/README.md` を新設し、規約を定義する: 日次ファイル `<YYMMDD>.md`、エントリ形式（見出し `## HH:MM:SSZ <種別> — <要約>` + 定型 4 フィールド = 発信者 / 種別 / 本文 / 昇格）、種別語彙（調停 / 委任 / 体制 / 観察）と拡張手順 1 行、追記専用規律、参照方向（memory → journal 可、journal 側は昇格スタンプのみ、網羅相互リンク禁止、knowledge → journal は代表例のみ）、昇格スタンプの記法（未昇格 = `-`、cid:xxx / PR #n）。
- FR-1.2: 文書は日本語（AMADEUS.md 作業言語）。

### FR-2: validator の journal 検査（納品物 2）

- FR-2.1: 最小 3 条件（journal/ 直下は README.md と `<YYMMDD>.md` のみ / 各エントリに必須 4 フィールド / 種別が語彙表 + 契約 doc 更新とセットの拡張手順に従う）を検査する。
- FR-2.2: TDD: 先に失敗する eval（エンジン実出力形 = 実ファイル fixture）を追加し RED を確認してから実装。skills/amadeus-validator を正とし promote で昇格、`npm run test:it:promote-skill` pass。

### FR-3: journal-logger 手順書 + 役割 prompt（納品物 3）

- FR-3.1: 手順書に含む: worktree 準備（単独所有）、agmsg join / spawn 手順（spawn.sh 引数の実測に基づく）、日次 PR 手順（draft ルール準拠）、不達時 fallback（送信者が leader へ直接記録依頼）。
- FR-3.2: 役割 prompt に含む: 受信 → 整形追記 → ack（1 メッセージ固定形式 + 追記先ファイルと見出しアンカー + 仕分け提案同梱）、仕分け 3 分類（生ログ / learnings 候補 / steering 候補）、定着決定権なしの明記、軽量モデル指定。

### FR-4: #556 移行（納品物 4）

- FR-4.1: #556 の本文 + コメント 3 件を FR-1 形式で journal/260706.md へ移行し、各エントリに出自（#556 から移行）を明記する（questions Q1 = A）。
- FR-4.2: #556 へ投稿する参照コメント文面（本仕組みへの誘導）を成果物に含める。投稿とクローズは人間 / leader。

### FR-5: 運用検証チェックリスト（納品物 5）

受け入れ条件 2〜3 の合否基準を列挙する: 追記 + ack の実働（ack の固定形式・アンカーの実在）、日次 PR の作成、仕分け提案 1 件が §13 または steering 反映バックログへ接続。初回起動後に人間 / leader が結果を記入する形式。

## 非機能要求

- NFR-1（検証）: validator（Intent 指定込み）と test:all が pass。新 eval は test:it チェーンへ編入。
- NFR-2（追記専用）: 移行エントリ含め、生成後のエントリを書き換えない設計（昇格スタンプの追記のみ許可される旨を契約に明記）。
- NFR-3（最小変更）: 変更は journal/ 新設、validator（skills + 昇格先）、手順書類、eval のみ。既存の memory / knowledge / audit 契約に触れない。

## 制約

constraint-register の C-1〜C-7 に従う。

## 前提

- feasibility の設計 4 問と付帯採用 3 点（5/5 一致、gate 承認済み）。
- agmsg spawn 機構の実在（引数詳細は FR-3.1 の作成時に実測 = raid A-1）。

## スコープ外

scope-document のスコープ外 5 項目（実 spawn、実働実績の記録、#556 クローズ操作、仕分け種別追加、棚卸し機械化）。

## 未解決事項

- なし（細部 1 問は questions Q1 で自己判断確定済み。gate の人間承認で確定する）。

## 受け入れ条件

| 区分 | 受け入れ条件 | 対応要求 |
|---|---|---|
| Issue 条件 1 | journal 契約が文書化され validator が構造を検査 | FR-1、FR-2 |
| Issue 条件 2〜3（後続確認） | 追記 + ack + 日次 PR、仕分け 1 件の定着接続 = チェックリストの合否基準として納品、実績は初回起動後 | FR-3、FR-5 |
| Issue 条件 4 | #556 エントリの移行 + 参照（クローズは人間） | FR-4 |
| 検証 | validator / test:all pass | NFR-1、FR-2.2 |
