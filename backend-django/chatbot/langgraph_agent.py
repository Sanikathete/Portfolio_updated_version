from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from typing import TypedDict, List
from django.conf import settings

class AgentState(TypedDict):
    question: str
    messages: List
    answer: str
    agent_type: str

def route_question(state):
    question = state["question"].lower()
    if any(word in question for word in ["price", "stock", "share", "market"]):
        return "stock_agent"
    elif any(word in question for word in ["portfolio", "invest", "buy", "sell"]):
        return "portfolio_agent"
    else:
        return "general_agent"

def stock_agent(state):
    llm = ChatGroq(model="llama-3.3-70b-versatile", groq_api_key=settings.GROQ_API_KEY)
    response = llm.invoke([SystemMessage(content="You are a stock market expert."), HumanMessage(content=state["question"])])
    return {**state, "answer": response.content, "agent_type": "stock_agent"}

def portfolio_agent(state):
    llm = ChatGroq(model="llama-3.3-70b-versatile", groq_api_key=settings.GROQ_API_KEY)
    response = llm.invoke([SystemMessage(content="You are a portfolio management expert."), HumanMessage(content=state["question"])])
    return {**state, "answer": response.content, "agent_type": "portfolio_agent"}

def general_agent(state):
    llm = ChatGroq(model="llama-3.3-70b-versatile", groq_api_key=settings.GROQ_API_KEY)
    response = llm.invoke([SystemMessage(content="You are a financial assistant."), HumanMessage(content=state["question"])])
    return {**state, "answer": response.content, "agent_type": "general_agent"}

@tool
def find_similar_stocks(query: str) -> str:
    """Find stocks similar to the user's description using semantic search."""
    from chatbot.embeddings import get_similar_stocks
    results = get_similar_stocks(query, top_k=5)
    if not results:
        return "No similar stocks found."
    lines = [f"Stocks similar to '{query}':"]
    for r in results:
        score = f"(similarity: {r['similarity']})" if r.get("similarity") is not None else ""
        lines.append(f"  • {r['symbol']} — {r['name']} | {r.get('sector', '')} {score}".rstrip())
    return "\n".join(lines)

TOOLS = [find_similar_stocks]

def create_agent_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("stock_agent", stock_agent)
    workflow.add_node("portfolio_agent", portfolio_agent)
    workflow.add_node("general_agent", general_agent)
    workflow.set_conditional_entry_point(route_question, {"stock_agent": "stock_agent", "portfolio_agent": "portfolio_agent", "general_agent": "general_agent"})
    workflow.add_edge("stock_agent", END)
    workflow.add_edge("portfolio_agent", END)
    workflow.add_edge("general_agent", END)
    return workflow.compile()

def get_agent_answer(question):
    graph = create_agent_graph()
    result = graph.invoke({"question": question, "messages": [], "answer": "", "agent_type": ""})
    return {"answer": result["answer"], "agent_type": result["agent_type"]}
