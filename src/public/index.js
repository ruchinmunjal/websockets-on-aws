// MDN WebSocket documentation
// https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

const socket = new WebSocket('wss://qsr2p7233l.execute-api.eu-west-2.amazonaws.com/production/')

socket.addEventListener('open', e => {
  console.log('WebSocket is connected')
})

socket.addEventListener('close', e => console.log('WebSocket is closed'))

socket.addEventListener('error', e => console.error('WebSocket is in error', e))

socket.addEventListener('message', e => {
  // console.log('WebSocket received a message:', e)
  console.log('Your answer is:', JSON.parse(e.data).message)
})

document.querySelector('button.primary')[0].addEventListener('click',e=>{
  window.ask('Get data for the filter');
})
window.ask = function (msg) {
  const payload = {
    action: 'data',
    msg
  }
  socket.send(JSON.stringify(payload))
}