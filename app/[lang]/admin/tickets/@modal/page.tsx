// A soft navigation to the list itself (e.g. the redirect after deleting a
// ticket from its panel) keeps whatever the slot showed last, unless the slot
// has a page for that URL too. This empty one closes the ticket's panel.
export default function NoTicketOpen() {
  return null;
}
