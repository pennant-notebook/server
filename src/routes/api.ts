import { ReturnValue } from '@aws-sdk/client-dynamodb';
import { UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import dynamodb from '../config/dynamodb.js';
const router = express.Router();

interface MyUpdateCommandInput extends Omit<UpdateCommandInput, 'ReturnValues'> {
  ReturnValues: 'UPDATED_NEW' | 'ALL_NEW' | 'ALL_OLD' | 'UPDATED_OLD' | 'NONE';
}

// createUserInDynamo
router.post('/user', async (req, res) => {
  const id = uuidv4();
  const email = req.body.email;
  const defaultUsername = email.split('@')[0];


  const params = {
    TableName: 'notebookusers',
    Item: {
      userID: id,
      username: defaultUsername,
      email: email
    }
  };
  try {
    await dynamodb.put(params);
    res.json(params.Item);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Could not create user' });
  }
});

// fetchUserFromDynamo
router.get('/user', async (req, res) => {
  const { email, username } = req.query;

  let userParams;
  if (email) {
    // Query the GSI if email is provided
    userParams = {
      TableName: 'notebookusers',
      IndexName: 'email-index', // Name of your GSI
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    };

    try {
      const result = await dynamodb.query(userParams);
      if (result.Items?.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(result.Items && result.Items[0]);
    } catch (error) {
      console.error('Error querying user by email:', error);
      res.status(500).json({ error: 'Could not query user' });
    }

  } else if (username) {
    // Get from the main table if username is provided
    userParams = {
      TableName: 'notebookusers',
      Key: {
        username: username
      }
    };

    try {
      const result = await dynamodb.get(userParams)
      if (!result.Item) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(result.Item);
    } catch (error) {
      console.error('Error fetching user by username:', error);
      res.status(500).json({ error: 'Could not fetch user' });
    }

  } else {
    return res.status(400).json({ error: 'Email or username is required' });
  }
});

// Update username
router.put('/user/username', async (req, res) => {
  const { userID, newUsername } = req.body;

  if (!userID || !newUsername) {
    return res.status(400).json({ error: 'UserID and new username are required' });
  }

  const updateParams = {
    TableName: 'notebookusers',
    Key: { userID: userID },
    UpdateExpression: 'set username = :newUsername',
    ExpressionAttributeValues: {
      ':newUsername': newUsername
    },
    ReturnValues: 'UPDATED_NEW' as ReturnValue
  };

  try {
    const command = new UpdateCommand(updateParams);
    const result = await dynamodb.send(command);
    res.json(result.Attributes);
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({ error: 'Could not update username' });
  }
});

// fetchNotebooksFromDynamo
router.get('/user/:username/notebooks', async (req, res) => {
  const notebooksParams = {
    TableName: 'notebooks',
    FilterExpression: 'username = :username',
    ExpressionAttributeValues: {
      ':username': req.params.username
    }
  };

  try {
    const notebooksData = await dynamodb.scan(notebooksParams);
    res.json(notebooksData.Items || []);
  } catch (error) {
    console.error(`Error fetching notebooks for user ${req.params.username}:`, error);
    res.status(500).json({ error: 'Could not fetch notebooks' });
  }
});

// fetchDocFromDynamo
router.get('/doc/:docID/:username', async (req, res) => {
  const params = {
    TableName: 'notebooks',
    Key: {
      docID: req.params.docID,
      username: req.params.username
    }
  };

  try {
    const data = await dynamodb.get(params);
    if (!data.Item) {
      res.status(404).json({ error: 'Notebook not found' });
    } else {
      res.json(data.Item);
    }
  } catch (error) {
    console.error(`Error fetching notebook ${req.params.docID}:`, error);
    res.status(500).json({ error: 'Could not fetch notebook' });
  }
});

// createDocInDynamo
router.post('/doc/:username', async (req, res) => {
  console.log(req.body)
  const newDocId = uuidv4();
  const language = req.body.language;

  // Fetch the userID of the given username
  const userParams = {
    TableName: 'notebookusers',
    Key: {
      username: req.params.username
    }
  };

  let userID;
  try {
    const user = await dynamodb.get(userParams);
    if (!user.Item) {
      return res.status(404).json({ error: 'User not found' });
    }
    userID = user.Item.userID;
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Could not fetch user' });
  }

  const params = {
    TableName: 'notebooks',
    Item: {
      docID: newDocId,
      username: req.params.username,
      userID: userID,
      language: language,
    }
  };

  try {
    await dynamodb.put(params);
    res.json(params.Item);
  } catch (error) {
    console.error('Error creating notebook:', error);
    res.status(500).json({ error: 'Could not create notebook' });
  }
});

// editDocTitleInDynamo
router.put('/doc/:docID/:username', async (req, res) => {
  if (!req.body.title) {
    return res.status(400).json({ error: 'Missing title' });
  }
  const params: MyUpdateCommandInput = {
    TableName: 'notebooks',
    Key: {
      docID: req.params.docID,
      username: req.params.username
    },
    UpdateExpression: 'set title = :title',
    ExpressionAttributeValues: {
      ':title': req.body.title
    },
    ReturnValues: 'UPDATED_NEW'
  };

  const command = new UpdateCommand(params);

  try {
    const data = await dynamodb.send(command);
    if (data.Attributes) {
      res.json(data.Attributes);
    } else {
      res.status(200).json({ message: 'Update successful, no data returned' });
    }
  } catch (error) {
    console.error(`Error updating notebook ${req.params.docID}:`, error);
    res.status(500).json({ error: 'Could not update notebook' });
  }
});

// deleteDocFromDynamo
router.delete('/doc/:docID/:username', async (req, res) => {
  const params = {
    TableName: 'notebooks',
    Key: {
      docID: req.params.docID,
      username: req.params.username
    }
  };

  try {
    await dynamodb.delete(params);
    res.status(200).json({ message: 'Notebook deleted' });
  } catch (error) {
    console.error(`Error deleting notebook ${req.params.docID}:`, error);
    res.status(500).json({ error: 'Could not delete notebook' });
  }
});

export default router;
