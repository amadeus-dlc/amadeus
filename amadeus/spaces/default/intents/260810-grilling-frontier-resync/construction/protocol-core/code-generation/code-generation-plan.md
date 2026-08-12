# Code Generation Plan — Bolt 1 protocol-core(事後作成)

**Intent**: 260810-grilling-frontier-resync / **Stage**: code-generation / **Unit**: protocol-core (spec)

上流入力(consumes 全数): `bolt-plan.md`(Bolt 1 スライス定義)、`unit-of-work.md`(U1 完了条件 — 各 Step の AC 正本)、`business-rules.md`(BR-U1-1〜12)、`domain-entities.md`(マーカー・記録行の型)、`security-design.md`(供給元完全性の統制)、`requirements.md`(FR の AC 逐語)。

> 本 plan は swarm 経路の事後作成(cid:code-generation:swarm-unit-artifact-backfill — swarm worker は record を書かないため、conductor が finalize 後に実績へ基づき作成)。Step の述語は unit-of-work.md U1 完了条件の逐語(cid:code-generation:c3-260803-state-integrity — 縮小しない)。

## Steps(実績確定)

1. 骨格取得と照合: `gh issue view 2785` 本文のピン原文を取得し、sha256 `fa5c1e5ee76b1c8f1ae56101f52c9e239de75d5c578adc61227b92d10b7e52ef`・1872 bytes を照合してから埋め込む。
2. `grilling-protocol.md` 全面書き直し: 骨格ブロック(begin/end マーカー、`upstream=1495d014303e041c51c29f9e442485ba06f5878d`)+overlay(抽出手順自己記述 / rounds・frontier 終了意味論 / 枝刈り表(M/S/C+standalone Free)/ 刈りノード列挙節 / 回路遮断器(M12/S24/C36)/ 超過記録行 / 先頭マーカー・1問1件 / annex 写像 / D3/D4 接続)。**骨格マーカー間テキストがピン原文と diff 空(FR-PROTO-1)/ 帰属 SHA 1 hit(FR-PROTO-2)/ overlay 分離(FR-PROTO-3)**。
3. `stage-protocol.md` 改訂: **Step 3d 改訂・§8 接続段落・semi 除外明文(FR-CONTRACT-1/2/5)** — `hybrid termination` 0 hit、§8 数値表の行は diff 不変。
4. `SKILL.md` 改訂: **レベル引数と Free 既定(FR-PROJ-1)** — standalone の現行分類(record 非接触・監査なし)維持。
5. t415 の暫定整合(BR-U1-12): 旧 pin の最小差し替え+`hybrid termination`・旧 D6 文言の not.toContain。完全な新 pin 群・対角実測は U2 の所掌(FR-CONTRACT-6 暫定 — unit-of-work.md U1 行の注記どおり)。
6. `bun run build` 再生成 → tracked 不変確認。検証: FR-PROTO-1 の diff 空実測 / t415(暫定)・t199 green / typecheck・lint(bolt-plan Bolt 1 検証列の逐語)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T10:28:15Z
- **Iteration:** 1
- **Scope decision:** none

READY(GoA 2): 実装4面+t415 を BR-U1-1〜12 / FR-PROTO-1〜10 / FR-CONTRACT-1/2/5 / FR-PROJ-1 と file:line 照合 — 骨格ブロック(begin/end・upstream 属性)・overlay 分離・抽出手順自己記述、§2.1-2.6 の全規定(終了意味論・枝刈り表・刈りノード列挙・遮断器+E-GFR-CG1 ラウンド原子性段落(非採用案語彙 0 hit)・記録行 verbatim・D3/D4)、§4 annex 写像、stage-protocol の Step 3d 差し替え・hybrid termination 0 hit・§8 数値表(4/8/12)不変+接続段落・§3 semi 除外、SKILL.md の Free 既定・standalone read-only 分類維持を確認。t415 の assertion は実ファイル文言と1対1一致し code-summary の 8 pass 実績と符合。無申告逸脱・要求外の後方互換レイヤー/フォールバック/移行シムなし。FOLLOW-UP 1件(record 内の conductor.md 是正記述の字面矛盾)は conductor が同一ターンで明文修正済み。

### Findings

- FOLLOW-UP | code-summary.md の申し送り節と 6407b3210 行の conductor.md 記述が字面矛盾 — 「conductor.md:51 のみ c6 先行是正済み、残る docs は U3 所掌」へ明文修正 — 反映済み
