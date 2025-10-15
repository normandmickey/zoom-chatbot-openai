import { Ragie } from "ragie";
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.RAGIE_API_KEY;
const id = "89191a1f-1709-4aa1-942a-2e29f0f3eca0";

const ragie = new Ragie({
  auth: apiKey
});

// Retrieve document status
(async () => {
  const document = await ragie.documents.get({
    documentId: id
  });

  console.log(document);
})();