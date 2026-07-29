# Application Design — 質問票

Stage: application-design (inception)
Depth: Standard（文脈適応で 3 問）
Context: `requirements.md`（FR 8群33件＋NFR 4＋VER 6、reviewer READY）、`team-practices.md`、codekb（`architecture.md`・`component-inventory.md`）を参照済み。コンポーネント構成は #1672 の採用方針と Module 処置表でほぼ確定しているため、配置・境界・ADR 範囲の3点を確認する。

## 判定と根拠（E-OC1 3段順序）

- Q1-Q3: 選挙不要 — ソロ運用。ユーザー本人が AskUserQuestion で直接回答（HUMAN_TURN 実測）
- leader 承認: ユーザー本人の直接回答をもって承認済み 2026-07-29T07:12:31Z

---

## Q1. 新規コンポーネントの配置は？

Provider・Local Exporters・Event Registry をどこに置くか。現行の正本構造は `packages/framework/core/tools/amadeus-*.ts`（1ツール1ファイル）＋巨大な `amadeus-lib.ts`。

- A. `packages/framework/core/otel/` に新サブディレクトリを切る — Provider・Exporters・Registry・Context を otel 配下に集約し、tools/ からは CLI 境界だけを呼ぶ。関心事の分離が明確で、lib.ts 肥大化を避けられる
- B. 既存慣行どおり `packages/framework/core/tools/amadeus-otel-*.ts` として平置き — 1ツール1ファイルの慣行に従うが、CLI ツールとライブラリの混在が続く
- X. Other (please specify)

[Answer]: A. `packages/framework/core/otel/` に新サブディレクトリを切る

## Q2. 既存モジュールとの境界は？

`amadeus-audit.ts`（1094行）の分割方針（#1672 Module 処置表: writer は OTel Event API＋AuditLogExporter へ、reader／merge／CLI 互換は Journal Module へ分離）。

- A. 処置表どおり — Journal Module（`amadeus-journal.ts` を拡張）へ reader/merge/codec を集約し、`amadeus-audit.ts` は移行期間の互換 Adapter 経由で段階縮小、最終的に旧 writer 削除
- B. `amadeus-audit.ts` を維持しつつ内部実装だけ差し替える（ファイル分割を避ける）
- X. Other (please specify)

[Answer]: A. 処置表どおり — Journal Module へ reader/merge/codec を集約し、amadeus-audit.ts は互換 Adapter 経由で段階縮小、最終的に旧 writer 削除

## Q3. decisions.md に記録する ADR の範囲は？

#1678 の Phase 1 ADR 事項（Logs API 採否・Bun Context Manager・health 検証 protocol・API singleton bundle 構成）は Phase 1 の成果物として書く前提。

- A. このステージではアーキテクチャ確定分のみ記録 — (1) 上流 Interface を OTel API ファミリーに一本化、(2) 3 Provider 分離（Tracer/Logger/Meter）、(3) 失敗契約の二重防御（例外＋latch）、(4) 配置（Q1 の結果）、(5) 既存モジュール境界（Q2 の結果）、(6) Projector→Relay 縮退。Phase 1 ADR 事項は walking skeleton 実測後に decisions.md へ追記する
- B. Phase 1 ADR 事項も仮決定としてここで記録し、Phase 1 で確定に更新する
- X. Other (please specify)

[Answer]: A. このステージではアーキテクチャ確定分6件のみ記録。Phase 1 ADR 事項は実測後に追記
