# Delivery Plan — External Dependency Map

## 上流入力

外部依存の判定は`requirements-analysis/requirements.md`、`application-design/components.md`、`units-generation/unit-of-work.md`、`units-generation/unit-of-work-dependency.md`、`units-generation/unit-of-work-story-map.md`に基づく。`stories.md`、`mockups`、`team-practices`は対応stageがSKIPのため存在しない。

## Optional external verification items

| 外部item | Owner | Lead time | BlockするBolt / 境界 | Mitigation / workaround | Closure evidence |
|---|---|---|---|---|---|
| Claude Codeのcredential-attested native環境 | human principal / operator | 外部・未確定 | blockerではない | 利用可能時だけopt-in liveを実測 | revision / package digestへ束縛したsuccess receipt |
| Codexのcredential-attested native環境 | human principal / operator | 外部・未確定 | blockerではない | 同上 | 同上 |
| Cursorのcredential-attested native環境 | human principal / operator | 外部・未確定 | blockerではない | 同上 | 同上 |
| OpenCodeのcredential-attested native環境 | human principal / operator | 外部・未確定 | blockerではない | 同上 | 同上 |
| Kimi Codeのcredential-attested native環境 | human principal / operator | 外部・未確定 | blockerではない | 同上 | 同上 |
| live Judge / election provider capability | native harness environment | harness依存 | blockerではない | deterministic contractを常時hard gateにし、unsupported pathはloud degradationをreceiptへ記録 | authorization commit、provider/degradation、trace/attestationを含むreceipt |

5harnessのcredential、token、未redact evidenceはIntent recordへ保存しない。必要な環境が揃わない場合はliveを理由付きskipとし、passへ変換せず、Core Intentの進行は継続する。

## Repository内で解消するblocker

| Item | 扱い | Bolt |
|---|---|---|
| #2095 Loop Monitor | 本Intentが実装する内部blocker。外部依存ではない | U1 |
| #2096 Quality Repair Plugin | #2095後に本Intentが実装する内部blocker。外部依存ではない | U2 |
| #1717の現行5harness capability不足 | 必要なcapability sliceをU1/U5で吸収する。#1717全体完了は要求しない | U1 / U5 |

## 明示的にdependencyへしないもの

- GitHub PRの作成、review、merge。AI-DLC v2 CoreはPRを認識せず、外部integrationが後からgate承認へ接続できる疎結合な境界を保つ。
- 常駐runner、scheduler、supervisor。通常のharness起動からstructured parked stateをresumeできればよい。
- Kiro / Kiro IDEのlive対応。現行対象はClaude Code、Codex、Cursor、OpenCode、Kimi Codeである。
- #2065の外部Plugin manifest形式。Quality Repairはfirst-party embedded Pluginとして成立させる。
- #1241のhuman-in-the-loop supervisor behavior。完全自律modeの対象外であり、本Intentのblockerではない。
- 本番環境への不可逆操作や人間以外によるauthorization。

## Harness追加時の境界

将来のharness追加は、Core algorithmの分岐ではなくM08 single registryへのcapability row、native adapter、共通contract / opt-in live scenarioの追加で完結させる。現行5harness集合はU5のacceptance setであり、Coreの閉じた列挙型へ固定しない。
