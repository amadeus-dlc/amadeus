# Unit of Work Story Map — インセプション固定費バッチ(#3181 + #2415)

user-stories ステージは本スコープで SKIP のため `stories.md` は設計上不在(consumes required:false)。本マップは `requirements.md` の FR 群を story 相当の割当単位として `unit-of-work.md` の2 Unit へ写像する。依存の文脈は `unit-of-work-dependency.md` を参照。

## FR → Unit 割当

| FR 群 | 実装 Unit | 備考 |
|---|---|---|
| FR-EVD-1〜8(Issue エビデンス上流入力)| U1 issue-evidence-upstream | 全8件が U1 単独で完結 |
| FR-EXC-1〜3, 5〜6(除外規定・非除外リスト・provenance)| U2 re-input-exclusion | 契約宣言+検証 |
| FR-EXC-4(縮小率の実測記録・帰属検査)| U2(述語と測定手順)| 実測自体は後続 intent(requirements 前提節)|
| FR-MEAS-1(N=5・目標35分)| U1(効果測定節への目標固定)| unit-of-work.md「効果測定の帰属」のとおり専用 Unit なし |
| FR-MEAS-2(測定 provenance 義務)| U1・U2 双方 | 各 Unit の成果物内の測定記載に適用 |
| NFR-1〜4 | U1・U2 双方 | 横断規律(互換シム禁止・Bun-only・dist 同期・TDD)|

## Unit 内実装順(story 相当 = FR の Unit 内順序)

component-dependency.md の Unit 内依存(C1・C3 相互独立 → C2 は両方に依存)を FR 列へ写像した順序。TDD の vertical slice はこの順で1件ずつ回す。

**U1 issue-evidence-upstream**(FR-EVD 8件 + FR-MEAS):

1. FR-EVD-2 / FR-EVD-6 — artifact kind 宣言とデータ様式の確定(C6 の optional_produces + 様式 fixture。以降の全 slice の土台)
2. FR-EVD-1 — 取得・書込の本線(C1 adapter と C3 resolver は相互独立で先行可、C2 verb が両者を結合)
3. FR-EVD-5 — readiness/API 失敗の loud fail + fallback 続行(エラーパスも TDD 対象)
4. FR-EVD-3 / FR-EVD-4 — RA / RE 契約の consume 配線(C4、C5 の U1 面)
5. FR-EVD-7 — upstream-coverage 引用義務の拡張(引用欠落 fixture)
6. FR-EVD-8 — 落ちる実証(欠落 fixture で FAILED → revert)
7. FR-MEAS-1 / FR-MEAS-2(U1 分)— 効果測定節への目標・baseline 固定

**U2 re-input-exclusion**(FR-EXC 6件 + FR-MEAS):

1. FR-EXC-5 — 正準 pathspec の事前実測(既知非ゼロ区間で正件数 — 述語の健全性を先に確定)
2. FR-EXC-1 / FR-EXC-2 — 除外クラス宣言と specs/** 非除外の契約記載(C5 の U2 面)
3. FR-EXC-3 — 新規引用禁止の明文化(ADR-3)
4. FR-EXC-4 — 帰属検査述語(未帰属除外ゼロ)
5. FR-EXC-6 — 落ちる実証
6. FR-MEAS-2(U2 分)— 縮小率測定手順の記載

## 横断事項(複数 Unit にまたがるもの)

- `reverse-engineering.md` の編集は U1 面と U2 面に分かれる(unit-of-work-dependency.md の統合点表)— 直列化は delivery-planning。
- 台帳同期(coverage-registry regen / patch-allowlist 再アンカー / dist 再生成)は各 Unit が自分の変更分を同一 PR で同梱。

## 被覆検証

- 全 FR(EVD 8 + EXC 6 + MEAS 2 = 16)が上表でいずれかの Unit へ割当済み — 未割当 0。
- 両 Unit とも割当 FR を持つ — 空 Unit 0。
