---
description: Complete parallel orchestration with all research-validated patterns
allowed-tools: exit_plan_mode, Task, TodoWrite, Read, Edit, MultiEdit
argument-hint: [complex multi-agent task]
---

## Research-Validated Parallel Orchestration System

Incorporating all empirically validated patterns from 2024-2025 research.

### Phase 1: Ultrathink Architecture Design

Use exit_plan_mode with ultrathink to architect: $ARGUMENTS

Your plan must include:

1. **Unified Orchestration Design**
   - Single prompt for all agents (40% better coordination)
   - Shared context architecture
   - Emergent protocol scaffolding

2. **Context Preservation Strategy**  
   - NO summarization (causes 40% information loss)
   - Layer-based selective retention
   - Dynamic pruning with recall ability

3. **Intermediate Specification**
   - MCP-style structured format
   - Validation checkpoints
   - Confidence calibration requirements

4. **Emergent Protocol Seeds**
   - Priority marking system (CRITICAL/HIGH/MEDIUM/LOW)
   - Confidence scoring (0-5 scale)
   - Allow flexible evolution

### Phase 2: Unified Agent Launch

Create ONE Task agent as orchestrator with this enhanced prompt:

```
UNIFIED ORCHESTRATION SYSTEM
===========================

You are the orchestrator for a multi-agent system. Create and manage subagents using the Opus V3 pattern.

ORCHESTRATION PROTOCOL:

1. AGENT INITIALIZATION
Create N subagents with this unified prompt:
"""
SHARED MISSION: [From plan]

AGENT ROLES:
[Dynamically assign based on needs]

COORDINATION PROTOCOL:
- Confidence scoring (0-5) on all outputs
- Priority marking: CRITICAL/HIGH/MEDIUM/LOW  
- Agent ID in all responses
- Reference other agents by ID
- Develop shorthand naturally

SHARED CONTEXT LAYERS:
Layer 1 (Core): [Never pruned objectives]
Layer 2 (Coordination): [Key signals and patterns]
Layer 3 (History): [Detailed interactions - prunable]

INTERMEDIATE FORMAT:
{
  "jsonrpc": "2.0",
  "method": "agent_handoff",
  "params": {
    "source": "agent_id",
    "target": "next_agent",
    "context": {
      "reasoning_chain": [],
      "completed_work": [],
      "open_questions": [],
      "confidence": 0-5,
      "priority": "HIGH/MEDIUM/LOW"
    }
  }
}
"""

2. CONTEXT MANAGEMENT
- Use selective retention, not summarization
- Preserve decision paths and reasoning chains
- Maintain semantic density scores
- Enable dynamic recall of pruned content

3. EMERGENT BEHAVIOR MONITORING
- Watch for natural protocol development
- Document emerging patterns
- Allow flexible problem-solving
- Measure coordination efficiency

4. VALIDATION CHECKPOINTS
- Verify intermediate completeness
- Check confidence calibration
- Validate evidence chains
- Prevent confident hallucinations

5. ORCHESTRATION LOOP
while not all_tasks_complete:
    - Collect agent outputs
    - Validate intermediates
    - Manage context layers
    - Coordinate handoffs
    - Adapt protocols
    - Check convergence

DELIVERABLES:
- Completed objectives
- Full reasoning documentation
- Emerged protocols catalog
- Performance metrics
```

### Phase 3: Human-in-the-Loop Integration

At key decision points:
1. Present structured intermediates for review
2. Enable context inspection at all layers
3. Allow protocol adjustments
4. Maintain full audit trail

### Why This Works:

- **Unified Prompts**: O(n) scaling vs O(n²) for individual prompting
- **No Summarization**: Preserves 95% task performance vs 60% with summaries
- **Structured Intermediates**: Prevents information loss at boundaries
- **Emergent Protocols**: More robust than pre-designed coordination
- **Layered Context**: Optimizes token usage without losing critical info

### Success Metrics:
- Coordination efficiency (messages per task)
- Information preservation ratio  
- Protocol emergence rate
- Task completion accuracy
- Confidence calibration score

This represents the state-of-the-art in parallel AI orchestration as of 2025.