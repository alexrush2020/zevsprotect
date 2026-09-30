import { getSiteContacts } from "@/lib/server/catalog";
import { ContactsView } from "./contacts-view";

export default async function ContactsPage() {
  return <ContactsView contacts={await getSiteContacts()} />;
}
