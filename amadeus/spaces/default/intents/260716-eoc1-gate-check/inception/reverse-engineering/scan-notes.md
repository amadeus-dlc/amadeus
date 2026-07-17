# RE Scan Notes — 260716-eoc1-gate-check(Issue #1101)

## 上流入力(consumes 全数)

Issue #1101(クロスレビュー e2+e4+e3 検査案 — 含意形述語収束)、`../../ideation/scope-definition/scope-document.md`(In 5項)、`../../ideation/feasibility/feasibility-assessment.md`(実測5点)、codekb `code-structure.md`。`business-overview.md` / `architecture.md` はエンジン tool 内部のみの feature と非交差 — 参照非該当。

## Base 選定と到達可能性(rescan-base-ancestry)

- base = `e86c4da1d0c`(直前 re-scan 260716-covci-flake の observed)— 祖先性 exit 0・距離25で候補中最小
- observed = `f0f4e0ca4e6`
- 区間25コミットは record/audit のみ — amadeus-state.ts / amadeus-lib.ts への変更ゼロ(対象パス git log 0件)

## フォーカススキャン(検査挿入面の file:line 台帳)

### handleGateStart(挿入点 — feasibility 実測の精密化)

- dispatch `case "gate-start"` = amadeus-state.ts:389、`function handleGateStart` = :1661
- 関数内: 引数パース(:1662-1668)→ 状態読込 → `validateSlugInState(content, slug, "in-progress")`(:1680 相当 = 関数+19行)→ **[挿入点]** → `setCheckbox(content, slug, "awaiting-approval")`(+21行)→ STAGE_AWAITING_APPROVAL emit → writeStateFile
- fail-closed: 既存 `error()`(exit 非0・遷移なし)。withAuditLock 内でアトミック

### questions ファイルの解決

- パス様式: `<record>/<phase>/<stage>/<stage>-questions.md`。stage → phase の解決は stage graph(runtime-graph / stageBySlug 系)から — 実装時に handleGateStart が既に持つ stage 解決(:1678 の stage lookup)を再利用
- 不在は正常(全ステージが持つわけではない — covci CG/B&T 実測)

### 検査対象データの実在様式(L1 証跡 — 本日8ファイル実測)

- 承認行: 「leader 承認 2026-07-16T14:33:52Z」形(questions 冒頭 H2 節内)— ISO タイムスタンプが機械抽出可能
- **データ形状は2様式が実在(是正時再実測)**: (i) **[Answer] タグ形** — 実際に質問がある intent(例 260712-metrics-observation の team-formation-questions.md:8 「- [Answer]: (TF-Q0 選挙の裁定受領後に記入)」、260706〜260709 系 RA questions 多数)。空欄形は「[Answer]: 」の後が裁定待ち文言のみ (ii) **[Answer] タグ不在形** — E-OC1 標準の「0問」様式(本 intent の8ファイル全て — grep 0件を実測。「## 質問」節に「(なし)」+冒頭判定節のみ)。検査述語は (ii) を**無条件通過**(questions 不在と同格)にしないと本日以降の標準運用が全て偽陽性になる

### 共有関数の配置(#922 統合面)

- 検査述語は amadeus-lib.ts へ export(既計測モジュール — seam-placement-measured-module)。state.ts から呼ぶ。#922 の sensor 発火点は将来同関数を消費可能

## 1行結論

挿入点・fail-closed 経路・データ様式・共有配置の4面すべて実測済み — requirements(含意形述語の AC 化)へ渡す。
