function isDisabled(value: string | undefined): boolean {
  if (!value) return false;
  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
}

export const features = {
  complaintsEnabled: !isDisabled(
    process.env.NEXT_PUBLIC_DISABLE_COMPLAINTS
  ),
  itTicketsEnabled: !isDisabled(
    process.env.NEXT_PUBLIC_DISABLE_IT_TICKETS
  ),
  maintenanceTicketsEnabled: !isDisabled(
    process.env.NEXT_PUBLIC_DISABLE_MAINTENANCE_TICKETS
  ),
};

export const ticketsEnabled =
  features.itTicketsEnabled || features.maintenanceTicketsEnabled;
