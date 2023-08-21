230705-2 - version 0.1.2-stable (branch) stable version with internal dredd execution engine plus engine reset button  
230705-1 - version 0.1.1-stable (branch) stable version with internal dredd execution engine  
230705-0 - version 0.1 This branch is deployed to latest.trypennant.com as pennantmvp2.fly.dev\*\*\*\*  

# Pennant-Webserver

This repository contains the Node/Express webserver and DynamoDB API routes/controllers for the pennant-notebook project.

## Getting Started

### Prerequisites

You will need to create a `.env` file with the following environment variables:

```env
DYNAMO_AWS_ACCESS_KEY_ID=<your aws dynamodb access key id>
DYNAMO_AWS_SECRET_ACCESS_KEY=<your aws dynamodb secret access key>
```

### Installation
Clone the repo

```bash
git clone https://github.com/pennant-notebook/webserver.git
```

Install NPM packages

```bash
npm install
```

### Usage
To start the server, run:

```bash
npm start
```

### Contributing
Contributions are welcome! Feel free to open an issue or submit a pull request.

### License
MIT License
