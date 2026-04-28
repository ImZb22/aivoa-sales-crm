

import os, json, sqlite3
from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from langgraph.graph import StateGraph, END

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
client = Groq(api_key="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")

class InteractionState(BaseModel):
    message: str
    extracted_data: dict = {}
    suggestions: list = []

def sales_agent_node(state: InteractionState):
    current_date = datetime.now().strftime("%Y-%m-%d")
    # THE SALES PERSONA PROMPT
    prompt = f"""
    You are a Medical Sales CRM Assistant. Today's date is {current_date}.
    The user is a Sales Rep who just visited a Doctor (HCP).
    
    Task 1 (Extract): If this is a new log, extract details.
    Task 2 (Edit): If the user says "actually", "change", or "correct", update the existing data: {state.extracted_data}
    
    Data Schema:
    - hcpName: Name of the doctor.
    - topics: Medical products or diet plans discussed.
    - sentiment: MUST be 'Positive', 'Neutral', or 'Negative' based on the Sales Rep's success.
    - date: Use {current_date} if they say 'today'.
    - materials: Marketing brochures or samples left behind.
    
    Input: "{state.message}"
    Return ONLY JSON.
    """
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"}
    )
    state.extracted_data = json.loads(response.choices[0].message.content)
    return state

def follow_up_tool(state: InteractionState):
    # Tool 3: AI Suggested Sales Follow-ups
    state.suggestions = ["Email clinical trial data", "Schedule lunch-and-learn", "Check sample inventory"]
    return state

# LangGraph Construction
builder = StateGraph(InteractionState)
builder.add_node("agent", sales_agent_node)
builder.add_node("tools", follow_up_tool)
builder.set_entry_point("agent")
builder.add_edge("agent", "tools")
builder.add_edge("tools", END)
graph = builder.compile()

@app.post("/process-chat")
async def process(req: dict):
    inputs = InteractionState(message=req['message'], extracted_data=req.get('current_data', {}))
    result = graph.invoke(inputs)
    
    # Custom professional reply
    professional_reply = (
        "✅ **Interaction logged successfully!** The details (HCP Name, Date, Sentiment, and Materials) "
        "have been automatically populated based on your summary. Would you like me to suggest a "
        "specific follow-up action, such as scheduling a meeting?"
    )
    
    return {
        "data": result['extracted_data'], 
        "suggestions": result['suggestions'], 
        "reply": professional_reply
    }

@app.post("/save-interaction")
async def save_interaction(data: dict):
    conn = sqlite3.connect('crm_database.db')
    cursor = conn.cursor()
    
    # This creates the table if it doesn't exist
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS interactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hcpName TEXT,
            topics TEXT,
            sentiment TEXT,
            date TEXT,
            materials TEXT
        )
    ''')
    
    # This inserts the data from your frontend
    cursor.execute('''
        INSERT INTO interactions (hcpName, topics, sentiment, date, materials)
        VALUES (?, ?, ?, ?, ?)
    ''', (data.get('hcpName'), data.get('topics'), data.get('sentiment'), data.get('date'), data.get('materials')))
    
    conn.commit()
    conn.close()
    return {"status": "Sales Log Saved to Database!"}
