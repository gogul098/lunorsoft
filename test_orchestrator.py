import sys
import asyncio
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from agent_orchestrator import AgentOrchestrator

async def main():
    orch = AgentOrchestrator()
    print("Testing Agent Orchestrator Stream...")
    step = 0
    async for event in orch.execute_cognitive_stream("A habit tracker with daily streaks and ring counters"):
        step += 1
        agent = event.get("agent", "Agent")
        etype = event.get("type", "event")
        content = event.get("content", "")
        # Safe ASCII representation for terminals
        safe_content = content.encode('ascii', errors='replace').decode('ascii')
        print(f"Step {step:02d}: [{agent}] ({etype}) -> {safe_content[:80]}")

    print("\nStream test completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
