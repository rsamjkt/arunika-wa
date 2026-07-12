/** Substitutes {nama}/{nomor} placeholders — shared by Broadcast
 * campaigns and Inbox canned replies so both use identical rules. */
export function substituteVariables(body: string, recipient: { chatId: string; name?: string }): string {
  const digits = recipient.chatId.replace(/\D/g, "");
  return body.replace(/\{nama\}/g, recipient.name || "Pelanggan").replace(/\{nomor\}/g, digits);
}
