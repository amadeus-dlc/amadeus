# Logical Components — U5 completeness-sensor

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Components

| Component | Responsibility |
|---|---|
| `ModelMapReader` | canonical schema parse |
| `SafeFileReader` | containment、fd検証、size制限 |
| `CompletenessEvaluator` | hash比較とstable findings |
| `ModelMapUpdater` | identity gateとatomic publish |
| sensor adapter | dispatcher verdict/auditへ写像 |

## Boundaries

- 依存方向はsensor adapter → ModelMapReader → SafeFileReader → CompletenessEvaluatorで、update CLI → ModelMapUpdater → SafeFileReaderとする。Evaluator/ReaderからadapterやUpdaterへの逆依存を禁止する。
- 共有資源はread-only model-map、model/cfg、実装fileとworkspace lockである。file I/OはSafeFileReader、map writeとlockはUpdaterだけが所有する。

## Failure domains and blast radius

- Reader failureは当該sensor fireをFAILEDにし、file読込を開始しない。SafeFileReaderの単一entry failureはそのpathのfindingへ封じ、他entryも検査する。
- Evaluator failureは当該fireのverdictだけへ波及し、mapや実装を変更しない。Updater failureは旧mapを保持し、sensor adapterからUpdaterを呼べないことでcheck中のwriteを隔離する。
- mapは全entryの共有資源なのでschema破損時は全体FAILEDとするが、dispatcherの他sensorやcore graphへは波及させない。
