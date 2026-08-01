# Security Design — u4-tools-distribution

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 信頼境界

- manifest 検証: parseTools は expectRelPath(絶対パス・.. 拒否)+tools/ 配下限定(business-logic-model.md M1)— 配布元の path traversal を構造遮断。
- digest 面: ownedContentDigests が stages+tools を全数被覆(M2)— drop 時の drift 検出が改竄・手編集を fail-closed で拒否(M3)。
- 一括 compose は検出済み実在ツリーのみ対象(M4・domain-entities.md E3)— 任意パスへの書込面を作らない。

## 検証劇場の回避

digest 拡張の落ちる実証(BR-U4-3 — stages のみ算出へ戻した変種で drop 拒否)を必須とする。
