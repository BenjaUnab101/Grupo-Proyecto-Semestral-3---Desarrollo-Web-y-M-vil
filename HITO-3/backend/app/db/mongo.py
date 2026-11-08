from functools import lru_cache
from pymongo import MongoClient
from app.core.config import settings


@lru_cache
def get_mongo_client() -> MongoClient:
    return MongoClient(settings.mongodb_url, serverSelectionTimeoutMS=2500)


# HU-21: los comunicados pasaron a PostgreSQL. MongoDB guarda la bitácora de cambios
# (quién creó, editó o eliminó cada comunicado y qué cambió).
def get_bitacora_comunicados_collection():
    return get_mongo_client()[settings.mongodb_database]["bitacora_comunicados"]
