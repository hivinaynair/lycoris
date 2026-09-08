export function weatherAccessMessage(txHash: string) {
  return `Lycoris: unlock Melbourne weather report\nNetwork: Base Sepolia (84532)\nPayment: ${txHash.toLowerCase()}\nThis signature proves ownership of your payment. It does not authorize a transfer.`;
}
