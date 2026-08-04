# Requirements — live E2E Phase 2

Intent: `260804-live-e2e-phase2`  
入力正本: [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717)  
要件回答: [requirements-analysis-questions.md](requirements-analysis-questions.md)

## Intent分析

本Intentの目的は、Phase 1で確立済みの共通live E2E policy/lifecycleを弱めず、Kimi Codeのprint transportとKiro CLIのACP/TUI transportへ段階展開することである。利用者価値は、実CLI・実モデル・実認証を使う高コストかつ非決定的な検証を、明示opt-in、GitHub Actions hard deny、認証・設定隔離、確実なcleanup、機械可読な結果分類の内側で安全に再実行できることにある。

上流の [intent-statement.md](../../ideation/intent-capture/intent-statement.md) と [scope-document.md](../../ideation/scope-definition/scope-document.md) は、Kimiを必須接続対象、Kiro CLI ACP/TUIをtransportごとの「直接接続または条件付き後続Issue」対象としている。Brownfield調査の [business-overview.md](../../../../../codekb/amadeus/business-overview.md)、[architecture.md](../../../../../codekb/amadeus/architecture.md)、[code-structure.md](../../../../../codekb/amadeus/code-structure.md) は、共通kernelとlegacy driverが既に存在し、Kimi/Kiroが共通registry、環境allowlist、cleanup barrier、canonical outcome、ledgerへ未接続であることを示す。

要求種別はBrownfield self-feature、複雑度はStandardである。新しいtransport統一や共通抽象の再設計ではなく、既存の `tests/harness/live-e2e/` portへ個別adapterを接続する。

## 機能要件

