"""
LangGraph Agent Service — Runs an AI agent with spreadsheet tools
based on the user's configured API key and model choice.
"""

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from app.tools import ALL_TOOLS


def get_llm(provider: str, api_key: str, model: str = None):
    """Create an LLM instance based on the user's provider and API key."""
    if provider == "gemini":
        return ChatGoogleGenerativeAI(
            model=model or "gemini-2.0-flash",
            google_api_key=api_key,
            temperature=0,
        )
    elif provider == "openai":
        return ChatOpenAI(
            model=model or "gpt-4o-mini",
            api_key=api_key,
            temperature=0,
        )
    elif provider == "claude":
        # langchain_anthropic would be needed; fallback to openai-compatible
        return ChatOpenAI(
            model=model or "claude-sonnet-4-20250514",
            api_key=api_key,
            base_url="https://api.anthropic.com/v1",
            temperature=0,
        )
    else:
        raise ValueError(f"Unsupported provider: {provider}")


async def run_agent(
    provider: str,
    api_key: str,
    model: str,
    prompt: str,
    context_data: dict = None,
) -> dict:
    """
    Run the LangGraph ReAct agent with all spreadsheet tools.
    
    Args:
        provider: "gemini" | "openai" | "claude"
        api_key: User's personal API key
        model: Model name override
        prompt: The user's task description
        context_data: Optional { columns, data } to include as context
        
    Returns:
        { result: str, tool_calls: list }
    """
    llm = get_llm(provider, api_key, model)

    # Build the agent with all spreadsheet tools
    agent = create_react_agent(llm, ALL_TOOLS)

    # Build the input message with context
    messages = []
    if context_data:
        context_msg = (
            f"You have spreadsheet data with columns: {context_data.get('columns', [])}\n"
            f"Data has {len(context_data.get('data', []))} rows.\n"
            f"First 3 rows: {context_data.get('data', [])[:3]}\n\n"
        )
        messages.append({"role": "system", "content": context_msg})

    messages.append({"role": "user", "content": prompt})

    result = await agent.ainvoke({"messages": messages})

    # Extract final response
    final_messages = result.get("messages", [])
    final_content = final_messages[-1].content if final_messages else "No response"

    return {
        "result": final_content,
        "message_count": len(final_messages),
    }
