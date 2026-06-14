import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import EventIcon from "@mui/icons-material/Event";
import DescriptionIcon from "@mui/icons-material/Description";
import PaymentsIcon from "@mui/icons-material/Payments";
import BoltIcon from "@mui/icons-material/Bolt";
import BadgeIcon from "@mui/icons-material/Badge";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import CloudIcon from "@mui/icons-material/Cloud";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CampaignIcon from "@mui/icons-material/Campaign";
import LoyaltyIcon from "@mui/icons-material/Loyalty";
import WorkIcon from "@mui/icons-material/Work";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import TelegramIcon from "@mui/icons-material/Telegram";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PeopleIcon from "@mui/icons-material/People";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import type { SvgIconComponent } from "@mui/icons-material";

export const SERVICE_ICONS: Record<string, SvgIconComponent> = {
  BusinessCenter: BusinessCenterIcon,
  Dashboard: DashboardIcon,
  ConfirmationNumber: ConfirmationNumberIcon,
  Event: EventIcon,
  Description: DescriptionIcon,
  Payments: PaymentsIcon,
  Bolt: BoltIcon,
  Badge: BadgeIcon,
  CreditCard: CreditCardIcon,
  FindInPage: FindInPageIcon,
  Cloud: CloudIcon,
  LocalShipping: LocalShippingIcon,
  Inventory2: Inventory2Icon,
  Campaign: CampaignIcon,
  Loyalty: LoyaltyIcon,
  Work: WorkIcon,
  DirectionsCar: DirectionsCarIcon,
  Telegram: TelegramIcon,
  MarkEmailRead: MarkEmailReadIcon,
  FlashOn: FlashOnIcon,
  TrendingUp: TrendingUpIcon,
  Analytics: AnalyticsIcon,
  AccountTree: AccountTreeIcon,
  AccountBalance: AccountBalanceIcon,
  People: PeopleIcon,
  LibraryBooks: LibraryBooksIcon,
};

export function getServiceIcon(name: string): SvgIconComponent {
  return SERVICE_ICONS[name] || BusinessCenterIcon;
}
