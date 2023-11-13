import 'dotenv/config';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import dynamodb from '../config/dynamodb.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { storeResetToken, getUserByResetToken } from '../utils/forgotPassword.js';

const router = express.Router();

const URL_HOST = process.env.NODE_ENV === 'production' ? 'https://trypennant.com' : 'http://localhost:3000'
const transporter = nodemailer.createTransport({
  host: 'smtp.fastmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

router.post('/forgot-password', async (req, res) => {
  const email = req.body.email;
  console.log(URL_HOST)


  if (typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const resetToken = crypto.randomBytes(20).toString('hex');
  const resetTokenExpiry = Date.now() + 3600000; // 1 hour
  const hashedResetToken = await bcrypt.hash(resetToken, 10);

  try {
    await storeResetToken(email, hashedResetToken, resetTokenExpiry);

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Password Reset',
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
        Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:\n\n
        ${URL_HOST}/reset-password/${resetToken}\n\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Send mail error:', error);
        res.status(500).json({ error: 'Error sending password reset email' });
      } else {
        res.status(200).json({ message: 'An e-mail has been sent to ' + email + ' with further instructions.' });
      }
    });
  } catch (error) {
    console.error('Error during password reset process:', error);
    res.status(500).json({ error: 'Error during password reset process' });
  }
});


router.post('/reset-password/:resetToken', async (req, res) => {
  const resetToken = req.params.resetToken;
  const newPassword = req.body.newPassword;

  if (typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'New password is required' });
  }

  try {
    const user = await getUserByResetToken(resetToken);

    if (!user || !user.resetTokenExpiry) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (Date.now() > user.resetTokenExpiry) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    const updateParams = {
      TableName: 'notebookusers',
      Key: { username: user.username },
      UpdateExpression: 'set hashedPassword = :p remove resetToken, resetTokenExpiry',
      ExpressionAttributeValues: {
        ':p': hashedNewPassword,
      },
    };

    await dynamodb.update(updateParams);

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Error resetting password' });
  }
});



router.post('/signup', async (req, res) => {
  const { username, email, password, provider } = req.body;
  console.log("EMAIL SIGNUP: ", email)
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
    const defaultUsername = email.split('@')[0];
    params = {
      TableName: 'notebookusers',
      Item: {
        userID: uuidv4(),
        username: defaultUsername,
        email,
        hashedPassword
      }
    };
  }

  try {
    await dynamodb.put(params);
    const token = jwt.sign({ userID: params.Item.userID }, process.env.JWT_SECRET!, {
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
  const { identifier, password } = req.body;

  try {
    let userData;
    if (identifier.includes('@')) {
      console.log("Fetching by email:", identifier);

      // Query using GSI for email
      const queryCommand = new QueryCommand({
        TableName: 'notebookusers',
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': identifier }
      });

      const queryResult = await dynamodb.send(queryCommand);
      if (queryResult.Items?.length === 0) {
        return res.status(401).json({ error: 'Invalid username/email or password' });
      }
      userData = queryResult.Items && queryResult.Items[0];

    } else {
      console.log("Fetching by username:", identifier);

      // Get using username as the primary key
      const getCommand = new GetCommand({
        TableName: 'notebookusers',
        Key: { username: identifier }
      });

      console.log(getCommand)

      const getResult = await dynamodb.send(getCommand);
      if (!getResult.Item) {
        return res.status(401).json({ error: 'Invalid username/email or password' });
      }
      userData = getResult.Item;
    }

    if (!userData || !userData.hashedPassword) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, userData.hashedPassword);
    console.log("USER DATA: ", userData)
    if (isValidPassword) {
      console.log("USER DATA: ", userData.Item)
      const token = jwt.sign({ userID: userData.userID }, process.env.JWT_SECRET!, {
        expiresIn: '24h'
      });
      res.cookie('pennantAccessToken', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });

      res.json({ ...userData, token });
    } else {
      res.status(401).json({ error: 'Invalid password' });
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
        httpOnly: true,
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
      Authorization: req.get('Authorization') as string // Bearer ACCESS TOKEN
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
