export const isConnectionClosed = (socket: WebSocket) => {
  const isConnectionHasDeadStatus =
    socket.readyState === WebSocket.CLOSED ||
    socket.readyState === WebSocket.CLOSING

  return isConnectionHasDeadStatus
}

export const calculateReconnectDelay = (attempt: number): number => {
  return Math.min(1000 * Math.pow(2, attempt), 30000); 
}