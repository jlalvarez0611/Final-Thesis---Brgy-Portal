import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle, Newspaper } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'event' | 'news';
}

interface DayActivityIndicator {
  date: string;
  hasEvent: boolean;
  hasNews: boolean;
  events: CalendarEvent[];
}

interface ResidentCalendarProps {
  events: Array<{ id: string; title: string; event_date: string }>;
  news: Array<{ id: string; title: string; created_at: string }>;
  onDateSelected?: (date: string) => void;
  selectedDate?: string;
  /** Hide large duplicate title when wrapped in portal section header */
  compactChrome?: boolean;
}

export function ResidentCalendar({
  events,
  news,
  onDateSelected,
  selectedDate,
  compactChrome = false,
}: ResidentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Build activity map for the month
  const activityMap = useMemo(() => {
    const map = new Map<string, DayActivityIndicator>();

    // Add events
    events.forEach((event) => {
      const d = new Date(event.event_date);
      if (Number.isNaN(d.getTime())) return;
      const dateStr = d.toISOString().split('T')[0];
      if (!map.has(dateStr)) {
        map.set(dateStr, {
          date: dateStr,
          hasEvent: false,
          hasNews: false,
          events: [],
        });
      }
      const indicator = map.get(dateStr)!;
      indicator.hasEvent = true;
      indicator.events.push({
        id: event.id,
        title: event.title,
        date: dateStr,
        type: 'event',
      });
    });

    // Add news
    news.forEach((newsItem) => {
      const d = new Date(newsItem.created_at);
      if (Number.isNaN(d.getTime())) return;
      const dateStr = d.toISOString().split('T')[0];
      if (!map.has(dateStr)) {
        map.set(dateStr, {
          date: dateStr,
          hasEvent: false,
          hasNews: false,
          events: [],
        });
      }
      const indicator = map.get(dateStr)!;
      indicator.hasNews = true;
      indicator.events.push({
        id: newsItem.id,
        title: newsItem.title,
        date: dateStr,
        type: 'news',
      });
    });

    return map;
  }, [events, news]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const handleDateClick = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    onDateSelected?.(dateStr);
  };

  const monthName = currentMonth.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = [];

  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number | null) => {
    if (!day || !selectedDate) return false;
    const selected = new Date(selectedDate);
    return (
      day === selected.getDate() &&
      currentMonth.getMonth() === selected.getMonth() &&
      currentMonth.getFullYear() === selected.getFullYear()
    );
  };

  const getDateStr = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const getDayActivity = (day: number | null) => {
    if (!day) return null;
    const dateStr = getDateStr(day);
    return activityMap.get(dateStr) || null;
  };

  const shellClass = compactChrome
    ? 'bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm'
    : 'bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-8 border border-gray-200';

  return (
    <div className={`${shellClass} touch-pan-y overscroll-contain`}>
      <div className={`flex items-center justify-between ${compactChrome ? 'mb-5' : 'mb-8'}`}>
        {compactChrome ? (
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">{monthName}</h3>
        ) : (
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarIcon className="w-7 h-7 text-blue-600" />
            </div>
            {monthName}
          </h2>
        )}
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrevMonth}
            className={
              compactChrome
                ? 'p-2.5 rounded-lg transition-all text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                : 'p-3 hover:bg-blue-100 rounded-lg transition-all transform hover:scale-110 text-gray-600 hover:text-blue-600'
            }
            aria-label="Previous month"
          >
            <ChevronLeft className={compactChrome ? 'w-5 h-5' : 'w-6 h-6'} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className={
              compactChrome
                ? 'p-2.5 rounded-lg transition-all text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                : 'p-3 hover:bg-blue-100 rounded-lg transition-all transform hover:scale-110 text-gray-600 hover:text-blue-600'
            }
            aria-label="Next month"
          >
            <ChevronRight className={compactChrome ? 'w-5 h-5' : 'w-6 h-6'} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 touch-pan-y">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-yellow-300 rounded-full shadow"></div>
          <span className="text-sm font-semibold text-gray-700">Event</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-orange-300 rounded-full shadow"></div>
          <span className="text-sm font-semibold text-gray-700">News</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-semibold text-gray-700">Today</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md font-semibold">Selected</div>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2 touch-pan-y select-none">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center font-semibold text-gray-600 text-sm py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 p-2 sm:p-4 rounded-xl touch-pan-y overscroll-contain">
        {days.map((day, index) => {
          const activity = day ? getDayActivity(day) : null;
          const hasActivity = activity && (activity.hasEvent || activity.hasNews);
          const isTodayClass = isToday(day);
          const isSelectedClass = isSelected(day);

          return (
            <button
              key={index}
              onClick={() => day && handleDateClick(day)}
              disabled={!day}
              className={`
                relative aspect-square p-1.5 sm:p-2 rounded-lg text-[13px] sm:text-sm font-bold transition-all transform select-none touch-manipulation
                ${!day ? 'bg-transparent' : ''}
                ${isSelectedClass
                  ? 'bg-blue-600 text-white border-2 border-blue-700 shadow-lg scale-105'
                  : isTodayClass
                  ? 'bg-blue-100 text-blue-900 border-2 border-blue-500 shadow-md'
                  : hasActivity
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border-2 border-purple-700 shadow-lg hover:shadow-xl hover:scale-105'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:shadow-md'
                }
                ${day ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              {day && (
                <>
                  <div className="text-center text-sm sm:text-base mb-0.5 sm:mb-1">{day}</div>
                  {hasActivity && (
                    <div className="flex justify-center gap-1.5">
                      {activity.hasEvent && (
                        <div
                          className="w-2.5 h-2.5 bg-yellow-300 rounded-full shadow-sm"
                          title="Has event"
                        ></div>
                      )}
                      {activity.hasNews && (
                        <div
                          className="w-2.5 h-2.5 bg-orange-300 rounded-full shadow-sm"
                          title="Has news"
                        ></div>
                      )}
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date details */}
      {selectedDate && activityMap.get(selectedDate) && (
        <div className="mt-8 pt-8 border-t-2 border-gray-200">
          <h3 className="font-bold text-xl text-gray-800 mb-5 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            Activities on {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </h3>
          <div className="space-y-3">
            {activityMap.get(selectedDate)?.events.map((event) => (
              <div
                key={event.id}
                className={`p-4 rounded-xl flex items-start gap-3 transition-all transform hover:scale-102 ${
                  event.type === 'event'
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 shadow-md'
                    : 'bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 shadow-md'
                }`}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  event.type === 'event'
                    ? 'bg-yellow-200'
                    : 'bg-orange-200'
                }`}>
                  {event.type === 'event' ? (
                    <AlertCircle className="w-5 h-5 text-yellow-700" />
                  ) : (
                    <Newspaper className="w-5 h-5 text-orange-700" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{event.title}</p>
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mt-1 capitalize">{event.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
