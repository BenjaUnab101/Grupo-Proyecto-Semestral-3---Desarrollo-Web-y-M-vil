from functools import lru_cache
from pymongo import MongoClient
from app.core.config import settings


@lru_cache
def get_mongo_client() -> MongoClient:
    return MongoClient(settings.mongodb_url, serverSelectionTimeoutMS=2500)


def get_comunicados_collection():
    return get_mongo_client()[settings.mongodb_database]["comunicados"]
