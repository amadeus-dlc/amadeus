# Reliability Requirements — u001-engine-installer（260705-engine-installer）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[business-rules.md](../functional-design/business-rules.md)

## 要求

| ID | 要求 | 根拠 |
|---|---|---|
| REL-1 | 再実行は冪等に収束する（全置換対象・symlink・マージのすべて） | FR-1.8、受け入れ条件 3 |
| REL-2 | エラー中断は衝突対象を無傷に保ち、原因解消後の再実行で回復できる（ロールバック機構は作らない） | FR-1.8、BR-4 |
| REL-3 | 失敗は無言にしない: すべてのエラーは対象 path + 原因 + fix 案内を stderr に出し、exit 1 で機械判別できる | interaction-spec、Construction ガードレール（Error Handling） |
| REL-4 | スモークの検査対象は必ずインストール先である（実行元の誤検査 = 偽陽性を排除） | BR-14、FR-2.12 |

## 検証

- REL-1 = FR-2.3（2 回実行の収束）。
- REL-2 = FR-2.9（衝突対象の無傷 + 再実行収束）。
- REL-3 = FR-2.9 / FR-2.10 の stderr・exit code 検査（今回の requirements 追記で「対象 path・原因・fix 案内の存在」を検証項目に含めた）。
- REL-4 = FR-2.12（偽陽性回帰）。

可用性 SLO・監視は不適用（単発 CLI、Right-Sizing）。
