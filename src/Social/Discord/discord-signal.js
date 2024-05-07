// https://discordjs.guide/popular-topics/embeds.html#embed-preview

function send_signal(payload, webhookUrl) {
  fetch(webhookUrl, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  })
}
  
  export default send_signal;