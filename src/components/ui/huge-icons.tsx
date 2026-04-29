import { HugeiconsIcon, type HugeiconsIconProps, type IconSvgElement } from "@hugeicons/react";
import {
  Activity01Icon,
  AiBrain04Icon,
  AiChat02Icon,
  AlertCircleIcon,
  ArchiveIcon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  BarChartIcon,
  BookOpen01Icon,
  BrainIcon,
  Calendar03Icon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  Clock03Icon,
  Coins01Icon,
  Copy01Icon,
  CreditCardIcon,
  DashboardSpeed01Icon,
  DashboardSquare01Icon,
  Database01Icon,
  Delete02Icon,
  DollarCircleIcon,
  File01Icon,
  FileSearchIcon,
  FileStackIcon,
  FloppyDiskIcon,
  Globe02Icon,
  HelpCircleIcon,
  Image01Icon,
  InboxIcon,
  InformationCircleIcon,
  Key01Icon,
  Layers01Icon,
  LinkSquare01Icon,
  Loading03Icon,
  LockIcon,
  MailAdd01Icon,
  Menu01Icon,
  Message01Icon,
  MessageAdd01Icon,
  Notification01Icon,
  PackageIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusSignIcon,
  Route01Icon,
  Search01Icon,
  SearchRemoveIcon,
  SecurityLockIcon,
  Sent02Icon,
  Settings02Icon,
  Share02Icon,
  Shield01Icon,
  SlidersHorizontalIcon,
  SparklesIcon,
  Target01Icon,
  Tick02Icon,
  TickDouble01Icon,
  UserCheck01Icon,
  UserCircleIcon,
  UserGroupIcon,
  UserIcon,
  UserRemove01Icon,
  ZapIcon,
} from "@hugeicons/core-free-icons";

type AppIconProps = Omit<HugeiconsIconProps, "icon">;

function createIcon(icon: IconSvgElement) {
  function AppIcon({ size = 24, strokeWidth = 1.7, ...props }: AppIconProps) {
    return (
      <HugeiconsIcon
        icon={icon}
        size={size}
        strokeWidth={strokeWidth}
        color="currentColor"
        {...props}
      />
    );
  }

  return AppIcon;
}

export const Activity = createIcon(Activity01Icon);
export const AlertTriangle = createIcon(AlertCircleIcon);
export const Archive = createIcon(ArchiveIcon);
export const ArrowRight = createIcon(ArrowRight01Icon);
export const ArrowUpRight = createIcon(ArrowUpRight01Icon);
export const BarChart3 = createIcon(BarChartIcon);
export const Bell = createIcon(Notification01Icon);
export const BookOpen = createIcon(BookOpen01Icon);
export const Bot = createIcon(AiChat02Icon);
export const Boxes = createIcon(PackageIcon);
export const Brain = createIcon(BrainIcon);
export const BrainCircuit = createIcon(AiBrain04Icon);
export const CalendarDays = createIcon(Calendar03Icon);
export const Check = createIcon(Tick02Icon);
export const CheckCheck = createIcon(TickDouble01Icon);
export const CheckCircle2 = createIcon(CheckmarkCircle01Icon);
export const ChevronRight = createIcon(ArrowRight01Icon);
export const CircleAlert = createIcon(AlertCircleIcon);
export const CircleDollarSign = createIcon(DollarCircleIcon);
export const CircleUserRound = createIcon(UserCircleIcon);
export const Clock3 = createIcon(Clock03Icon);
export const Coins = createIcon(Coins01Icon);
export const Copy = createIcon(Copy01Icon);
export const CreditCard = createIcon(CreditCardIcon);
export const Database = createIcon(Database01Icon);
export const ExternalLink = createIcon(LinkSquare01Icon);
export const FileStack = createIcon(FileStackIcon);
export const FileText = createIcon(File01Icon);
export const Gauge = createIcon(DashboardSpeed01Icon);
export const Globe2 = createIcon(Globe02Icon);
export const HelpCircle = createIcon(HelpCircleIcon);
export const ImageIcon = createIcon(Image01Icon);
export const Inbox = createIcon(InboxIcon);
export const Info = createIcon(InformationCircleIcon);
export const KeyRound = createIcon(Key01Icon);
export const Layers3 = createIcon(Layers01Icon);
export const LayoutDashboard = createIcon(DashboardSquare01Icon);
export const Loader2 = createIcon(Loading03Icon);
export const Lock = createIcon(LockIcon);
export const LockKeyhole = createIcon(SecurityLockIcon);
export const MailPlus = createIcon(MailAdd01Icon);
export const Menu = createIcon(Menu01Icon);
export const MessageSquare = createIcon(Message01Icon);
export const MessageSquarePlus = createIcon(MessageAdd01Icon);
export const MessageSquareText = createIcon(Message01Icon);
export const PanelLeftClose = createIcon(PanelLeftCloseIcon);
export const PanelLeftOpen = createIcon(PanelLeftOpenIcon);
export const Plus = createIcon(PlusSignIcon);
export const Route = createIcon(Route01Icon);
export const Save = createIcon(FloppyDiskIcon);
export const Search = createIcon(Search01Icon);
export const SearchCheck = createIcon(FileSearchIcon);
export const SearchX = createIcon(SearchRemoveIcon);
export const SendHorizontal = createIcon(Sent02Icon);
export const Settings = createIcon(Settings02Icon);
export const Settings2 = createIcon(Settings02Icon);
export const Share2 = createIcon(Share02Icon);
export const Shield = createIcon(Shield01Icon);
export const ShieldCheck = createIcon(Shield01Icon);
export const SlidersHorizontal = createIcon(SlidersHorizontalIcon);
export const Sparkles = createIcon(SparklesIcon);
export const Target = createIcon(Target01Icon);
export const Trash2 = createIcon(Delete02Icon);
export const TriangleAlert = createIcon(AlertCircleIcon);
export const UserCheck = createIcon(UserCheck01Icon);
export const UserMinus = createIcon(UserRemove01Icon);
export const UserRound = createIcon(UserIcon);
export const UsersRound = createIcon(UserGroupIcon);
export const X = createIcon(Cancel01Icon);
export const XCircle = createIcon(CancelCircleIcon);
export const Zap = createIcon(ZapIcon);
