# Pennant-Server

This repository contains the Node/Express webserver and DynamoDB API routes/controllers for the pennant-notebook project.

## Getting Started

### Prerequisites

Ensure you have a `.env` file set up in your project root. You can use the `.env.example` file in the repository as a template. Copy it and rename to `.env`, then fill in the necessary environment variables.

### Installation

1. Clone the repository:

```bash
git clone https://github.com/pennant-notebook/server.git
```

2. Navigate to the project directory:

```bash
cd server
```

3. Install the necessary npm packages:

```bash
npm install
```

### Running the Server

#### Development

For development purposes, you can run the server using the following command which will enable hot-reloading:

```bash
npm run dev
```

#### Production

Before deploying the server in a production environment, build the project using the following command:

```bash
npm run build
```

After building the project, start the server using:

```bash
npm start
```

This will start the server using the built files in the dist directory.

## API Documentation

### DynamoDB Tables

#### `notebookusers`

| Field          | Type        |
| -------------- | ----------- |
| `username`     | string      |
| `hashedPassword` | string      |
| `provider`     | string      |
| `userID`       | UUID string |

- **Partition key:** `username`
- **Provider options:** `google`, `github`, `username`, or `null` 
  (used only in auth flow – see `auth.js` for more details)

#### `notebooks`

| Field      | Type        |
| ---------- | ----------- |
| `username` | string      |
| `title`    | string      |
| `docID`    | UUID string |

- **Partition key:** `docID` (String)
- **Sort key:** `username` (String)

### API Endpoints

#### 1. `fetchUser`

- **Endpoint:** `GET /api/user/:username`
- **Description:** Fetches a user from the `notebookusers` table.

#### 2. `createUser`

- **Endpoint:** `POST /api/user/:username`
- **Description:** Creates a new user in the `notebookusers` table.

#### 3. `fetchNotebooks`

- **Endpoint:** `GET /api/user/:username/notebooks`
- **Description:** Fetches all notebooks for a given user from the `notebooks` table.

#### 4. `fetchDoc`

- **Endpoint:** `GET /api/doc/:docID/:username`
- **Description:** Fetches a notebook with a given `docID` and `username` from the `notebooks` table.

#### 5. `createDoc`

- **Endpoint:** `POST /api/doc/:username`
- **Description:** Creates a new notebook for a given `username` in the `notebooks` table.

#### 6. `editDocTitle`

- **Endpoint:** `PUT /api/doc/:docID/:username`
- **Description:** Edits the title for a notebook for a given `docID` in the `notebooks` table.
- **Request Body:** Expects a JSON object containing the new title as a `title` property (e.g., `{ "title": "New Title Here" }`).


