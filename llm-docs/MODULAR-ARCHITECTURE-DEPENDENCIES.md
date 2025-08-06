# Modular Architecture: Module Dependencies and Interactions

## Module Dependency Table

| Module         | Depends On                                      |
|----------------|-------------------------------------------------|
| API            | DB, Patterns, Telemetry, Providers, Pipeline, Utils, Config, Types |
| Ingestion      | DB, Patterns, Telemetry, Utils, Config, Types   |
| Learning       | Patterns, DB, Telemetry, Utils, Types           |
| Annotation     | Patterns, DB, Telemetry, Utils, Types           |
| Docs           | DB, Patterns, Utils, Types                      |
| DB             | Config, Types, Utils                            |
| Patterns       | (Data only; used by most modules)               |
| Telemetry      | DB, Utils, Config, Types                        |
| Testing        | API, DB, Telemetry, Utils, Types                |
| Types          | (Shared by all modules)                         |
| Utils          | (Shared by all modules)                         |
| Verification   | Patterns, DB, Types, Utils                      |
| Config         | (Shared by all modules)                         |
| Providers      | Config, Telemetry, Utils, Types                 |
| Pipeline       | API, DB, Patterns, Telemetry, Utils, Types      |
| Transformation | Patterns, Providers, Telemetry, Utils, Types    |
| Production     | Pipeline, Transformation, Telemetry, Utils, Config, Types |
| CLI            | API, Ingestion, Annotation, Docs, Production, Utils, Types |

## Mermaid Diagram

```mermaid
graph TD
  API --> DB
  API --> Patterns
  API --> Telemetry
  API --> Providers
  API --> Pipeline
  API --> Utils
  API --> Config
  API --> Types

  Ingestion --> DB
  Ingestion --> Patterns
  Ingestion --> Telemetry
  Ingestion --> Utils
  Ingestion --> Config
  Ingestion --> Types

  Learning --> Patterns
  Learning --> DB
  Learning --> Telemetry
  Learning --> Utils
  Learning --> Types

  Annotation --> Patterns
  Annotation --> DB
  Annotation --> Telemetry
  Annotation --> Utils
  Annotation --> Types

  Docs --> DB
  Docs --> Patterns
  Docs --> Utils
  Docs --> Types

  DB --> Config
  DB --> Types
  DB --> Utils

  Telemetry --> DB
  Telemetry --> Utils
  Telemetry --> Config
  Telemetry --> Types

  Testing --> API
  Testing --> DB
  Testing --> Telemetry
  Testing --> Utils
  Testing --> Types

  Verification --> Patterns
  Verification --> DB
  Verification --> Types
  Verification --> Utils

  Providers --> Config
  Providers --> Telemetry
  Providers --> Utils
  Providers --> Types

  Pipeline --> API
  Pipeline --> DB
  Pipeline --> Patterns
  Pipeline --> Telemetry
  Pipeline --> Utils
  Pipeline --> Types

  Transformation --> Patterns
  Transformation --> Providers
  Transformation --> Telemetry
  Transformation --> Utils
  Transformation --> Types

  Production --> Pipeline
  Production --> Transformation
  Production --> Telemetry
  Production --> Utils
  Production --> Config
  Production --> Types

  CLI --> API
  CLI --> Ingestion
  CLI --> Annotation
  CLI --> Docs
  CLI --> Production
  CLI --> Utils
  CLI --> Types

  Patterns -.-> Types
  Utils -.-> Types
  Config -.-> Types
```

- Solid arrows: direct dependencies
- Dashed arrows: shared foundational types/utilities

---
Next: summarize how this architecture supports loose coupling, testability, and extensibility.