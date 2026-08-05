# Logical Components — `stop-question-carveout` NFR Design(#2253)

上流入力(consumes 全数): business-logic-model.md(present — 述語契約・呼び出し点割当・データフローの依拠元)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は scope の SKIP により設計上不在(questions ヘッダの負方向解決を参照)。

本 Unit の論理コンポーネントは 2 つ+障害ドメイン 1 つで全数である(questions D4)。

---

## コンポーネント台帳

| # | コンポーネント | 所在(編集正本) | 責務 | 障害ドメイン |
| --- | --- | --- | --- | --- |
| LC-1 | 述語 2 本 | `packages/framework/core/hooks/amadeus-stop.ts` — 既存名保存の `isFullyAutonomousIntent`(意味論完全同値・無改変)+新設 `isQuestionCarveoutIntent(stateContent, resolvedProjectDir?)`(export、in-process 駆動可能) | full 限定判定(現行)と質問 carve-out 判定(semi human-command + full)。両者 catch → false(保守側) | stop hook プロセス内 |
| LC-2 | `:422` の 1 行差し替え | 同ファイル `isPendingQuestionStop` 内 | tier-2 質問 carve-out の判定を新述語へ切り替え(本 intent の唯一の開放点)。`:457` / `:716` は無改変 | 同上 |

## 障害ドメインと blast radius

- **障害ドメイン**: stop hook プロセス(毎ターン起動・読み取り判定)1 つ。engine・監査 journal と書込面を共有しない(述語は読むだけ)。
- **blast radius**(方向別に層別): **誤って carve-out を与えない側**(false 側の欠陥)は従来挙動への縮退 — stop が許可され人間が介入する(安全・現行と同一)。**誤って carve-out を与える側**(true 側の欠陥)の最大影響は「質問 pending の走行継続」だが、その質問の裁定自体は core Unit の認可基体+梯子が別プロセス境界で検査するため、carve-out 単独では無認可の裁定を作れない。cap(`AUTONOMOUS_BLOCK_CAP = 8`)が暴走の上限として独立に残る(FR-STOP-2 不変)。
- **隔離戦略**: 新述語は export して t445(unit)で in-process 駆動(spawn 盲点回避 — FD D6)。実 FS(projection)を使うケースは t121 拡張(integration 層)。

## 共有資源

| 資源 | 共有相手 | 競合の扱い |
| --- | --- | --- |
| state ファイル+autonomy projection(読み取り) | engine・他 hooks | 読み取りのみ・追加書込なし。読取失敗は catch → false(carve-out を与えない保守側) |
| `tests/.coverage-patch-allowlist.json` | 全 PR の patch gate | 改名なし(既存名保存 — FD D2)のため同期は行シフトの機械 remap(U-6)のみ。エントリ実測: `:5268`(function 行)・エントリ `:5265-5275`(FD で verbatim 実測済み) |

## インフラ非該当の明記

circuit breaker / cache / pooling / scaling / failover は**すべて非適用**(1 行理由): 毎ターン起動の読み取り述語であり常駐負荷・外部依存が存在しない(`cid:nfr-design:c1`、questions D2)。信頼性は閉じた判定表・保守側縮退・cap 不変の決定的機構で担保する。

## 適用 NFR との対応(検証手段付き)

- **NFR-1**(FR-STOP-1 維持側の面): security-design.md Q2/Q3 の落ちる実証(無条件共有化 → 赤)。
- **NFR-4**: t445(unit)・t121 拡張(integration)を Red 先行で追加。FR-PIN-2 の反転は C11 変更と同一 PR。
- **NFR-5**: 編集正本 1 ファイル(+テスト 2 ファイル)、`bun run build` 後の追跡ファイル不変。
- **NFR-7**: PR CI ブロッキング集合の全通過(allowlist remap は `cid:code-generation:c1-allowlist-mechanical-remap` の手順に従う)。
- **NFR-2 / NFR-3 / NFR-6**: 非適用(security-design.md の分類表 — 本 Unit は読み取り述語のみで、裁定生成・parser・provenance 受理を持たない)。
