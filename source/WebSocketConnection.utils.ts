export const isConnectionClosed = (socket: WebSocket) => {
  const isConnectionHasDeadStatus =
    socket.readyState === WebSocket.CLOSED ||
    socket.readyState === WebSocket.CLOSING

  return isConnectionHasDeadStatus
}
