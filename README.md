# websocket-connection

Raw wrapper around native WebSocket API for better control. Provides some additional features, such as:

1. <b>Ping-pong</b>
2. <b>Reconnection</b>

## Usage example:

```ts
const connection = new WebSocketConnection({
  origin: 'YOUR_ORIGIN',
  options: {
    // By default connection already has some predefined options.
    // If you want to override them - write them here.
    binaryType: YOUR_TYPE
    // etc
  }
  handlers: {
    // All handlers are optional.
    onClose: (closeEvent) => {},
    onError: (errorEvent) => {},
    onMessage: (responseData, socketEvent) => {
        // Do something with response data
        // For example save to Store or update UI based on new data
    },
    onOpen: (socketEvent) => {},
    onReconnect: () => {},
    onReconnectFail: () => {}
  },
})

// Open connection
connection
  .open()
  .then((socketEvent) => {
    // do something after open
  })
  .finally(() => {
    // ...
  })

// Sending something via connection
connection.send(JSON.stringify({ some_key: 'test' }))

// Closing connection
connection.close().then(() => {
  // do something after connection closed
})
```

You can find all available props inside source/*.data.ts file.