# 1. Setup  ----
import os
import sys
import logging
from pathlib import Path

APP_NAME = "DataPipeline"
VERSION = "1.0.0"
ROOT_DIR = Path(__file__).parent

## 1.1 Dependencies  ----
import pandas as pd
import numpy as np
import requests
from sqlalchemy import create_engine
import boto3
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

## 1.2 Secrets -----
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///default.db')
API_KEY = os.getenv('API_KEY', 'your-api-key-here')
AWS_ACCESS_KEY = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
S3_BUCKET = os.getenv('S3_BUCKET', 'data-pipeline-bucket')

required_secrets = ['DATABASE_URL', 'API_KEY']
for secret in required_secrets:
    if not os.getenv(secret):
        logger.warning(f"Missing required secret: {secret}")

# 2. Pipelines -----
class DataPipeline:
    def __init__(self, name: str):
        self.name = name
        self.engine = create_engine(DATABASE_URL)
        self.s3_client = boto3.client('s3') if AWS_ACCESS_KEY else None
        logger.info(f"Initialized pipeline: {name}")
    
    def extract_data(self, source: str) -> pd.DataFrame:
        """Extract data from various sources"""
        if source.startswith('http'):
            headers = {'Authorization': f'Bearer {API_KEY}'}
            response = requests.get(source, headers=headers)
            data = response.json()
            return pd.DataFrame(data)
        elif source.endswith('.csv'):
            return pd.read_csv(source)
        elif source.startswith('sql://'):
            query = source.replace('sql://', '')
            return pd.read_sql(query, self.engine)
        else:
            raise ValueError(f"Unsupported source type: {source}")
    
    def transform_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply data transformations"""
        df = df.dropna()
        df.columns = df.columns.str.lower().str.replace(' ', '_')
        df['processed_at'] = pd.Timestamp.now()
        df['pipeline_name'] = self.name
        logger.info(f"Transformed {len(df)} rows")
        return df
    
    def load_data(self, df: pd.DataFrame, destination: str):
        """Load data to destination"""
        if destination.startswith('s3://'):
            bucket = destination.replace('s3://', '').split('/')[0]
            key = '/'.join(destination.replace('s3://', '').split('/')[1:])
            df.to_parquet(f'/tmp/{key}')
            self.s3_client.upload_file(f'/tmp/{key}', bucket, key)
        elif destination.endswith('.csv'):
            df.to_csv(destination, index=False)
        else:
            table_name = destination.replace('table://', '')
            df.to_sql(table_name, self.engine, if_exists='append', index=False)
        
        logger.info(f"Loaded data to: {destination}")

def run_pipeline(config: dict):
    """Execute a complete ETL pipeline"""
    pipeline = DataPipeline(config['name'])
    
    raw_data = pipeline.extract_data(config['source'])
    logger.info(f"Extracted {len(raw_data)} rows from {config['source']}")
    
    clean_data = pipeline.transform_data(raw_data)
    logger.info(f"Transformation complete")
    
    pipeline.load_data(clean_data, config['destination'])
    logger.info(f"Pipeline {config['name']} completed successfully")

# 3. Deploy ----
def main():
    """Main deployment function"""
    print(f"🚀 Starting {APP_NAME} v{VERSION}")
    
    pipelines = [
        {
            'name': 'user_data_pipeline',
            'source': 'https://api.example.com/users',
            'destination': 'table://users'
        },
        {
            'name': 'sales_data_pipeline', 
            'source': '/data/sales.csv',
            'destination': 's3://analytics/sales/processed.parquet'
        },
        {
            'name': 'analytics_pipeline',
            'source': 'sql://SELECT * FROM transactions WHERE date >= CURRENT_DATE - 7',
            'destination': '/exports/weekly_analytics.csv'
        }
    ]
    
    for config in pipelines:
        try:
            run_pipeline(config)

if __name__ == "__main__":
    main()