# Zoom Chatbot Powered by OpenAI


# What the Chatbot does?


## Prerequisites

Before you can use this chatbot, you'll need the following:

- Node.js (version 12 or later)
- A Zoom account 
- An OpenAI Account

## Setup


## Configuration

You need to set up your environment variables. Create a `.env` file in the project root and add the following variables:

- ZOOM_CLIENT_ID=
- ZOOM_CLIENT_SECRET=
- ZOOM_BOT_JID=
- ZOOM_WEBHOOK_SECRET_TOKEN=
- ZOOM_VERIFICATION_CODE=
- OPENAU_API_KEY=


To obtain these variables:

- For Zoom variables (ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_BOT_JID, ZOOM_WEBHOOK_SECRET_TOKEN, ZOOM_VERIFICATION_CODE), refer to the [Zoom App Marketplace guide on creating a Team Chat app](https://developers.zoom.us/docs/team-chat-apps/create/).

## Running the Application

To start the application:

npm run start

The application will run on `http://localhost:4000/` by default, but you can set a different port by changing the `PORT` variable in your `.env` file.

## Usage

- In your Zoom Team Chat App's Credentials section, go to the Local Test or Submit page depending on which environment you are using (Development or Production), and click "Add". 
- After authorizing, you will be taken to Zoom Team Chat and see a message from the Zoom-OpenAI-Chatbot: <br />
"Greetings from Zoom-OpenAI-Chatbot Bot!"
