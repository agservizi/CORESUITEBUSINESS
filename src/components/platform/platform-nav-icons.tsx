import type { ReactNode } from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import InsightsIcon from "@mui/icons-material/Insights";
import NotificationImportantIcon from "@mui/icons-material/NotificationImportant";
import ViewListIcon from "@mui/icons-material/ViewList";
import InboxIcon from "@mui/icons-material/Inbox";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import GavelIcon from "@mui/icons-material/Gavel";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import HistoryIcon from "@mui/icons-material/History";
import SimCardIcon from "@mui/icons-material/SimCard";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import CategoryIcon from "@mui/icons-material/Category";
import AssignmentIcon from "@mui/icons-material/Assignment";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AssessmentIcon from "@mui/icons-material/Assessment";
import SettingsIcon from "@mui/icons-material/Settings";
import PeopleIcon from "@mui/icons-material/People";
import CampaignIcon from "@mui/icons-material/Campaign";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import EventIcon from "@mui/icons-material/Event";
import BoltIcon from "@mui/icons-material/Bolt";
import BadgeIcon from "@mui/icons-material/Badge";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import CloudIcon from "@mui/icons-material/Cloud";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LoyaltyIcon from "@mui/icons-material/Loyalty";
import WorkIcon from "@mui/icons-material/Work";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import TelegramIcon from "@mui/icons-material/Telegram";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import HubIcon from "@mui/icons-material/Hub";
import AddIcon from "@mui/icons-material/Add";
import PendingActionsIcon from "@mui/icons-material/PendingActions";

const icon = (Icon: typeof DashboardIcon) => <Icon fontSize="small" />;

/** Icone sidebar per id voce nav (condivise tra tutti i servizi piattaforma). */
const PLATFORM_NAV_ICONS: Record<string, ReactNode> = {
  dashboard: icon(DashboardIcon),
  kpi: icon(InsightsIcon),
  alert: icon(NotificationImportantIcon),
  elenco: icon(ViewListIcon),
  aperti: icon(InboxIcon),
  calendario: icon(CalendarMonthIcon),
  caf: icon(ReceiptLongIcon),
  patronato: icon(GavelIcon),
  entrate: icon(TrendingUpIcon),
  uscite: icon(TrendingDownIcon),
  pos: icon(PointOfSaleIcon),
  vendite: icon(HistoryIcon),
  magazzino: icon(SimCardIcon),
  operatori: icon(SimCardIcon),
  offerte: icon(LocalOfferIcon),
  confronto: icon(CompareArrowsIcon),
  prodotti: icon(CategoryIcon),
  richieste: icon(AssignmentIcon),
  portale: icon(StorefrontIcon),
  report: icon(AssessmentIcon),
  impostazioni: icon(SettingsIcon),
  iscritti: icon(PeopleIcon),
  campagne: icon(CampaignIcon),
  // Alias utili per moduli generici
  ticket: icon(ConfirmationNumberIcon),
  appuntamenti: icon(EventIcon),
  contratti: icon(BoltIcon),
  anpr: icon(BadgeIcon),
  cie: icon(CreditCardIcon),
  pratiche: icon(FindInPageIcon),
  servizi: icon(CloudIcon),
  spedizioni: icon(LocalShippingIcon),
  pacchi: icon(Inventory2Icon),
  fedelta: icon(LoyaltyIcon),
  curriculum: icon(WorkIcon),
  aci: icon(DirectionsCarIcon),
  telegrammi: icon(TelegramIcon),
  pec: icon(MarkEmailReadIcon),
  opportunita: icon(TrendingFlatIcon),
  pipeline: icon(ViewKanbanIcon),
  vinte: icon(EmojiEventsIcon),
  collaboratori: icon(HubIcon),
  catalogo: icon(StorefrontIcon),
  giornata: icon(PointOfSaleIcon),
  nuovo: icon(AddIcon),
  scadenze: icon(PendingActionsIcon),
};

export function getPlatformNavIcon(navId: string): ReactNode {
  return PLATFORM_NAV_ICONS[navId] ?? icon(ViewListIcon);
}
