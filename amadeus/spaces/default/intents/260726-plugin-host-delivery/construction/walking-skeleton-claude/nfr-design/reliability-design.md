# 信頼性設計 — U2 walking-skeleton-claude

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## アトミック性(既存機構の参照 — 新設しない)

reliability-requirements「アトミック性」の実現機構は **既存 engine の applyPluginPlan(atomic tx)/ runRecovery をシグネチャ不変で移設したものをそのまま使う**(BR-U2-1 単一実装 — U2 で新しいトランザクション機構を設計しない)。設計上の U2 の責務は次の 2 点に限る:

- **移設の挙動不変の実証**: business-logic-model「engine 移設(C2)の実行順」のとおり、移設+import 消費側更新+既存 t252-254 green 確認を Bolt 先頭手順とする。既存 t253 系(compose 途中失敗時の host bytes / composition record / audit 不変)が移設後も同一テストで green であることが、アトミック契約の継承証明
- **失敗注入の網羅**: reliability-requirements 合否のとおり、compose の各段(discover / inspect / plan / apply / 再 compile)への失敗注入で呼出前 bytes との一致を実測する。注入は実行時に消費される行へ行う(inject-runtime-consumed-lines)

## 回復性と冪等再試行

reliability-requirements「回復性(recovery)と冪等再試行」のとおり、部分失敗 → 再 compose は runRecovery 経由で重複なく最新状態へ収束する(既存機構)。収束の判定基盤は scalability-requirements の冪等合否と同一の byte-identical 比較(scalability-design)を共有する。journal 残存状態の可視化(recovery-pending)は U5 doctor-observability の責務で、U2 は **書き手側の不変性**(途中失敗時に journal/DropsRecord/composition record が検証可能な状態で残ること)のみを保証する(reliability-requirements 合否「recovery 可視」の U2 分担)。

## fail-closed とサイレント失敗の禁止(typed failure の全段配線)

business-logic-model フロー 1 の「どの段でも typed failure → stderr 1 行 loud → exit 1」を、`PluginCliResult` / typed failure の判別 union で全段に配線する:

- 失敗分類は C1 契約の 4 類(discover 失敗 / trust 未 grant / plan 拒否 / apply 失敗+recovery 起動)を最小集合とし、各 variant が stderr 1 行文言を持つ(security-design の CliParseError = exit 2 とは exit code で区別)
- フック起動失敗は stderr 1 行警告+セッション継続(BR-U2-4 — security-requirements の fail-closed CLI 合否と同一機構。security-design の再掲であり二重設計しない)

## dist 同期による drift 防止

reliability-requirements「dist 同期による drift 防止」のとおり、正本変更(移設・CLI 新設・claude 投影・フック配線)は同一変更で `bun scripts/package.ts` / `bun run promote:self` を実行し、`dist:check` / `promote:self:check` green を合否とする(BR-U2-9)。performance-requirements の no-op 高速路が前提とする composition record(performance-design の判定入力)と dist 配布物の整合も、この決定的ガードが担保する(手動チェックリストで代替しない — project.md Forbidden)。
