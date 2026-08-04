# Pi Coding Agent対応 — External Dependency Map

## 外部依存一覧

| Dependency / gate | Owner | Lead time | Blocks | Mitigation / workaround |
|---|---|---:|---|---|
| `@earendil-works/pi-coding-agent` / Pi CLI 0.83.0以上 | maintainer / 検証環境 | 事前準備 | B1、B4、B6 | version probeでfail-closed。0.82.xはformal successにしない |
| Bun 1.3.13と既存repo dependencies | repository toolchain | 事前準備 | B1〜B6 | lockfileと既存test runnerを再利用 |
| 対象projectのtrust承認 | 人間 | 対話時 | B1、B3、B6 | 自動承認せずdoctorでremediation提示 |
| model provider / auth | 人間 / provider | 環境依存 | B1 live child、B6 formal live | deterministic fixtureは日常CIで実行。formal completionはliveをskip不可 |
| macOS / Linux実行環境 | maintainer / CI | runner待ち | B6 | OS別evidenceを分離。native Windowsはnegative assertion |
| Git接続とPi Package local/git source | maintainer / Git host | 数分〜ネットワーク障害解消 | B3、B6 | local fixtureでdeterministic検証し、formal evidenceではgit経路を省略しない |
| actual human TUI入力 | 人間 | gate時 | B1、B6 | RPC自動入力で代替しない。dogfood checklistとauditを記録 |

AWS、常駐service、database、外部API、npm publish credential、production deploymentは本Intentの依存ではない。release/tag/publishは既存手動workflowの境界に残す。

## Readiness条件

- B1開始前: Pi/Bun version、project trustの状態、provider readiness、空fixtureを確認する。
- B3開始前: B2 transaction testsがgreenで、local/git candidate projection sourceが確定している。
- B6開始前: macOS/Linux、Pi 0.83.0以上、provider/auth、人間TUI実施者、検証commitが揃っている。
- 外部依存が欠ける場合、fixtureによる日常CIは継続できるが、formal greenと正式対応完了は保留する。

## Ownershipとescalation

環境・credential・trust・TUI判断は人間owner、fixture、probe、redaction、loud failureは`amadeus-developer-agent` ownerである。credentialを成果物・audit・promptへ保存せず、home絶対pathをredactする。外部状態の待機を成功扱いに変換しない。

## 上流トレーサビリティ

`requirements`のPi version/OS/security/formal evidence条件、`components`のshort-lived CLI構成、`unit-of-work`のenvironment constraints、`unit-of-work-dependency`のblocked Bolt、`unit-of-work-story-map`のSCN-002/003/005/009を用いた。`stories`と`mockups`はscope上存在せず、`team-practices`のtrust、手動release、既存CI再利用を適用した。
