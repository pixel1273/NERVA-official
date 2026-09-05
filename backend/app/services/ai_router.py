# import os
# from litellm import Router
# from dotenv import load_dotenv

# load_dotenv()

# # Define your available models and their respective API keys
# model_list = [
#     {
#         "model_name": "primary-analyst",
#         "litellm_params": {
#             "model": "gpt-4o",
#             "api_key": os.getenv("OPENAI_API_KEY")
#         }
#     },
#     {
#         "model_name": "primary-analyst", # Same alias, acts as a fallback
#         "litellm_params": {
#             "model": "gemini/gemini-1.5-pro",
#             "api_key": os.getenv("GEMINI_API_KEY")
#         }
#     },
#     {
#         "model_name": "fast-analyst",
#         "litellm_params": {
#             "model": "gemini/gemini-1.5-flash",
#             "api_key": os.getenv("GEMINI_API_KEY")
#         }
#     }
# ]

# # Initialize the router
# ai_router = Router(
#     model_list=model_list, 
#     fallbacks=[{"primary-analyst": ["gemini/gemini-1.5-pro"]}]
# )

# async def analyze_incident(incident_text: str) -> str:
#     """
#     Extract severity from this report using the AI router.
#     """
#     messages = [{"role": "user", "content": f"Extract severity from this report: {incident_text}"}]
    
#     # The router will try GPT-4o first. If it fails, it routes to Gemini 1.5 Pro.
#     response = await ai_router.acompletion(
#         model="primary-analyst",
#         messages=messages
#     )
#     return response.choices[0].message.content

# async def translate_alert(text: str, target_language: str) -> str:
#     """
#     Translate an alert into a target language using the AI router.
#     """
#     messages = [
#         {"role": "system", "content": f"You are a crisis alert translator. Translate to {target_language}."},
#         {"role": "user", "content": text}
#     ]
    
#     response = await ai_router.acompletion(
#         model="primary-analyst",
#         messages=messages
#     )
#     return response.choices[0].message.content