| ID | 優先度 | 要件 | 受け入れ基準 | 由来 |
|---|---|---|---|---|
| FR-01 | Must | Kimi print、Kiro ACP、Kiro TUIをtransport単位の能力として共通live E2E registryで表現する | registry/projectorの決定的テストで各transportの状態と最終live green SHAを一意に投影できる | Scope M6、CodeKB architecture |
| FR-02 | Must | Kimi adapterはbinary、version、配布物、認証前提をpreflightする | fake executable/distを使うintegration testで各不足条件がcanonical SKIPとなり、live processが起動しない | Scope M1/M2 |
| FR-03 | Must | Kimi adapterは一時projectと一時`KIMI_CODE_HOME`を準備し、認証をコピーせず短命bindingとして利用する | testでsource credentialのコピーがなく、symlink/bindingがresource台帳へ登録される | Intent metric 1、CodeKB architecture |
| FR-04 | Must | Kimi child environmentは宣言済みallowlistから新規構築する | ambient sensitive keyとsource auth/config pathを注入したnegative testでchildへ到達せず、違反注入時は赤になる | Issue共通contract、Scope M2 |
| FR-05 | Must | Kimi adapterは`kimi -p`を短い決定的journeyで実行し、exitとbounded anchorを取得する | モデル文面の完全一致に依存せず、exit codeと指定anchorでPASS/FAILを判定できる | Scope M1/M3 |
| FR-06 | Must | Kimiが作成したchild、credential binding、一時home、一時projectをcleanupする | success/failure/timeoutの各testで全resourceが回収され、残存時はPASSにならない | Scope M1、CodeKB architecture |
| FR-07 | Must | Kimi adapterへ共通contract testとadapter integration testを適用する | opt-in、CI deny、env隔離、skip code、失敗分類、cleanupの全contract caseがgreenになる | Scope M2 |
| FR-08 | Must | Kimiのlocal opt-in live journeyを1本greenにする | 実CLI・実モデルでgreenとなり、adapter、CLI version、実行SHA、時刻、canonical outcomeを台帳へ記録する | Scope M3 |
| FR-09 | Must | Kiro ACP/TUIをそれぞれ独立に実測する | 各transportについて起動/終了経路、認証・設定binding、child env、決定的anchor、cleanup、配布面の証拠を記録する | Scope M4 |
| FR-10 | Must | Kiro ACP/TUIはそれぞれ「直接接続」または「条件付き後続Issue」のどちらかで完了する | capability matrixの各行がconnectedまたはfollow-up-linkedとなり、measured-only/unknownで残らない | Scope M5、Issue #1717 |
| FR-11 | Must | 直接接続するKiro transportは共通`LiveAdapter` portへ適合する | adapterが共通preflight→prepare→execute→assert→cleanup順序で実行され、legacy側から共通kernelへの逆依存を作らない | CodeKB architecture/code-structure |
| FR-12 | Must | 直接接続するKiro transportは認証・設定・child envをambient homeから隔離する | source home/config pathとsensitive keyの漏洩注入testが赤になり、正常testでは宣言keyだけがchildへ渡る | Scope quality boundary |
| FR-13 | Must | 直接接続するKiro transportごとにadapter integration testと共通contract testを適用する | ACP/TUIそれぞれのconnected判定について全contract caseがgreenになる | Q1回答 A |
| FR-14 | Must | 直接接続するKiro transportごとにlocal opt-in live journeyを1本greenにする | ACP/TUIのconnected各行に、そのtransport自身の実CLI・実モデルgreen receiptが存在する | Q1回答 A |
| FR-15 | Must | 直接接続できないKiro transportは検証可能な後続Issueへ接続する | Issueに阻害要因、実測証拠、推奨seam、再開条件、検証可能な受け入れ条件があり、#1717とcapability matrixからlinkされる | Scope M5 |
| FR-16 | Must | exact opt-inがない場合は対象live processを起動しない | opt-in未設定、空、`0`、`true`等のtestでspawn/lease/scratch準備が0回となりcanonical SKIPを返す | Issue共通contract |
| FR-17 | Must | `GITHUB_ACTIONS=true`はopt-inより優先してhard denyする | opt-in=`1`との同時注入testでもspawn/lease/scratch準備が0回となりcanonical CI-deny SKIPを返す | Scope quality boundary |
| FR-18 | Must | skip、timeout、実失敗、成功を閉じたcanonical taxonomyで返す | contract testが未知codeを拒否し、各failure injectionの分類とassertion実文を機械判別できる | Intent metric 5 |
| FR-19 | Must | journeyごとに明示timeoutと限定retry policyを持つ | timeoutがBun既定や内部待機予算と同値衝突せず、既定retry 0、負荷起因と判定した場合のみ最大1回である | Issue時間契約 |
| FR-20 | Must | live journeyを直列実行し、cleanup barrier後だけPASS receiptを追記する | 並列起動が拒否または直列化され、cleanup failure時にPASS ledger行が生成されない | Issueコスト契約、CodeKB architecture |
| FR-21 | Must | capability matrixと軽量ledgerをPhase 2証跡として更新する | Kimi/Kiro各transportに状態、最終live green SHAまたはfollow-up Issue、実行条件が追跡可能に記録される | Scope M6 |
| FR-22 | Must | 保守者向けに実行契機と再実行手順を文書化する | 対象配布面を変更したIntentの完了前に該当journeyをローカル実行する条件、opt-in、認証前提、skip診断が記載される | Issue運用サイクル |

## 非機能要件

| ID | 品質属性 | 要件 | 合否基準 | 由来 |
|---|---|---|---|---|
| NFR-01 | Security | raw credential、API key、source auth/config pathをchild出力・ledger・診断へ保存しない | fixture secretとsource pathの走査が全成果物・receipt・bounded outputで0件 | Scope quality boundary |
| NFR-02 | Reliability | resource cleanupは冪等で、部分準備・失敗・timeoutでも全resourceを回収する | cleanupの二重実行と各failure point注入が成功し、子孫process、symlink、tmux、一時dirが残らない | CodeKB architecture |
| NFR-03 | Testability | 課金live実行なしでpolicyとadapter境界を決定的に検証できる | fake executable/dist/clock/resourceを使うunit・integration testが通常CIでgreenになる | Issue共通contract |
| NFR-04 | Maintainability | transport固有知識をadapter内へ閉じ込め、共通kernelへCLI別条件分岐を増殖させない | reviewで共通portへの依存方向を守り、巨大なharness switchやlegacy driver importがない | Issue設計方針 |
| NFR-05 | Safety | 共通contractをKimi/Kiro都合で弱体化しない | 既存Codex/Claude/Pi contract testがgreenで、既存canonical codeやCI denyの緩和差分がない | Scope W5/W7 |
| NFR-06 | Cost | live journeyは短い1〜数promptで直列実行し、課金実行をexact opt-in内に限定する | journey定義と実行logからprompt数、直列性、gate通過を確認できる | Issueコスト契約 |
| NFR-07 | Observability | 診断は原因究明に必要なbounded evidenceを保ち、raw transcriptを保存しない | outcomeにadapter、phase、code、exit、bounded digest/anchorがあり、full output/raw promptがない | Scope Should |
| NFR-08 | Reproducibility | receiptを実行revision・CLI version・adapter identityへ結び付ける | ledger schema validationで必須provenance欠落を拒否し、matrixの最終green SHAと照合できる | Scope M6 |

