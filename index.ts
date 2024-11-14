import * as dotenv from 'dotenv';
import express from 'express';
import bodyParser  from 'body-parser';
import { handleZoomWebhook } from './src/zoomWebhookHandler.ts';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('OK');
});

// Webhook endpoint for Zoom events
app.post('/openai', handleZoomWebhook);

app.listen(port, () => console.log(`Zoom for Team Chat listening on port ${port}!`));
