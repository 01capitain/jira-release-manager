"use client";

import * as React from "react";
import {
  CalendarBody,
  CalendarDate,
  CalendarDatePagination,
  CalendarDatePicker,
  CalendarHeader,
  CalendarMonthPicker,
  CalendarProvider,
  CalendarYearPicker,
  type CalendarState,
  type Feature,
  useCalendarMonth,
  useCalendarYear,
} from "~/components/ui/shadcn-io/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";
import type { ReleaseCalendarEvent } from "~/shared/types/release-calendar";
import BuiltVersionCalendarEvent from "./built-version-calendar-event";

type ReleaseCalendarProps = {
  release: ReleaseVersionWithBuildsDto;
  events: ReleaseCalendarEvent[];
};

type CalendarFeature = Feature & { event: ReleaseCalendarEvent };

function useCalendarInitialization(date: Date) {
  const [, setMonth] = useCalendarMonth();
  const [, setYear] = useCalendarYear();

  React.useEffect(() => {
    setMonth(date.getMonth() as CalendarState["month"]);
    setYear(date.getFullYear());
  }, [date, setMonth, setYear]);
}

export default function ReleaseCalendar({
  release,
  events,
}: ReleaseCalendarProps) {
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const preferredDate = React.useMemo(() => {
    const parsed = new Date(release.createdAt);
    if (Number.isNaN(parsed.getTime())) return new Date();
    return parsed;
  }, [release.createdAt]);

  useCalendarInitialization(preferredDate);

  React.useEffect(() => {
    headingRef.current?.focus();
  }, [release.id]);

  const features = React.useMemo<CalendarFeature[]>(() => {
    return events.map((event, index) => ({
      id: `${event.builtVersionId}-${index}`,
      name: event.builtVersionName,
      startAt: new Date(event.timestamp),
      endAt: new Date(event.timestamp),
      status: {
        id: event.statusLabel ?? "createdAt",
        name: event.statusLabel ?? "Created",
        color: "hsl(var(--primary))",
      },
      event,
    }));
  }, [events]);

  const yearBounds = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const preferredYear = preferredDate.getFullYear();
    const start = Math.max(2000, Math.min(currentYear, preferredYear) - 1);
    const end = Math.max(currentYear, preferredYear) + 1;
    return { start, end };
  }, [preferredDate]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-neutral-600"
        >
          Release {release.name} calendar
        </CardTitle>
        <CardDescription>
          Built versions for release {release.name} plotted on their creation
          dates. Use the calendar controls to review previous months.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CalendarProvider className="w-full" startDay={1} visibleDays={5}>
          <CalendarDate className="flex flex-wrap items-center gap-3">
            <CalendarDatePicker className="flex flex-wrap gap-2">
              <CalendarMonthPicker />
              <CalendarYearPicker
                start={yearBounds.start}
                end={yearBounds.end}
              />
            </CalendarDatePicker>
            <CalendarDatePagination className="ml-auto" />
          </CalendarDate>
          <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <CalendarHeader className="border-b border-neutral-200 px-2 py-2 dark:border-neutral-800" />
            <CalendarBody features={features}>
              {({ feature }) => {
                const event = (feature as CalendarFeature).event;
                return (
                  <BuiltVersionCalendarEvent
                    name={event.builtVersionName}
                    statusLabel={event.statusLabel}
                    components={event.components}
                  />
                );
              }}
            </CalendarBody>
          </div>
        </CalendarProvider>
        {events.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            This release does not have any builds yet. New builds will appear on
            the calendar as they are created.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
