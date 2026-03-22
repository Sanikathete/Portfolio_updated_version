from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from django.conf import settings

def get_stock_answer(question: str) -> str:
    llm = ChatOpenAI(
        model="gpt-3.5-turbo",
        openai_api_key=settings.OPENAI_API_KEY,
        temperature=0.7
    )
    
    messages = [
        SystemMessage(content="""You are StockSphere AI assistant. 
        You help users with stock market questions, portfolio analysis, 
        investment advice and financial queries. 
        Keep responses concise and helpful."""),
        HumanMessage(content=question)
    ]
    
    response = llm.invoke(messages)
    return response.content
