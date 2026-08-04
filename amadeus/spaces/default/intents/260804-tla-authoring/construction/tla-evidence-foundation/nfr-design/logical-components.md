# NFR Design: 論理コンポーネント構成 — U1 tla-evidence-foundation

上流入力(consumes 全数): 本 unit の解決済み consumes は `business-logic-model.md`(U1 functional-design)。`security-requirements` / `tech-stack-decisions` は nfr-requirements SKIP による expected-absent。

## 層構成(NFR-004/NFR-006 の実装構造)

`memory/project.md` § Code Style(core の純粋判定と I/O handler の境界)と `business-logic-model.md` §6 の層分離宣言を、module 配置へ確定する。

| 層 | 内容 | 配置(canonical) | テスト層 |
|---|---|---|---|
| 純関数層 | C2 全部(parse / normalize / digest / compare)、C4 の検証ロジック(envelope schema 検証・digest 照合)、head 解決の集合演算 — **入力は handler 層が read で構成した `(ref, predecessor)` 対の配列**(EvidenceIndex.refs は digest のみのため、predecessor は envelope 読取で得る。純関数は対の配列から「被参照でない ref」を導く集合演算のみを所有) | `plugins/formal-model-check/tools/tla-evidence.ts`(新設 library module) | unit(in-process、fake bytes) |
| I/O handler 層 | store の読み書き(`.tmp/` 書込・rename・走査)。純関数層へ bytes を渡すだけ | 同 module 内の handler 関数群(fs 依存を関数境界で分離) | integration(実 FS) |
| CLI dispatch 層 | `tla-authoring.ts` の `identity` / `bundle` サブコマンド(argv parse → handler 呼出 → JSON 1 行出力) | `plugins/formal-model-check/tools/tla-authoring.ts`(新設 CLI。U2〜U4 のサブコマンドと同居) | integration + in-process seam(handler 直呼び — spawn 盲点回避) |

- 依存方向: CLI → handler → 純関数の一方向のみ。純関数層は fs・process・時刻へ依存しない(NFR-001 の決定性を構造で担保)。
- handler は argv パラメータ化して export し in-process 駆動可能にする(`memory/team.md` seam-export-handler-amend — coverage 計測の既定規律)。
- 新設 2 module は plugin manifest(`plugin.json`)へ登録し、U6 の import-closure guard が閉包を検査する(NFR-005 — 掲載漏れクラスの構造的防止)。

## モジュール境界の根拠

- **単一 module(tla-evidence.ts)に C2+C4 を同居**: U1 は「identity と evidence の語彙・schema の一元所有」(`unit-of-work.md` U1 境界)であり、語彙を 2 module へ割ると参照方向の管理が増えるだけで変更理由は同一(変更理由の凝集 — `memory/phases/inception.md` § Software Design Principles)。肥大した場合の分割線は「C2 純関数群 / C4 store 層」で、公開 API(コンパニオンオブジェクト)を保ったまま内部分割できる。
- **CLI を tla-authoring.ts に集約**: `unit-of-work.md` の CLI 契約(全 unit のサブコマンドが `tla-authoring.ts` に載る)に従う。dispatch は薄い switch のみとし、判定ロジックを CLI 層に置かない(fail-closed の default arm は 1 行化 — `memory/team.md` cg-bare-case-label-da0)。

## 上流トレーサビリティ

- `construction/tla-evidence-foundation/functional-design/business-logic-model.md` §6(層分離宣言)、`domain-entities.md`(公開型)
- `inception/requirements-analysis/requirements.md`(NFR-001、NFR-004〜NFR-006)
- `inception/units-generation/unit-of-work.md`(U1 境界・CLI 契約)
- `nfr-design-questions.md`(0 件判定、人間承認 2026-08-04T22:52:32Z)
