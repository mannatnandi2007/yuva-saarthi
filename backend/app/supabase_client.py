import os
from supabase import create_client, Client
from app.config import settings

def get_supabase_client() -> Client:
    url: str = settings.supabase_url
    key: str = settings.supabase_key
    
    if url == "https://placeholder.supabase.co" or key == "placeholder-key":
        # In a real environment, we'd raise an exception if env variables aren't set.
        # But for testing our skeleton, we can fallback to env vars or return a dummy client.
        url = os.environ.get("SUPABASE_URL", url)
        key = os.environ.get("SUPABASE_KEY", key)
        
    return create_client(url, key)

supabase = get_supabase_client()
