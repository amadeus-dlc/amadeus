# セキュリティ設計 — U2 walking-skeleton-claude

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## fail-closed CLI パーサ設計(mutation 前拒否)

security-requirements「fail-closed CLI」合否(未知 verb・未知フラグ・余剰引数の mutation 不到達)を、`parsePluginCliArgs(argv): Result<PluginCliCommand, CliParseError>` の型設計で実装する(functional-domain-modeling-ts の判別 union Result):

- **受理集合を型で閉じる**: `PluginCliCommand` は `compose{ifStale, projectRoot} | doctor | drop{name} | status | usage` の判別 union。パーサは verb ごとの許容フラグ・引数個数を全列挙で照合し、列挙外は即 `CliParseError` を返す(余剰引数の無視・未知フラグの読み飛ばしという fail-open 分岐を持たない — C1 契約の「未知引数の無視は禁止」)
- **制御フロー上の位置**: business-logic-model フロー 1 のとおりパーサは先頭段で、`Err` は usage を stderr へ出して exit 2。discoverPlugins 以降(状態変更経路)へは `Ok` のみが到達する — parse-don't-validate により「検証済みコマンド」だけが本体シグネチャに乗る
- **落ちる実証**: `compose --help` / `drop a b` / 型不正フラグの注入ケースで、mutation 側 deps の呼出回数 0+exit 2 をテスト固定する(performance-design の到達カウンタ seam を拒否側でも再利用)

## 安全契約の維持(NFR-1 — 既存 engine の無改変継承、層別)

security-requirements「安全契約の維持」の 7 項目は、一枚岩の「構造的に安全」ではなくモジュール別に保証機構を分ける:

| 項目 | 保証機構(層) |
|---|---|
| trust grant / no-clobber | inspectPlugin(既存 engine、シグネチャ不変移設 — BR-U2-1 単一実装。CLI・フックは再実装しない) |
| atomic commit / recovery | applyPluginPlan / runRecovery(既存 engine — reliability-requirements のアトミック合否 / reliability-design 参照) |
| drift 保護 | 既存 drift ガード(dist:check / promote:self:check — reliability-design の dist 同期) |
| path escape 拒否・same-name stage 拒否・unknown sensor 拒否 | 既存 engine の plan / 再 compile 段(移設で挙動不変 — 既存 t252-254 green が実証) |
| claude 投影の出力先安全 | projectPluginForHarness の plan 段拒否(既存投影でない非空 dir / file / symlink outDir — ADR-5 の claude 面最小、全集合は U3) |
| 認可・監査面 | project.md Mandated の認可テスト群(directive contract / state transition / audit invariant / race / harness drift)で検証 |

## フック失敗の loud continue と実起動検証

- SessionStart フック(business-logic-model フロー 2)の失敗は stderr 1 行警告+セッション継続(BR-U2-4)。無音失敗経路を持たない — 警告文字列はテストで文字列 assert する
- security-requirements「実起動検証」のとおり、自動 compose は native hook の実起動テストで検証する(配線実在のみの検査は verification theatre として不合格)。テスト層配置は logical-components.md の E2E 行に固定

## 認証情報の非保持(N/A 継承)

security-requirements「認証情報の非保持」のとおり資格情報を扱う経路が存在せず、秘匿情報管理の設計は **N/A を継承** する。performance-requirements / scalability-requirements の非常駐前提とも整合し、常駐認可デーモン等は導入しない。
