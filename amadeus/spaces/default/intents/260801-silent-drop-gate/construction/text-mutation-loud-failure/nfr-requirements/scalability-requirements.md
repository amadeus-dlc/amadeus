# Scalability Requirements — text-mutation-loud-failure

## 上流入力

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とし、state documentとbulk targetの増加に対するcapacity契約を定義する。水平autoscalingやrequest concurrencyは非適用である。

## スケール軸

| 軸 | 記号 | 測定値 |
| --- | --- | --- |
| document規模 | `D` | input bytes |
| stage規模 | `S` | canonical stage line数 |
| transaction規模 | `T` | unique `slug + dimension` target数 |
| caller規模 | `C` | migration対象callsite数と未検査result数 |

## Capacity境界

- `L1` は32 stage／32 target／256 KiB以下、`L4` は128 stage／128 target／512 KiB以下、`L8` は256 stage／256 target／1 MiB以下の決定的synthetic state fixtureとする。
- `L1`／`L4`／`L8` の全fixtureで、canonical line identity、checkbox／suffix grammar、非対象projectionを同じ規則で生成する。
- `L8` のbulk success、末尾target not-found、duplicate-targetを各3回warmup後にwarm processで各10回測り、各回1秒以内、fixture読込後の `process.resourceUsage().maxRSS` から測定終了直後までの増分128 MiB以下とする。
- すべての規模でatomic writeは最大1回、失敗時は0回、永続audit／successはcommit後だけ、retry／resyncは0回とする。
- setter単体は `O(D + S)`、bulkは各step後reparseという上流契約を維持して `O(T × (D + S))` を明示上限とする。これを超えるtarget間総当たりや全中間document保持を導入しない。

## 拡張trigger

次のいずれかでcapacity reviewを行い、黙ってvalidationを減らさない。

1. canonical stage数が256、documentが1 MiB、単一transaction targetが256のいずれかを超える。
2. `L8` の最大latencyが1秒、またはpeak RSS増分が128 MiBを超える。
3. 新しいmutation dimension、state grammar、caller familyが追加される。
4. targetごとのphysical write、audit append、success emit、retry、resyncが提案される。
5. multi-writer／lock競合を本Unitで扱う必要が生じる。

## Scaling方針

- 第一選択はvalidated index、canonical target sort、original/current/candidateの最大3世代保持である。
- 各step後reparseとfinal reparseは安全性契約のため維持する。性能不足時もskip、sampling、first-match mutationへ変更しない。
- cache、parallel mutation、incremental parser、worker processは初期実装へ導入しない。
- 256 stageを超える実需要が確認された場合は、postconditionの同等性を証明できるtransactional parser設計を別scopeで検討する。
- 新しいcallerはsymbol inventoryへ追加し、result exhaustive checkとfailure call-count testを同一変更で追加する。

## 検証要件

- `tests/perf/t-no-silent-drop-text-mutation.test.ts` のseed固定generatorと `bun test --timeout 120000 tests/perf/t-no-silent-drop-text-mutation.test.ts` を正本とし、`L1`／`L4`／`L8` のdigest、bytes、stage数、target数、parse回数、write／audit／success回数、10試行のelapsed、Bun processのpeak RSS増分を記録する。
- not-foundをtarget列の先頭／中央／末尾へ配置しても、全中間content破棄とcanonical bytes不変が成立することを確認する。
- 同値／相反duplicate-targetを規模に関係なく適用前に拒否する。
- callsite inventoryで未検査 `TextMutationResult` が0件であることをstatic testで固定する。
- capacity超過を理由にwarning success、partial write、暗黙resyncへ縮退しない。
