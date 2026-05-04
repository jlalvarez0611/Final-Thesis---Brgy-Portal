import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Search } from 'lucide-react';
import {
  Activity,
  AlertCircle,
  Anchor,
  Award,
  Baby,
  BadgeCheck,
  Bandage,
  Bell,
  Bike,
  Building2,
  Bird,
  BookOpen,
  Briefcase,
  Bus,
  Cake,
  Calendar,
  Camera,
  Car,
  Cat,
  Church,
  ClipboardCheck,
  ClipboardList,
  Clapperboard,
  CloudRain,
  Coffee,
  Coins,
  Compass,
  Construction,
  Crown,
  Dices,
  Dog,
  DollarSign,
  Droplets,
  Dumbbell,
  Factory,
  FileText,
  Fish,
  Flag,
  Flame,
  Flower2,
  Gamepad2,
  Gavel,
  Gem,
  Gift,
  Globe,
  GraduationCap,
  Hammer,
  Handshake,
  HardHat,
  Heart,
  HeartHandshake,
  HeartPulse,
  Home,
  Hospital,
  HouseHeart,
  Info,
  Landmark,
  Leaf,
  Lightbulb,
  Map,
  MapPin,
  Medal,
  Megaphone,
  Mic,
  Microscope,
  Music,
  Navigation,
  Newspaper,
  Package,
  Paintbrush,
  Palette,
  Palmtree,
  PartyPopper,
  Pill,
  Plane,
  Recycle,
  Ribbon,
  Rocket,
  Rainbow,
  Scale,
  School,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Siren,
  Snowflake,
  Sparkles,
  Sprout,
  Star,
  Stethoscope,
  Store,
  Sun,
  Syringe,
  Target,
  Tent,
  TrainFront,
  TreePine,
  Trees,
  Trophy,
  Truck,
  Umbrella,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  Utensils,
  Video,
  Volleyball,
  Vote,
  Warehouse,
  Wheat,
  Wrench,
  Zap,
  CircleDot,
} from 'lucide-react';

/** Default keys when no icon is stored or name is unknown */
export const DEFAULT_NEWS_ICON = 'Newspaper';
export const DEFAULT_EVENT_ICON = 'Calendar';

export const NEWS_EVENT_ICON_NAMES = [
  'Calendar',
  'Newspaper',
  'Bell',
  'Megaphone',
  'PartyPopper',
  'Users',
  'Heart',
  'Home',
  'Building2',
  'MapPin',
  'Flag',
  'Trophy',
  'Gift',
  'Star',
  'Sparkles',
  'AlertCircle',
  'Info',
  'Shield',
  'Flame',
  'Zap',
  'Sun',
  'CloudRain',
  'Bus',
  'Car',
  'Baby',
  'School',
  'BookOpen',
  'Briefcase',
  'ClipboardList',
  'FileText',
  'Gavel',
  'Landmark',
  'Handshake',
  'Mic',
  'Music',
  'Camera',
  'Video',
  'Palmtree',
  'TreePine',
  'Trees',
  'Droplets',
  'Wheat',
  'Stethoscope',
  'Pill',
  'Dumbbell',
  'Church',
  'Hammer',
  'Wrench',
  'DollarSign',
  'Coins',
  'BadgeCheck',
  'Scale',
  'Flower2',
  'Vote',
  'ClipboardCheck',
  'Award',
  'Cake',
  'Coffee',
  'Utensils',
  'Tent',
  'Fish',
  'Siren',
  'HeartHandshake',
  'ShieldAlert',
  'Plane',
  'TrainFront',
  'Bike',
  'Dog',
  'Cat',
  'Bird',
  'Rainbow',
  'Snowflake',
  'Umbrella',
  'Recycle',
  'Leaf',
  'Sprout',
  'Truck',
  'Package',
  'ShoppingCart',
  'Store',
  'Hospital',
  'GraduationCap',
  'Microscope',
  'Lightbulb',
  'Rocket',
  'Target',
  'Medal',
  'Ribbon',
  'Crown',
  'Gem',
  'Paintbrush',
  'Palette',
  'Clapperboard',
  'Gamepad2',
  'Dices',
  'Volleyball',
  'CircleDot',
  'Activity',
  'HeartPulse',
  'Syringe',
  'Bandage',
  'ShieldCheck',
  'UserCheck',
  'UserPlus',
  'UsersRound',
  'HouseHeart',
  'Warehouse',
  'Factory',
  'Construction',
  'HardHat',
  'Anchor',
  'Compass',
  'Globe',
  'Map',
  'Navigation',
] as const;

export type NewsEventIconName = (typeof NEWS_EVENT_ICON_NAMES)[number];

