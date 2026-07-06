# コード生成計画 — unit: full-rename

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、設計 = [business-logic-model.md](../functional-design/business-logic-model.md)（3 段 commit 構成）、[business-rules.md](../functional-design/business-rules.md)（写像規則）。

## トレーサビリティ

| Commit | 対応要求 | 実施内容 | 実コミット |
|---|---|---|---|
| A | FR-3 / FR-7 / FR-5 | /aidlc → /amadeus 表記 106 ファイル 297 箇所、AMADEUS.md へ v2 互換再定義、cli-token 写像追加（往復可逆検証） | e7b79889 |
| B | FR-1 / FR-2 / FR-4 / FR-5 / FR-6 | git mv による原子的移設（tracked 1428、record 36 + 自 Intent、state 37 件、マーカー）、エンジン・validator・installer（FR-2.13 意味論）・dev-scripts・.gitignore・settings 追従、写像 +7、移設注記 37 record | b2f817ff |
| C | FR-8 | rename-leftovers の検出反転（allowlist v2 + tree-wide 検査 (e)、自己検査で検出力証明）、parity eval C10 前提更新 | 5961758b |

## 実施記録（各段 green の証跡）

- Commit A: parity ok / test:all exit 0。巻き込み 2 種（parity-map 新 entry の自壊、正規表現リテラル）を検出し復元（diary 記録）。
- Commit B: parity ok（写像計 8 系統、例外純増ゼロ）/ test:all exit 0 / validator（workspace 全体 + 本 Intent）pass。エンジンの旧 root 参照は移設直後に実測検出し最小窓で解消（hooks 競合は観測されず、旧 path への audit 落ちなし）。一括置換の自己破壊 2 件（parity eval・rename-leftovers eval の fixture / 検出パターン変異）は HEAD 復元で解消。
- Commit C: rename-leftovers ok（(e) 自己検査 = 合成旧名 1 件を報告・allow 行を通す。実ツリー残存ゼロ）/ parity ok / test:all exit 0。

## 設計からの逸脱

- なし（3 段構成・写像規則・installer 意味論・移設注記の設計どおり）。追加で判明した写像 4 系統（aidlc-${、aidlc-init、skills/aidlc/、.aidlc/、aidlc/.）は business-rules の「往復可逆を採用条件」の枠内で追加した。
