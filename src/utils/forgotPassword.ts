import 'dotenv/config';
import dynamodb from '../config/dynamodb.js';
import bcrypt from 'bcrypt';

export const getUserPrimaryKeyByEmail = async (email: string) => {
  const queryParams = {
    TableName: 'notebookusers',
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    },
    Limit: 1,
  };

  try {
    const result = await dynamodb.query(queryParams);
    if (result.Items?.length === 0) {
      return null;
    }

    return result.Items && result.Items[0].username;
  } catch (error) {
    console.error('Error querying user by email:', error);
    throw new Error('Error querying user by email');
  }
};

export const storeResetToken = async (email: string, resetToken: string, resetTokenExpiry: number) => {
  const username = await getUserPrimaryKeyByEmail(email);

  const updateParams = {
    TableName: 'notebookusers',
    Key: { username },
    UpdateExpression: 'set resetToken = :r, resetTokenExpiry = :t',
    ExpressionAttributeValues: {
      ':r': resetToken,
      ':t': resetTokenExpiry,
    },
  };
  try {
    await dynamodb.update(updateParams);
  } catch (error) {
    console.error('Error storing reset token:', error);
    throw new Error('Could not store reset token');
  }
};

export const getUserByResetToken = async (resetToken: string) => {
  const scanParams = {
    TableName: 'notebookusers',
    FilterExpression: 'attribute_exists(resetToken) and attribute_exists(resetTokenExpiry)',
  };

  try {
    const scanResult = await dynamodb.scan(scanParams);
    for (let item of scanResult.Items ?? []) {
      const user = item;
      if (user.resetToken && await bcrypt.compare(resetToken, user.resetToken)) {
        return user;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching user by reset token:', error);
    throw new Error('Error fetching user by reset token');
  }
};
