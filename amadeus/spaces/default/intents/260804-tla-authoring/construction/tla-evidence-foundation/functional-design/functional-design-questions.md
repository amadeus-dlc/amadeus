# Functional Design Questions: U1 tla-evidence-foundation

## 回答方法

- モード: Guide me
- 質問予算: 最大2件。上流(`inception/units-generation/unit-of-work.md` の U1 定義、`inception/requirements-analysis/requirements.md` FR-006/FR-007/NFR-002、`inception/application-design/component-methods.md` C2/C4 契約、`decisions.md` ADR-2/ADR-3/ADR-7)で確定済みの事項 — digest = SHA-256・canonical 直列化全 bytes 対象、2 kind(authoring-bundle / terminal-route-receipt)、predecessor 連鎖 + root marker、store 位置 `specs/tla-evidence/`、書き手 C4 単一化、ブランド型 + Result — は再質問しない。

## 質問

### Q1. evidence store の物理レイアウト(1 evidence の保存形)をどうしますか？

- A. 1 evidence = 1 canonical JSON ファイル。パスは `specs/tla-evidence/<bundle-digest>.json`(digest がファイル名)。kind・parts・predecessor は JSON 本文の判別ユニオンで表現し、list/head 列挙は C4 がディレクトリ走査で所有する(推奨 — content addressing が最も単純に成立し、部分書込は tmp + rename 1 回で排除できる)
- B. kind 別サブディレクトリ(`specs/tla-evidence/bundles/`、`specs/tla-evidence/receipts/`)に分けて保存する
- C. 1 evidence = 1 ディレクトリで receipt を part ファイルに分割保存する(digest はディレクトリ名)
- X. Other (please specify)

[Answer]: A. 1 evidence = 1 canonical JSON ファイル。パスは `specs/tla-evidence/<bundle-digest>.json`(推奨)

### Q2. stable ID の正規化抽出の対象文法をどうしますか？

- A. 見出し駆動の閉じた文法: requirements.md の `### FR-xxx` / `### NFR-xxx` / `### AC-xxx` 見出しセクションと decisions.md の `## ADR-n` 見出しセクションを stable ID 単位として抽出し、セクション本文を canonical bytes(行末空白除去 + LF 正規化 + 見出し行自身は ID のみ採用)へ正規化する。文法外の ID(cid 等)は上流の入力宣言(C1/C7)が明示リストで渡した場合のみ対象(推奨 — 抽出の決定性が文法で閉じ、FR-006 の重複/解決不能 ID 検出も文法上で定義できる)
- B. 正規表現で文書全域から ID らしきトークン(FR-\d+、cid:\S+ 等)を自動収集し、周辺段落を本文とする
- C. 抽出を行わず、対象 ID と本文範囲をすべて明示 manifest ファイルで宣言させる
- X. Other (please specify)

[Answer]: A. 見出し駆動の閉じた文法(FR/NFR/AC/ADR 見出しセクション + 上流明示リスト)(推奨)

- 人間承認: 2026-08-04T18:09:58Z

## 回答確認

- Q1: 1 evidence = 1 canonical JSON(`specs/tla-evidence/<digest>.json`)、list/head は C4 のディレクトリ走査
- Q2: 見出し駆動の閉じた文法(FR/NFR/AC/ADR)、文法外 ID は上流の明示リスト渡しのみ

曖昧さ分析: 両回答とも推奨案の単独選択で、相互矛盾・曖昧語・欠落詳細なし。追質問ラウンドは不要。

## 上流トレーサビリティ

- `inception/units-generation/unit-of-work.md`(U1 定義)、`unit-of-work-story-map.md`(U1 の FR-004/005/006/007/010 補助責務行 — 質問範囲を保存・語彙責務に限定する根拠)
- `inception/requirements-analysis/requirements.md`(FR-006、FR-007、NFR-002)
- `inception/application-design/components.md`(§C2/§C4 の責務境界 — 再質問しない既決範囲)、`component-methods.md`(C2/C4 契約)、`services.md`(§S3 の CLI 呼出し契約 — Q1 の list/head 所有判断の前提)、`decisions.md`(ADR-2/3/7)
