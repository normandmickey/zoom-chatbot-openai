# RAGBee

AI chatbot for Zoom Team Chat with websearch and RAG knowledge base.

## Overview

RAGBee chatbot integrates with Zoom Team Chat to provide AI powered responses with conversation memory. It features advanced capabilities including web search, knowledge base retrieval, and browser automation.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **LLM**: Groq (compound-mini model)
- **RAG**: Ragie knowledge base
- **State Management**: LangGraph with PostgreSQL checkpointing
- **Dependencies**: 
  - `@langchain/langgraph` for agent workflows
  - `@langchain/groq` for LLM integration
  - `ragie` for knowledge base retrieval
  - `pg` for PostgreSQL connection
  - `axios` for HTTP requests

## User Flow

1. **User sends message** in Zoom Team Chat to the bot
2. **Zoom webhook** delivers message to `/openai` endpoint
3. **Subscription check** determines user's tier and available features
4. **Context retrieval** (Premium only) fetches relevant information from Ragie knowledge base
5. **LLM processing** generates response using Groq with tier-appropriate tools enabled
6. **Conversation state** is saved to PostgreSQL via LangGraph checkpointing
7. **Response sent** back to user in Zoom chat with markdown formatting

## Subscription Tiers

| Tier | AI Chat | Web Search | Advanced Tools | RAG Knowledge Base |
|------|---------|------------|----------------|-------------------|
| Free | ✓ | | | |
| Standard | ✓ | ✓ | | |
| Premium | ✓ | ✓ | ✓ | ✓ |

## API Endpoints

### Webhooks
- `POST /openai` - Zoom webhook handler

### Admin
- `GET /admin/subscription/:userJid` - Get user subscription
- `PUT /admin/subscription/:userJid` - Update user subscription
- `GET /admin/tiers` - List all tiers
- `GET /admin/subscription/:userJid/features` - Get user features

### Health
- `GET /health` - Health check
- `GET /test` - API status

## Configuration

Key settings in `src/constants/settings.json`:
- App name, version, port
- Groq model and enabled tools
- Database pool configuration
- Logging configuration

System prompts in `src/constants/prompts.json`:
- Bot personality and behavior
- Response formatting rules
- Security instructions

## License

ISC