## 制約

- Bun-only TypeScript monorepoであり、正本は `packages/framework/core/`、`packages/framework/harness/`、`tests/harness/` に置く。生成された `dist/` やself-install投影をコミットしない。
- 共通化対象はpolicy/lifecycleであり、起動コマンド、transport、認証方式、設定隔離、出力・終了条件はadapterへ残す。
- live testは通常のGitHub Actionsで起動しない。CIではfakeを使う決定的testのみ実行する。
- Kiro CLIはACP/TUIを独立transportとして扱う。片方のgreenをもう片方のlive証拠として代用しない。
- 後続Issueの作成・linkは、直接接続できないことを実測したtransportだけに限定する。
- 数値timeoutは実測または既存契約から導き、推定を無注記で受け入れ基準にしない。

## 前提

- Phase 1の共通live E2E kernelとPhase 1.5のPi対応は再利用可能な基準線であり、本Intentで再実装しない。
- ローカル環境にはKimi CodeとKiro CLIが導入済みだが、認証・設定bindingがscratch環境で再利用できるかはtransportごとの実測対象である。
- Kimiのcredential symlink方式はコピー回避に使えるが、短命resourceとして明示管理できることを直接接続の条件とする。
- Kiro ACPは構造化anchorの第一候補だが、ACP優先はTUIの完了条件を緩和しない。

## 対象外

- Kiro IDEのGUI/CDP検証およびCLIからのKiro.app操作。
- Cursor、OpenCodeとIssue #1717 Phase 3。
- Codex、Claude Code、Piの再実装。ただし回帰testはNFR-05の対象である。
- transportの単一方式への統一、モデル出力の完全一致、通常CIでのlive起動。
- Mustを遅らせる追加journey、補助診断、troubleshooting拡張。

## 未解決事項

- Kiro CLI 2.13.0で、ACP/TUIそれぞれがsource auth/config pathをchildへ露出せず認証を再利用できる正式seam。
- ACP停止時に子孫processまで確実にreapできるか、TUIのtmux shellをscratch home/envへ閉じ込められるか。
- 実測後、各Kiro transportがFR-11〜FR-14を満たして直接接続できるか、FR-15へ分岐するか。

これらは要件の曖昧さではなく、要件が定めた二択を決めるための実測事項である。共通contractを弱めて解消してはならない。

## 追跡性

| 上流 | 要件 |
|---|---|
| Scope M1〜M3 | FR-02〜FR-08、NFR-01〜NFR-03 |
| Scope M4〜M5 | FR-09〜FR-15、NFR-02、NFR-04 |
| Scope M6 | FR-01、FR-21、FR-22、NFR-07〜NFR-08 |
| Issue #1717 共通contract | FR-16〜FR-20、NFR-01〜NFR-06 |
| Requirements Q1=A | FR-13〜FR-15、Kiro transport独立完了制約 |


## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-04T09:40:16Z
- **Iteration:** 1
- **Scope decision:** none

Intent・Scope・Q1の決定が30件のFR/NFRへ追跡され、KimiとKiro各transportの実装または条件付き後続Issue、共通安全契約、live証拠、回帰保護が開発・QAとも判定可能な粒度で定義されています。対象外と未確定の実測事項も明確に分離されており、着手を妨げる欠落や矛盾はありません。

### Findings

- None
