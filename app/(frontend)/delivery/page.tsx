import { getDeliveryContent } from "@/lib/server/catalog";
import { DeliveryView } from "./delivery-view";

export default async function DeliveryPage() {
  return <DeliveryView {...await getDeliveryContent()} />;
}
