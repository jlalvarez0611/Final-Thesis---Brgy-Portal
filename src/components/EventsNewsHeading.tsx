import type { LucideIcon } from 'lucide-react';
import { Calendar, Newspaper, UserCheck, Building2, Clock, FileText, User } from 'lucide-react';

export type EventsNewsHeadingVariant =
  | 'events'
  | 'news'
  | 'officials'
  | 'facilities'
  | 'facilityApprovals'
  | 'transparency'
  | 'documents'
  | 'profile'
  | 'calendar';

function variantStyles(variant: EventsNewsHeadingVariant): {
  Icon: LucideIcon;
  titleClass: string;
  iconBoxClass: string;
} {
  switch (variant) {
    case 'events':
      return {
        Icon: Calendar,
        titleClass: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent',
        iconBoxClass: 'bg-gradient-to-br from-emerald-50 to-cyan-100 text-emerald-700',
      };
    case 'news':
      return {
        Icon: Newspaper,
        titleClass: 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent',
        iconBoxClass: 'bg-gradient-to-br from-violet-50 to-fuchsia-100 text-violet-700',
      };
    case 'officials':
      return {
        Icon: UserCheck,
        titleClass: 'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent',
        iconBoxClass: 'bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-700',
      };
    case 'facilities':
      return {
        Icon: Building2,
        titleClass: 'bg-gradient-to-r from-amber-600 via-orange-600 to-red-500 bg-clip-text text-transparent',
        iconBoxClass: 'bg-gradient-to-br from-amber-50 to-orange-100 text-orange-700',
      };
    case 'facilityApprovals':
      return {
        Icon: Clock,
        titleClass: 'bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 bg-clip-text text-transparent',
        iconBoxClass: 'bg-gradient-to-br from-yellow-50 to-amber-100 text-amber-800',
      };
    case 'transparency':
      return {
        Icon: FileText,
        titleClass: 'bg-gradient-to-r from-slate-700 via-slate-600 to-red-700 bg-clip-text text-transparent',
        iconBoxClass: 'bg-gradient-to-br from-slate-100 to-red-50 text-slate-800',
      };
    case 'documents':
      return {
        Icon: FileText,
        titleClass: 'bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent',
        iconBoxClass: 'bg-gradient-to-br from-amber-50 to-orange-100 text-orange-700',
      };
    case 'profile':
      return {
        Icon: User,
        titleClass: 'bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 bg-clip-text text-transparent',
        iconBoxClass: 'bg-gradient-to-br from-rose-50 to-pink-100 text-rose-700',
      };
    case 'calendar':
      return {
        Icon: Calendar,
        titleClass: 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent',
        iconBoxClass: 'bg-gradient-to-br from-sky-50 to-indigo-100 text-blue-700',
      };
  }
}

/**
 * Section header: icon left, title + subtitle beside it.
 * `centered`: admin style — icon beside title only (top row), both centered; subtitle centered below.
 * Default: stacked / flexible for resident dashboard (next to tabs).
 */
export function EventsNewsHeading({
  variant,
  title,
  subtitle,
  centered = false,
}: {
  variant: EventsNewsHeadingVariant;
  title: string;
  subtitle?: string;
  centered?: boolean;
}) {
  const { Icon, titleClass, iconBoxClass } = variantStyles(variant);

  const iconBox = (
    <div
      className={`shrink-0 flex items-center justify-center p-2 rounded-lg shadow-sm ring-1 ring-black/[0.06] ${iconBoxClass}`}
    >
      <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
    </div>
  );

  if (centered) {
    return (
      <div className="w-full flex flex-col items-center text-center px-2 min-w-0" role="group">
        <div className="flex items-center justify-center gap-2 sm:gap-3 min-w-0">
          {iconBox}
          <h2
            className={`text-lg sm:text-xl md:text-2xl font-bold tracking-tight leading-snug min-w-0 ${titleClass}`}
          >
            {title}
          </h2>
        </div>
        {subtitle ? (
          <p className="mt-2.5 w-full max-w-2xl text-sm sm:text-base font-medium text-slate-600 leading-relaxed">
            {subtitle}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 min-w-0 flex-1">
      {iconBox}
      <div className="min-w-0 flex-1 pt-0.5 text-left">
        <h2 className={`text-xl sm:text-2xl font-bold tracking-tight leading-snug ${titleClass}`}>{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs sm:text-sm text-slate-600 font-medium leading-snug line-clamp-2">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
