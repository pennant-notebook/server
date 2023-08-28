import 'dotenv/config';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import dynamodb from '../config/dynamodb.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { username, password, provider } = req.body;

  let params;
  if (provider === 'google' || provider === 'github') {
    params = {
      TableName: 'notebookusers',
      Item: {
        userID: uuidv4(),
        username,
        provider
      }
    };
  } else {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    params = {
      TableName: 'notebookusers',
      Item: {
        userID: uuidv4(),
        username,
        hashedPassword
      }
    };
  }

  try {
    await dynamodb.put(params);
    const token = jwt.sign({ userID: params.Item.userID }, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });
    res.cookie('pennantAccessToken', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    res.json({ ...params.Item, token });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Could not create user' });
  }
});

router.post('/signin', async (req, res) => {
  const { username, password } = req.body;

  const userParams = {
    TableName: 'notebookusers',
    Key: { username }
  };

  try {
    const userData = await dynamodb.get(userParams);
    if (!userData.Item) {
      res.status(401).json({ error: 'Invalid username or password' });
    } else {
      const isValidPassword = await bcrypt.compare(password, userData.Item.hashedPassword);
      if (isValidPassword) {
        const token = jwt.sign({ userID: userData.Item.userID }, process.env.JWT_SECRET, {
          expiresIn: '24h'
        });
        res.cookie('pennantAccessToken', token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });

        res.json({ ...userData.Item, token });
      } else {
        res.status(401).json({ error: 'Invalid password' });
      }
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Could not fetch user' });
  }
});

router.get('/getAccessToken', async (req, res) => {
  const params =
    '?client_id=' +
    process.env.GITHUB_CLIENT_ID +
    '&client_secret=' +
    process.env.GITHUB_CLIENT_SECRET +
    '&code=' +
    req.query.code;
  await fetch('https://github.com/login/oauth/access_token' + params, {
    method: 'POST',
    headers: {
      Accept: 'application/json'
    }
  })
    .then(response => {
      return response.json();
    })
    .then(data => {
      res.cookie('pennantAccessToken', data.access_token, {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      res.json(data);
    });
});

router.get('/getUserData', async (req, res) => {
  req.get('Authorization');
  await fetch('https://api.github.com/user', {
    method: 'GET',
    headers: {
      Authorization: req.get('Authorization') // Bearer ACCESS TOKEN
    }
  })
    .then(response => {
      return response.json();
    })
    .then(data => {
      res.json(data);
    });
});

router.post('/checkUser', async (req, res) => {
  const { username, provider } = req.body;
  const userParams = {
    TableName: 'notebookusers',
    Key: { username }
  };

  const userData = await dynamodb.get(userParams);
  if (userData.Item) {
    res.json({ exists: true });
  } else {
    res.json({ exists: false });
  }
});

export default router;
