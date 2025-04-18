import axios from 'axios';

// Function to send message to Zoom using the chatbot token
async function sendChatToZoom(chatbotToken, question, message, payload) {
    const data = {
      'robot_jid': process.env.ZOOM_BOT_JID,
      'to_jid': payload.toJid,
      'user_jid': payload.toJid,
      'content': {
        'head': {
          'text': 'GPTSW: ' + question,
        },
        'body': [{
          'type': 'message',
          'text': message,
        }],
      },
    };
  
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + chatbotToken,
    };
  
    try {
      const response = await axios.post('https://api.zoom.us/v2/im/chat/messages', data, { headers });
      console.log('Successfully sent chat to Zoom.', response.data);
    } catch (error) {
      console.error('Error sending chat to Zoom.', error.response ? error.response.data : error);
    }
  }

export { sendChatToZoom };
