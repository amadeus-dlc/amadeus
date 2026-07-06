# Scalability Design — u001-engine-installer（260705-engine-installer）

上流入力: [scalability-requirements.md](../nfr-requirements/scalability-requirements.md)

## 適用判断

不適用とする（scalability-requirements の確定どおり。単発ローカル CLI）。

## 拡張点の維持

manifest 定数への集約（FR-1.10）が唯一の拡張点であり、配布対象の増減はマニフェスト編集 + eval の一致検査（FR-2.5）だけで追従できる構造を保つ。
