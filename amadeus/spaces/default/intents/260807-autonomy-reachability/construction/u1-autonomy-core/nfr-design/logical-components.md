# Logical Components — u1-autonomy-core

上流入力(consumes 全数): business-logic-model.md(フロー1〜4)。nfr-requirements 系5成果物は SKIP により未生成(設計どおりの不在)。

## 論理構成(モジュール別の保証機構 — 一枚岩の断定を避ける層別記述)

| 論理コンポーネント | 実体 | 保証機構 |
|---|---|---|
| Mode Applier | `applyProductionAutonomyMode`(拡張) | audit 先行・state 追従の呼び出し順序契約+冪等収束 |
| Refusal Emitter | `emitAuthorizationRefusal`(新設・私有) | 単一発行点(:227-231)・fail-open 限定・reason 2値 |
| Preview Enumerator | `previewProductionAutonomyGrant`(拡張) | 集合差導出(リテラル非複製) |
| State Field Writer | Mode Applier 内部の私有関数 | 書込1箇所(grep 固定テスト)— ポート非公開 |
| CLI Shim | `handleSetAutonomy`(縮約) | ポート限定(canonical 呼出しのみ)— 判定・書込を持たない |
| Consistency Probe | FR-2d integration テスト | 6読み手の関数直呼び assert(検証専用 — 本番コードに test seam 分岐を置かない) |

## テスト層配置

- 実 FS を触る検証(state 書込・audit 直読・failure injection)は integration 層(fs-tests-integration-first)
- 純関数(集合差・reason 写像)は unit 層
- push 前に lcov で配線行・catch 行の DA を確認(lcov-wiring-line-checklist)
