# Intent Statement — 260706-harness-codex（Issue #552）

## Problem Statement

Amadeus のディレクトリ構造には、上流 awslabs/aidlc-workflows v2 が core / harness / dist の三層で解決している 3 問題が残っている（2026-07-06 の運用実測。Issue #552 背景）。

1. 二重管理: `skills/amadeus-*`（正準ソース）と `.agents/skills/`（昇格先）等の同期を、promote-skill.ts + 粒度制約 + 同一 PR 規則という運用ルールで人力担保している。
2. ハーネス差分層の不在: `.claude/` の symlink 配線はアドホックで、Codex 対応物（skill 別 `agents/openai.yaml`。上流 `dist/codex` に実在）の置き場がない。
3. ビルドと配布の未分離: インストーラが実行時ツリーを直接コピーしており、#543 の版・ハッシュ manifest を生成する自然な場所がない。

本 Intent はこのうち、(a) 三層化全体の設計確定（設計論点 5 件を feasibility の questions + 全メンバー同報ピア協議で確定）と、(b) Phase 1 = `harness/codex/` の新設（上流 `dist/codex` の skill 別 `agents/openai.yaml` 群を amadeus 名へ適応取り込み。基準 commit = b67798c3）の実装までを行う。

## Target Customer

- 内部: Amadeus 開発チーム。人力同期の運用負担と生成物手編集の事故リスクが減る（Phase 2 で全面解消、本 Intent は設計確定で道筋を固定）。
- 外部: Codex ハーネスの利用者。skill 別 `agents/openai.yaml` の置き場（`harness/codex/`）ができ、Codex 対応（モデル移行）の基盤になる。

## Success Metrics

- 設計論点 5 件（core/ 粒度、生成方式、tooling 追従、粒度制約の置き換え、移行順序）が全メンバー同報ピア協議で確定し、decision と設計成果物に記録されている。
- `harness/codex/` が新設され、上流 `dist/codex` からの適応取り込み（rename 契約 = aidlc-* → amadeus-*、/aidlc → /amadeus）が純正性検証（#541 = fresh clone + provenance 照合）付きで完了している。
- `npm run test:all`、parity:check、validator が pass する。
- Phase 2（core/ 一本化 + build 化）へ引き継ぐ設計確定成果物が揃っている。

## Initiative Trigger

- 技術負債: 人力同期の運用ルール依存（2026-07-06 の運用実測）。
- 機会: 上流 v2 が同問題を core/harness/dist で解決済み。#526（全面 rename）の着地により大移設の単独実行枠の前例が確立。
- モデル移行: Codex 対応物の必要が顕在化（Phase 1 がモデル移行に直結）。

## Initial Scope Signal

scope = feature（leader ディスパッチ指定、Intake 判定で変更可 → feature を維持する。理由: 新しい能力 = ハーネス差分層の新設 + 全体設計の確定であり、docs 系 refactor を超える。Phase 2 の大移設は本 Intent に含めない）。
