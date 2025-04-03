/**
 * Discord Webhook Signal Sender
 * Sends trading signals to Discord via webhooks
 * https://discordjs.guide/popular-topics/embeds.html#embed-preview
 */

/**
 * Sends a signal to Discord via webhook
 * @param {Object} payload - The Discord webhook payload
 * @param {string} webhookUrl - The Discord webhook URL
 * @returns {Promise} - Promise resolving to the response from Discord
 */
async function send_signal(payload, webhookUrl) {
  // Validate inputs
  if (!payload || !webhookUrl) {
    console.error("Missing payload or webhook URL");
    return Promise.reject(new Error("Missing payload or webhook URL"));
  }
  
  // Rate limiting protection
  const now = Date.now();
  if (send_signal.lastSent && now - send_signal.lastSent < 1000) {
    // Wait to avoid rate limits (more than 1 request per second)
    const waitTime = 1000 - (now - send_signal.lastSent);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  try {
    // Send the webhook request
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    
    // Check for successful response
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} ${response.statusText} - ${errorData}`);
    }
    
    // Update last sent timestamp
    send_signal.lastSent = Date.now();
    
    // Log success
    console.log(`Signal sent to Discord webhook: ${payload.embeds?.[0]?.title || 'Unknown'}`);
    
    return response;
  } catch (error) {
    console.error("Error sending Discord webhook:", error);
    throw error; // Re-throw for caller to handle
  }
}

// Initialize static property for rate limiting
send_signal.lastSent = 0;
  
export default send_signal;