// Data model for semantic annotation
class SemanticAnnotation {
  summary string
  purpose string
  complexity string
  domain string[]
  keywords string[]
  dependencies string[]
  performance_impact string
  maintainability float
  testability float
  technical_debt float
}

// Function to extract semantic annotation from code or text
function ExtractSemanticAnnotation(content: string) -> SemanticAnnotation {
  client "openai/gpt-4o"
  prompt #"
Analyze the following code or text and provide a semantic annotation as a JSON object with the following fields:
- summary
- purpose
- complexity (low, medium, high)
- domain (array of strings)
- keywords (array)
- dependencies (array)
- performance_impact (critical, high, normal, low)
- maintainability (0-1)
- testability (0-1)
- technical_debt (0-1)

Content:
{content}
"#
}