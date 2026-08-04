# pi-doctor-diagnostics — Functional Design Questions

## 質問判定

質問は0件である。Issue #2130と承認済み`requirements`、`components`、`component-methods`、`services`、`unit-of-work`、`unit-of-work-story-map`により、Pi version、platform、Bun、trust、skills、extensions、package resources、subagent driverを独立したread-only checkとして診断し、0.83.0未満/native Windows/欠落resourceを正式successにしないことが確定している。

ユーザーの指示「Issueに書いていることは質問せず、矛盾と抜け漏れだけ質問する」に従う。Pi 0.83のtrust優先順位、`--approve`の一時override、resource layoutは公開仕様とharness manifestから導出でき、製品判断を要する矛盾・抜け漏れはない。

## 解決済み設計判断

| 論点 | 採用 | 根拠 |
|---|---|---|
| untrusted時の起動 | project-local resourceに依存しないdirect core/setup CLIから同じprobeを呼べる | untrusted projectではPiがproject skill/extensionをロードしない |
| trust正本 | native context factがあれば優先、direct CLIはclosest saved decisionとglobal defaultを観測 | Pi 0.83公開trust semantics |
| resource期待値 | authored Pi harness manifestからpackage時にcompileし、実行中doctor version/digestへ束縛したimmutable catalog | target側manifestとの自己整合passを防ぐ |
| version | 実際に解決したexecutableの`--version` stdoutをstrict parse | install path名と実行versionの不一致を誤判定しない |
| probe副作用 | offline、model/networkなし、project resource非load、filesystem write 0 | read-only doctor境界 |
| 他harness | Pi profileではCodex/Claude/Kimi固有checkを構成しない | FR-DOC-002 |

## 上流トレーサビリティ

`unit-of-work`のPi-only doctor ownership、`unit-of-work-story-map`のSCN-007〜009、`requirements`のFR-DOC-001〜003、`components`のPiDoctorChecks境界、`component-methods`の`probePiEnvironment`、`services`のread-only Doctor Invocationを用いた。
