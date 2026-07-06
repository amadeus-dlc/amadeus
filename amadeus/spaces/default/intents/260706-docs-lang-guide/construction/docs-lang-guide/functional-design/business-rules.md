# Business Rules — docs-lang-guide

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 言語方針の規則（B001）

- BR-1: docs/amadeus 配下では英語 `*.md` が正であり、`*.ja.md` は日本語版である。乖離時は英語が正（FR-1.1）。
- BR-2: docs/amadeus を更新する PR は原則 `*.md` と `*.ja.md` の両方を含める。片方だけを更新する場合は、理由と追随予定を PR 説明に記す（FR-1.1(b)）。
- BR-3: `*.md` からのリンクは `*.md` を参照する。`*.ja.md` からのリンクは `*.ja.md` を優先し、対応する日本語版がなければ `*.md` を参照する（FR-1.1(c)）。
- BR-4: この方針は docs/amadeus 配下に限る。AMADEUS.md の既存 2 箇条（仕様・記述系成果物の日本語維持）は docs/amadeus 以外で従来どおり有効であり、カーブアウトは明示の 1 文で行う（FR-1.2、A-2）。

## 拡張ガイドの規則（B002）

- BR-5: 記載内容はエンジン実装と実測で一致させ、推測で書かない（FR-2.3、Grounding）。実測できない事項（composer = #428 merge 前）は検討中注記にする（O-1、Design Honesty）。
- BR-6: 未着手の関連 Issue（#527、#524）に属する詳細はガイドに書かず、pending-note で委ねる（FR-2.4）。
- BR-7: 人間編集の規律として記載する 2 点は steering の実規約から転記する: ①判断基準の追記は観察済みの実例に根拠がある範囲だけ（team.md 原則）、② Corrections への追記は learned 形式 + cid marker（#504 修正後の新形式 `cid:<dirName>:<stage>:<cN>`）（FR-2.2(3)）。
- BR-8: 本 Intent 自身が BR-2 の最初の実例になる（PR は英語版・日本語版の両方を含める = NFR-1）。