const ICON_REGISTRY: Record<NewsEventIconName, LucideIcon> = {
  Calendar,
  Newspaper,
  Bell,
  Megaphone,
  PartyPopper,
  Users,
  Heart,
  Home,
  Building2,
  MapPin,
  Flag,
  Trophy,
  Gift,
  Star,
  Sparkles,
  AlertCircle,
  Info,
  Shield,
  Flame,
  Zap,
  Sun,
  CloudRain,
  Bus,
  Car,
  Baby,
  School,
  BookOpen,
  Briefcase,
  ClipboardList,
  FileText,
  Gavel,
  Landmark,
  Handshake,
  Mic,
  Music,
  Camera,
  Video,
  Palmtree,
  TreePine,
  Trees,
  Droplets,
  Wheat,
  Stethoscope,
  Pill,
  Dumbbell,
  Church,
  Hammer,
  Wrench,
  DollarSign,
  Coins,
  BadgeCheck,
  Scale,
  Flower2,
  Vote,
  ClipboardCheck,
  Award,
  Cake,
  Coffee,
  Utensils,
  Tent,
  Fish,
  Siren,
  HeartHandshake,
  ShieldAlert,
  Plane,
  TrainFront,
  Bike,
  Dog,
  Cat,
  Bird,
  Rainbow,
  Snowflake,
  Umbrella,
  Recycle,
  Leaf,
  Sprout,
  Truck,
  Package,
  ShoppingCart,
  Store,
  Hospital,
  GraduationCap,
  Microscope,
  Lightbulb,
  Rocket,
  Target,
  Medal,
  Ribbon,
  Crown,
  Gem,
  Paintbrush,
  Palette,
  Clapperboard,
  Gamepad2,
  Dices,
  Volleyball,
  CircleDot,
  Activity,
  HeartPulse,
  Syringe,
  Bandage,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UsersRound,
  HouseHeart,
  Warehouse,
  Factory,
  Construction,
  HardHat,
  Anchor,
  Compass,
  Globe,
  Map,
  Navigation,
};

function resolveIcon(name: string | null | undefined, fallback: LucideIcon): LucideIcon {
  if (!name || typeof name !== 'string') return fallback;
  const Cmp = ICON_REGISTRY[name as NewsEventIconName];
  return Cmp ?? fallback;
}

type Kind = 'news' | 'event';

export function LucideIconByName({
  name,
  kind,
  className,
}: {
  name?: string | null;
  kind: Kind;
  className?: string;
}) {
  const fallback = kind === 'event' ? Calendar : Newspaper;
  const Cmp = resolveIcon(name, fallback);
  return <Cmp className={className} />;
}

/** List cards (admin + resident): colored icon tile + glyph classes */
export const NEWS_EVENTS_LIST_STYLES = {
  eventIconBox:
    'w-12 h-12 rounded-lg flex items-center justify-center border border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 shadow-sm',
  eventIconGlyph: 'w-7 h-7 text-emerald-700',
  newsIconBox:
    'w-12 h-12 rounded-lg flex items-center justify-center border border-violet-200/90 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-100 shadow-sm',
  newsIconGlyph: 'w-7 h-7 text-violet-700',
} as const;

export function IconPickerGrid({
  value,
  onChange,
  label = 'Choose an icon',
}: {
  value: string;
  onChange: (name: string) => void;
  label?: string;
}) {
  const [query, setQuery] = useState('');

  const filteredNames = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!q) return [...NEWS_EVENT_ICON_NAMES];
    const haystack = (name: string) => {
      const spaced = name.replace(/([a-z\d])([A-Z])/g, '$1 $2').toLowerCase();
      return `${name.toLowerCase()} ${spaced}`;
    };
    return NEWS_EVENT_ICON_NAMES.filter((name) => {
      const h = haystack(name);
      return q.split(' ').every((word) => word.length === 0 || h.includes(word));
    });
  }, [query]);

  return (
    <div>
      <p className="block text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="relative mb-2">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons (e.g. heart, school, map)…"
          className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {filteredNames.length === 0 ? (
        <p className="text-sm text-gray-500 py-3 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50">
          No icons match &ldquo;{query.trim()}&rdquo;. Try another name.
        </p>
      ) : (
        <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50/80 grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1">
          {filteredNames.map((iconName) => {
            const selected = value === iconName;
            const Cmp = ICON_REGISTRY[iconName];
            return (
              <button
                key={iconName}
                type="button"
                title={iconName}
                onClick={() => onChange(iconName)}
                className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                  selected
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-1'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200'
                }`}
              >
                <Cmp className="w-5 h-5 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
      <p className="text-xs text-gray-500 mt-1.5">
        Selected: <span className="font-semibold text-gray-700">{value}</span>
        {query.trim() ? (
          <span className="text-gray-400"> · Showing {filteredNames.length}</span>
        ) : null}
      </p>
    </div>
  );
}
