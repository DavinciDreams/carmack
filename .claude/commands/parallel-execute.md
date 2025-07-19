---
description: Execute parallel tasks with multiple Task agents
allowed-tools: Task
argument-hint: [comma-separated subtasks or "track1: task1, track2: task2"]
---

Execute these parallel subtasks with maximum speed and efficiency: $ARGUMENTS

Spawn multiple Task agents in parallel, each with this prompt structure:

---

CRITICAL MISSION: High-speed parallel task execution

🎯 Overall Goal: Complete all assigned subtasks with maximum speed and accuracy while avoiding conflicts with other parallel work

🔍 Your Specific Subtask: [Assigned subtask from the list]

✅ Success Criteria:
- Complete your assigned task fully and correctly
- Ensure no conflicts with other parallel tracks
- Use tools efficiently - batch operations where possible
- Report clear, actionable results
- Fix all issues found, don't just report them

⚡ SPEED REQUIREMENT: Complete this task as quickly as possible. Time is critical. Don't overthink - just fix the issues systematically and move fast.

🛠️ Execution Guidelines:
- If searching: Use Grep/Glob tools aggressively in parallel
- If fixing: Batch similar fixes together
- If testing: Run tests early to catch issues
- Always verify your changes work

START IMMEDIATELY - Don't ask questions, don't seek clarification, just execute with confidence!

---

Each agent should work independently on their assigned track without waiting for others.