# Reliability Design — u001-installer-versioning（260706-installer-versioning）

上流入力: [reliability-requirements.md](../nfr-requirements/reliability-requirements.md)、[business-logic-model.md](../functional-design/business-logic-model.md)

| 要求 | 設計 |
|---|---|
| REL-1（途中失敗の自然回復） | manifest 書き出しを main 末尾の 1 箇所に置く（BR-3）。judge のグローバル優先規則（current = newHash → skipped）で再実行の二重退避を構造的に排除。eval 追補 (i) = 途中失敗 → 再実行で退避 0 件 |
| REL-2（退避先行 + 失敗時停止） | trackedWrite 内の順序を「judge → backup（必要時）→ write」に固定し、backup の書き込み例外は InstallError（fix: 付き）へ変換して伝播（runStep が exit 1）。write より前に backup が return していることが構造上保証される |
| REL-3（spawnSync 教訓） | resolveSourceCommit を try/catch で包み、throw（git 不在）と非 0 exit（repo でない）の両方を "unknown" へ。告知行は main 起動部で 1 回 |
| REL-4（記録） | build-and-test の build-test-results.md に eval / test:all を記録 |

実コードへの規則コメントは `REL(#543)-n` 形式（reliability-requirements の ID 名前空間注記）。
