import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

if (!process.env.DYNAMO_AWS_ACCESS_KEY_ID || !process.env.DYNAMO_AWS_SECRET_ACCESS_KEY) {
  throw new Error('AWS credentials are not set in the environment variables');
}

export const dynamoClient = new DynamoDBClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.DYNAMO_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.DYNAMO_AWS_SECRET_ACCESS_KEY
  }
});

const dynamodb = DynamoDBDocument.from(dynamoClient);

export default dynamodb;
